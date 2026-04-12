BEGIN;

-- ------------------------------------------------------------
-- 1. CREATE gesture_image
-- ------------------------------------------------------------
CREATE TABLE public.gesture_image (
  id             uuid                     NOT NULL DEFAULT gen_random_uuid(),
  owner_id       uuid                     NOT NULL,
  org_id         uuid                     NOT NULL,
  storage_path   text                     NOT NULL UNIQUE,
  category       text                     NOT NULL DEFAULT 'uncategorized',
  is_public      boolean                  NOT NULL DEFAULT false,
  created_at     timestamp with time zone NOT NULL DEFAULT now(),
  updated_at     timestamp with time zone NOT NULL DEFAULT now(),

  CONSTRAINT gesture_image_pkey          PRIMARY KEY (id),
  CONSTRAINT gesture_image_owner_auth_fk FOREIGN KEY (owner_id) REFERENCES auth.users(id),
  CONSTRAINT gesture_image_owner_user_fk FOREIGN KEY (owner_id) REFERENCES public.user(id),
  CONSTRAINT gesture_image_org_fk        FOREIGN KEY (org_id)   REFERENCES public.organization(id)
);

-- ------------------------------------------------------------
-- 2. CREATE cropped_image
-- ------------------------------------------------------------
CREATE TABLE public.cropped_image (
  id              uuid                     NOT NULL DEFAULT gen_random_uuid(),
  owner_id        uuid                     NOT NULL,
  org_id          uuid                     NOT NULL,
  storage_path    text                     NOT NULL UNIQUE,
  left_eye_point  point,
  right_eye_point point,
  chin_point      point,
  left_jaw_point  point,
  right_jaw_point point,
  centroid_point  point,
  is_public       boolean                  NOT NULL DEFAULT false,
  created_at      timestamp with time zone NOT NULL DEFAULT now(),
  updated_at      timestamp with time zone NOT NULL DEFAULT now(),

  CONSTRAINT cropped_image_pkey          PRIMARY KEY (id),
  CONSTRAINT cropped_image_owner_auth_fk FOREIGN KEY (owner_id) REFERENCES auth.users(id),
  CONSTRAINT cropped_image_owner_user_fk FOREIGN KEY (owner_id) REFERENCES public.user(id),
  CONSTRAINT cropped_image_org_fk        FOREIGN KEY (org_id)   REFERENCES public.organization(id)
);

-- ------------------------------------------------------------
-- 3. RLS
-- ------------------------------------------------------------
ALTER TABLE public.gesture_image ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cropped_image  ENABLE ROW LEVEL SECURITY;

CREATE POLICY gesture_image_owner_all ON public.gesture_image
  FOR ALL USING (owner_id = auth.uid());

CREATE POLICY cropped_image_owner_all ON public.cropped_image
  FOR ALL USING (owner_id = auth.uid());

CREATE POLICY gesture_image_public_read ON public.gesture_image
  FOR SELECT USING (is_public = true);

CREATE POLICY cropped_image_public_read ON public.cropped_image
  FOR SELECT USING (is_public = true);

-- ------------------------------------------------------------
-- 4. GRANTS
-- ------------------------------------------------------------
GRANT SELECT, INSERT, UPDATE, DELETE ON public.gesture_image TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cropped_image  TO authenticated;

GRANT ALL ON public.gesture_image TO service_role;
GRANT ALL ON public.cropped_image  TO service_role;

COMMIT;