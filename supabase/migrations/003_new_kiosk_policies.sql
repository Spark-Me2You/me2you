-- for org table
CREATE POLICY "Kiosk can view their organization"
ON organization FOR SELECT
TO authenticated
USING (
  (auth.jwt() -> 'app_metadata' ->> 'is_kiosk')::boolean = true
  AND id = (auth.jwt() -> 'app_metadata' ->> 'org_id')::uuid
);

-- for users table
CREATE POLICY "Kiosk can view users in their org"
ON "user" FOR SELECT
TO authenticated
USING (
  (auth.jwt() -> 'app_metadata' ->> 'is_kiosk')::boolean = true
  AND org_id = (auth.jwt() -> 'app_metadata' ->> 'org_id')::uuid
);

CREATE POLICY "Kiosk can create users in their org"
ON "user" FOR INSERT
TO authenticated
WITH CHECK (
  (auth.jwt() -> 'app_metadata' ->> 'is_kiosk')::boolean = true
  AND org_id = (auth.jwt() -> 'app_metadata' ->> 'org_id')::uuid
);

-- for image table
CREATE POLICY "Kiosk can view images in their org"
ON image FOR SELECT
TO authenticated
USING (
  (auth.jwt() -> 'app_metadata' ->> 'is_kiosk')::boolean = true
  AND org_id = (auth.jwt() -> 'app_metadata' ->> 'org_id')::uuid
);


-- for kiosk table
CREATE POLICY "Admins can view kiosks in their org"
ON kiosk FOR SELECT
TO authenticated
USING (
  org_id IN (
    SELECT org_id FROM admin WHERE id = auth.uid()
  )
);

CREATE POLICY "Admins can create kiosks in their org"
ON kiosk FOR INSERT
TO authenticated
WITH CHECK (
  org_id IN (
    SELECT org_id FROM admin WHERE id = auth.uid()
  )
);

CREATE POLICY "Admins can update kiosks in their org"
ON kiosk FOR UPDATE
TO authenticated
USING (
  org_id IN (
    SELECT org_id FROM admin WHERE id = auth.uid()
  )
)
WITH CHECK (
  org_id IN (
    SELECT org_id FROM admin WHERE id = auth.uid()
  )
);

CREATE POLICY "Admins can delete kiosks in their org"
ON kiosk FOR DELETE
TO authenticated
USING (
  org_id IN (
    SELECT org_id FROM admin WHERE id = auth.uid()
  )
);