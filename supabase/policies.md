# BUCKET POLICIES

-- Users can upload their own images
CREATE POLICY "Users can upload own images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
bucket_id = 'images'
AND (storage.foldername(name))[1] IN (
SELECT org_id::text FROM "user" WHERE id = auth.uid()
)
AND (storage.foldername(name))[2] = auth.uid()::text
);

-- Users can view their own images
CREATE POLICY "Users can view own images"
ON storage.objects FOR SELECT
TO authenticated
USING (
bucket_id = 'images'
AND (storage.foldername(name))[1] IN (
SELECT org_id::text FROM "user" WHERE id = auth.uid()
)
AND (storage.foldername(name))[2] = auth.uid()::text
);

-- Users can delete their own images
CREATE POLICY "Users can delete own images"
ON storage.objects FOR DELETE
TO authenticated
USING (
bucket_id = 'images'
AND (storage.foldername(name))[1] IN (
SELECT org_id::text FROM "user" WHERE id = auth.uid()
)
AND (storage.foldername(name))[2] = auth.uid()::text
);

-- Users can view public images in their org
CREATE POLICY "Users can view public org images"
ON storage.objects FOR SELECT
TO authenticated
USING (
bucket_id = 'images'
AND (storage.foldername(name))[1] IN (
SELECT org_id::text FROM "user" WHERE id = auth.uid()
)
);

-- Admins can view all images in their org
CREATE POLICY "Admins can view org images"
ON storage.objects FOR SELECT
TO authenticated
USING (
bucket_id = 'images'
AND (storage.foldername(name))[1] IN (
SELECT org_id::text FROM admin WHERE id = auth.uid()
)
);

CREATE POLICY "Kiosk can view images in their org"
ON storage.objects FOR SELECT
TO authenticated
USING (
bucket_id = 'images'
AND (storage.foldername(name))[1] = (auth.jwt() -> 'app_metadata' ->> 'org_id')::text
AND (auth.jwt() -> 'app_metadata' ->> 'is_kiosk')::boolean = true
);
