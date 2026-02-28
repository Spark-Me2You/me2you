# MediaPipe Models

This directory should contain the MediaPipe model files for pose detection and face mesh.

## Required Models

1. **pose_landmarker.task** - MediaPipe Pose Landmarker model
   - Download from: https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_heavy/float16/latest/pose_landmarker_heavy.task
   - Size: ~25MB

2. **face_mesh.task** - MediaPipe Face Mesh model
   - Download from: https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/latest/face_landmarker.task
   - Size: ~10MB

## Installation

```bash
# Download pose landmarker
curl -o public/models/pose_landmarker.task https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_heavy/float16/latest/pose_landmarker_heavy.task

# Download face mesh
curl -o public/models/face_mesh.task https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/latest/face_landmarker.task
```

## Notes

- These models are NOT included in git due to their size
- Make sure to download them before running the application
- The application will not work without these models
