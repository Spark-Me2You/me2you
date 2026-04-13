# MediaPipe Models

All MediaPipe models are loaded from Google Cloud Storage CDN by default. This directory is only needed for **offline development**.

## Models Used in Production

All models are fetched from `https://storage.googleapis.com/mediapipe-models/`:

1. **Pose Landmarker** (pose_landmarker_lite.task)
   - URL: https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/latest/pose_landmarker_lite.task
   - Size: ~12MB
   - Used for: Body pose detection and tracking

2. **Face Landmarker** (face_landmarker.task)
   - URL: https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/latest/face_landmarker.task
   - Size: ~10MB
   - Used for: 468-point facial landmark detection

3. **Gesture Recognizer** (gesture_recognizer.task)
   - URL: https://storage.googleapis.com/mediapipe-models/gesture_recognizer/gesture_recognizer/float16/latest/gesture_recognizer.task
   - Size: ~8MB
   - Used for: Hand gesture recognition

4. **Image Segmenter - Selfie Multiclass** (selfie_multiclass_256x256.tflite)
   - URL: https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_multiclass_256x256/float32/latest/selfie_multiclass_256x256.tflite
   - Size: ~16MB
   - Used for: Face and hair segmentation (profile photo cropping)

## Offline Development (Optional)

For offline development without internet access, you can download models locally:

```bash
# Option 1: Use the download script (recommended)
npm run download-models

# Option 2: Manual download
mkdir -p public/models

# Download Image Segmenter (selfie multiclass)
curl -o public/models/selfie_multiclass_256x256.tflite \
  https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_multiclass_256x256/float32/latest/selfie_multiclass_256x256.tflite
```

Then update `.env.local` to use local models (if you implement this feature):
```env
VITE_USE_LOCAL_MODELS=true
```

## Notes

- **Production**: All models load from Google CDN (no local files needed)
- **Git**: This directory is git-ignored due to model file sizes
- **CDN Benefits**: Faster global access, browser caching, reduced build size
- **Build Size**: Using CDN reduces Netlify build from 28MB to ~12MB
