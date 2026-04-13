-- Migration: Add additional landmark columns to cropped_image table
-- Combines existing DB fields with faceCropService output fields
--
-- Existing columns (from 009):
--   - left_eye_point
--   - right_eye_point
--   - chin_point (legacy)
--   - left_jaw_point (legacy)
--   - right_jaw_point (legacy)
--   - centroid_point
--
-- New columns (added here):
--   - nose_tip_point
--   - mouth_center_point
--   - chin_bottom_point
--   - forehead_top_point
--
-- Mapping to FaceLandmarks interface:
--   left_eye_point      ← FaceLandmarks.leftEye
--   right_eye_point     ← FaceLandmarks.rightEye
--   centroid_point      ← FaceLandmarks.faceCenter
--   nose_tip_point      ← FaceLandmarks.noseTip
--   mouth_center_point  ← FaceLandmarks.mouthCenter
--   chin_bottom_point   ← FaceLandmarks.chinBottom
--   forehead_top_point  ← FaceLandmarks.foreheadTop
--   (chin_point, left_jaw_point, right_jaw_point remain for backward compatibility)

ALTER TABLE public.cropped_image
ADD COLUMN IF NOT EXISTS nose_tip_point point,
ADD COLUMN IF NOT EXISTS mouth_center_point point,
ADD COLUMN IF NOT EXISTS chin_bottom_point point,
ADD COLUMN IF NOT EXISTS forehead_top_point point;
