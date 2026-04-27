-- ============================================================
-- 022: accessories table — per-user accessory selection and
--      manual placement (x/y delta + scale).
--
-- One row per user (upsert model). App reads/writes go here
-- exclusively; user.accessory remains in the schema but is
-- no longer updated by the app.
-- ============================================================

BEGIN;

-- ---- 1. Create table ----------------------------------------

CREATE TABLE public.accessories (
  user_id    uuid        PRIMARY KEY REFERENCES "user"(id) ON DELETE CASCADE,
  org_id     uuid        NOT NULL    REFERENCES organization(id) ON DELETE CASCADE,

  -- Which accessory is equipped (null = none)
  selected_accessory text CHECK (selected_accessory IN ('sunglasses', 'hat', 'balloon')),

  -- Manual placement offsets, expressed as percentage-point deltas
  -- of the 220×220 mii-preview container.  Positive x = right,
  -- positive y = down.
  relative_x numeric NOT NULL DEFAULT 0 CHECK (relative_x BETWEEN -40 AND 40),
  relative_y numeric NOT NULL DEFAULT 0 CHECK (relative_y BETWEEN -40 AND 40),

  -- Width scale multiplier applied on top of the baseline tuning.
  scale      numeric NOT NULL DEFAULT 1 CHECK (scale BETWEEN 0.5 AND 2.0),

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_accessories_org_id ON public.accessories (org_id);

-- ---- 2. Backfill from user.accessory -------------------------

INSERT INTO public.accessories (user_id, org_id, selected_accessory)
SELECT
  u.id,
  u.org_id,
  u.accessory
FROM "user" u
WHERE u.org_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.accessories a WHERE a.user_id = u.id
  )
ON CONFLICT (user_id) DO NOTHING;

-- ---- 3. updated_at trigger -----------------------------------

CREATE OR REPLACE FUNCTION public.set_accessories_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_accessories_updated_at
  BEFORE UPDATE ON public.accessories
  FOR EACH ROW EXECUTE FUNCTION public.set_accessories_updated_at();

-- ---- 4. Row-level security ----------------------------------

ALTER TABLE public.accessories ENABLE ROW LEVEL SECURITY;

-- Users: read/write own row
CREATE POLICY "Users can read own accessory settings"
ON public.accessories FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can insert own accessory settings"
ON public.accessories FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND org_id = public.get_user_org_id()
);

CREATE POLICY "Users can update own accessory settings"
ON public.accessories FOR UPDATE
TO authenticated
USING  (user_id = auth.uid())
WITH CHECK (
  user_id = auth.uid()
  AND org_id = public.get_user_org_id()
);

CREATE POLICY "Users can delete own accessory settings"
ON public.accessories FOR DELETE
TO authenticated
USING (user_id = auth.uid());

-- Kiosks: read all rows in their org
CREATE POLICY "Kiosks can read accessory settings in their org"
ON public.accessories FOR SELECT
TO authenticated
USING (
  (auth.jwt() -> 'app_metadata' ->> 'is_kiosk')::boolean = true
  AND org_id = (auth.jwt() -> 'app_metadata' ->> 'org_id')::uuid
);

-- Admins: read all rows in their org
CREATE POLICY "Admins can read accessory settings in their org"
ON public.accessories FOR SELECT
TO authenticated
USING (
  org_id IN (
    SELECT org_id FROM admin WHERE id = auth.uid()
  )
);

COMMIT;
