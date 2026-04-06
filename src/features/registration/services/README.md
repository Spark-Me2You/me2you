# Registration Services

This directory contains services for the user registration flow, including photo capture, face detection, and profile creation.

## Face Crop Service

`faceCropService.ts` provides client-side face detection and cropping using MediaPipe FaceDetector.

### Features

- **Automatic face detection** using MediaPipe BlazeFace Short Range model
- **Smart cropping** with 25% padding around detected face
- **GPU acceleration** when available
- **Lazy loading** - model loads on first use
- **Error handling** - throws `FaceNotDetectedError` when no face found

### Usage

#### Basic Usage

```typescript
import { faceCropService, FaceNotDetectedError } from './services/faceCropService';

// Initialize (optional - happens automatically on first use)
await faceCropService.initialize();

// Crop a photo
try {
  const result = await faceCropService.cropFace(photoBlob);
  console.log('Cropped photo:', result.croppedBlob);
  console.log('Metadata:', result.cropMetadata);
} catch (error) {
  if (error instanceof FaceNotDetectedError) {
    console.log('No face detected - please retake');
  } else {
    console.error('Processing error:', error);
  }
}

// Cleanup (call on unmount)
faceCropService.dispose();
```

#### With React Hook

```typescript
import { useFaceCrop } from '../hooks/useFaceCrop';

function PhotoCapture() {
  const { isInitializing, isProcessing, error, cropPhoto } = useFaceCrop();

  const handleCapture = async (blob: Blob) => {
    try {
      const result = await cropPhoto(blob);
      setCroppedPhoto(result.croppedBlob);
    } catch (error) {
      if (error instanceof FaceNotDetectedError) {
        setError('No face detected - center your face and try again');
      }
    }
  };

  if (isInitializing) return <div>Loading face detector...</div>;

  return (
    <button onClick={() => captureFromCamera(handleCapture)} disabled={isProcessing}>
      Capture
    </button>
  );
}
```

### API Reference

#### `faceCropService.initialize(): Promise<void>`

Initialize the face detector (loads MediaPipe model). Safe to call multiple times.

#### `faceCropService.isReady(): boolean`

Check if the face detector is ready.

#### `faceCropService.cropFace(imageBlob, options?): Promise<CropResult>`

Detect face and crop image.

**Parameters:**
- `imageBlob: Blob` - Input image blob
- `options?: CropOptions` - Optional configuration
  - `outputSize?: number` - Output dimensions (default: 400)
  - `padding?: number` - Padding around face (default: 0.25 = 25%)
  - `quality?: number` - JPEG quality (default: 0.85 = 85%)

**Returns:** `Promise<CropResult>`
- `originalBlob: Blob` - Original input blob
- `croppedBlob: Blob` - Cropped image blob (400x400 JPEG)
- `cropMetadata: CropMetadata` - Detection and processing metadata

**Throws:**
- `FaceNotDetectedError` - No face detected in image
- `Error` - Other processing errors

#### `faceCropService.dispose(): void`

Dispose of the face detector instance to free GPU memory. Call on component unmount.

### Types

```typescript
interface CropResult {
  originalBlob: Blob;
  croppedBlob: Blob;
  cropMetadata: CropMetadata;
}

interface CropMetadata {
  faceDetected: boolean;
  boundingBox: FaceBoundingBox | null;
  confidence: number;
  outputSize: { width: number; height: number };
  padding: number;
  processingTimeMs: number;
}

interface FaceBoundingBox {
  x: number;      // Normalized 0-1
  y: number;      // Normalized 0-1
  width: number;  // Normalized 0-1
  height: number; // Normalized 0-1
}

class FaceNotDetectedError extends Error {}
```

### Crop Specifications

- **Model:** MediaPipe BlazeFace Short Range (~2MB)
- **Output Size:** 400x400 pixels
- **Padding:** 25% around face bounding box
- **Format:** JPEG quality 85%
- **Processing Time:** ~35-80ms (GPU accelerated)
- **Confidence Threshold:** 0.5 (50%)

### Error Handling

The service throws two types of errors:

1. **FaceNotDetectedError** - User-facing, prompt for retake
   ```typescript
   catch (error) {
     if (error instanceof FaceNotDetectedError) {
       showRetakePrompt('Center your face and try again');
     }
   }
   ```

2. **Generic Error** - System error, show generic message
   ```typescript
   catch (error) {
     if (!(error instanceof FaceNotDetectedError)) {
       showError('Photo processing failed - please try again');
     }
   }
   ```

### Performance

- **Model Loading:** ~500-1000ms (one-time, on first use)
- **Face Detection:** ~20-50ms (GPU)
- **Cropping:** ~10-20ms (canvas operations)
- **Total:** ~35-80ms per photo

The model is cached after first load, so subsequent detections are fast.

### Testing

See `src/features/dev/FaceCropTestPage.tsx` for a visual test page at `/dev/face-crop` (dev mode only).

## Registration Service

`registrationService.ts` orchestrates the complete registration flow including photo upload.

### Dual Photo Upload

The service now supports uploading both original and cropped photos:

```typescript
import { registrationService } from './services/registrationService';

const result = await registrationService.uploadPhotosAndCreateRecord(
  originalBlob,
  croppedBlob,
  userId,
  gestureCategory
);

console.log('Original path:', result.storage_path);
console.log('Cropped path:', result.cropped_path);
```

The image database record is updated with both paths immediately (no async edge function needed).

## Smart Crop Service

`smartCropService.ts` provides backward compatibility for triggering the server-side edge function (if needed as fallback).

This is now primarily used for legacy images or as a backup if client-side cropping fails.
