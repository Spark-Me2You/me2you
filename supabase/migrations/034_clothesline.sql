-- ============================================================
-- 034: clothesline — clothing cutouts captured at the kiosk photo
--      booth, hung on an org-wide line, claimable by QR and
--      wearable on a mii.
--
-- Images hold clothing pixels only: face, hair and skin are removed
-- in the browser before upload (src/features/clothesline/cv).
--
-- Lifecycle:
--   kiosk INSERT  -> owner_id null, expires_at = now() + 24h
--   claim-garment -> owner_id = user, expires_at = null (service role)
--   owner DELETE  -> row + file gone; accessories.equipped_garment_id
--                    falls back to null via the FK
--
-- Unclaimed rows stop being readable once expired. Their rows and
-- files are not swept here; see docs/CLOTHESLINE.md ("Follow-ups").
-- ============================================================

BEGIN;

-- ---- 1. garments table --------------------------------------

CREATE TABLE public.garments (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id     uuid        NOT NULL REFERENCES organization(id) ON DELETE CASCADE,
  -- Null until claimed by QR.
  owner_id   uuid        REFERENCES "user"(id) ON DELETE CASCADE,
  kind       text        NOT NULL CHECK (kind IN ('top', 'bottom')),
  -- Path in the private `garments` bucket: <org_id>/<id>.png
  image_path text        NOT NULL UNIQUE,
  width      integer     NOT NULL CHECK (width  BETWEEN 1 AND 1024),
  height     integer     NOT NULL CHECK (height BETWEEN 1 AND 1024),
  created_at timestamptz NOT NULL DEFAULT now(),
  -- When an unclaimed garment comes off the line; null once claimed.
  expires_at timestamptz DEFAULT (now() + interval '24 hours'),
  CONSTRAINT garments_claimed_or_expiring
    CHECK (owner_id IS NULL OR expires_at IS NULL)
);

CREATE INDEX idx_garments_org_line ON public.garments (org_id, created_at DESC);
CREATE INDEX idx_garments_owner_id ON public.garments (owner_id);

ALTER TABLE public.garments ENABLE ROW LEVEL SECURITY;

-- Org members see the line: every claimed garment, and unclaimed ones
-- until they expire.
CREATE POLICY "Org members can read garments on the line"
ON public.garments FOR SELECT
TO authenticated
USING (
  org_id = public.get_user_org_id()
  AND (owner_id IS NOT NULL OR expires_at > now())
);

CREATE POLICY "Kiosks can read garments in their org"
ON public.garments FOR SELECT
TO authenticated
USING (
  coalesce((auth.jwt() -> 'app_metadata' ->> 'is_kiosk')::boolean, false) = true
  AND org_id = nullif(auth.jwt() -> 'app_metadata' ->> 'org_id', '')::uuid
  AND (owner_id IS NOT NULL OR expires_at > now())
);

-- Kiosks hang anonymous garments for their own org, and can't choose
-- an owner or a longer lifetime.
CREATE POLICY "Kiosks can hang garments in their org"
ON public.garments FOR INSERT
TO authenticated
WITH CHECK (
  coalesce((auth.jwt() -> 'app_metadata' ->> 'is_kiosk')::boolean, false) = true
  AND org_id = nullif(auth.jwt() -> 'app_metadata' ->> 'org_id', '')::uuid
  AND owner_id IS NULL
  AND expires_at IS NOT NULL
  AND expires_at <= now() + interval '24 hours'
  AND image_path = org_id::text || '/' || id::text || '.png'
);

-- No UPDATE policy: claiming runs in the claim-garment edge function
-- with the service role.

CREATE POLICY "Owners can delete their garments"
ON public.garments FOR DELETE
TO authenticated
USING (owner_id = auth.uid());

-- Moderation: admins can take anything off their org's line.
CREATE POLICY "Admins can delete garments in their org"
ON public.garments FOR DELETE
TO authenticated
USING (
  org_id IN (SELECT a.org_id FROM public.admin a WHERE a.id = auth.uid())
);

-- ---- 2. Equipped garment on the accessories row --------------

ALTER TABLE public.accessories
  ADD COLUMN equipped_garment_id uuid
    REFERENCES public.garments(id) ON DELETE SET NULL;

-- A mii can only wear a top its own user has claimed. SECURITY DEFINER
-- so the check sees the garment whatever the caller's RLS allows.
CREATE OR REPLACE FUNCTION public.check_equipped_garment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.equipped_garment_id IS NULL THEN
    RETURN NEW;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.garments g
    WHERE g.id = NEW.equipped_garment_id
      AND g.owner_id = NEW.user_id
      AND g.kind = 'top'
  ) THEN
    RAISE EXCEPTION 'equipped garment must be a top owned by the user';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_accessories_check_equipped_garment
  BEFORE INSERT OR UPDATE OF equipped_garment_id ON public.accessories
  FOR EACH ROW EXECUTE FUNCTION public.check_equipped_garment();

-- ---- 3. Storage: private `garments` bucket -------------------

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  VALUES ('garments', 'garments', false, 1048576, ARRAY['image/png'])
  ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "kiosk_can_upload_garments" ON storage.objects;
DROP POLICY IF EXISTS "authenticated_can_read_garments" ON storage.objects;
DROP POLICY IF EXISTS "owners_can_delete_garment_files" ON storage.objects;

-- Kiosk uploads only, into its own org folder.
CREATE POLICY "kiosk_can_upload_garments"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'garments'
    AND coalesce((auth.jwt() -> 'app_metadata' ->> 'is_kiosk')::boolean, false) = true
    AND (storage.foldername(name))[1] = nullif(auth.jwt() -> 'app_metadata' ->> 'org_id', '')
  );

-- Same convention as `drawings`: a signed URL needs a path, and paths
-- only come from the org-scoped garments table.
CREATE POLICY "authenticated_can_read_garments"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'garments');

-- Files live under the org folder, so ownership comes from the row.
-- Clients delete the file first, then the row.
CREATE POLICY "owners_can_delete_garment_files"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'garments'
    AND EXISTS (
      SELECT 1 FROM public.garments g
      WHERE g.image_path = name
        AND g.owner_id = auth.uid()
    )
  );

COMMIT;
