/**
 * Face Crop Test Page
 * Visual test page for manual QA of face cropping functionality
 * Available at /dev/face-crop in development mode only
 */

import React, { useState, useRef, useCallback } from 'react';
import { useFaceCrop } from '../registration/hooks/useFaceCrop';
import { FaceNotDetectedError, type CropResult } from '../registration/services/faceCropService';

export const FaceCropTestPage: React.FC = () => {
  const [originalUrl, setOriginalUrl] = useState<string | null>(null);
  const [croppedUrl, setCroppedUrl] = useState<string | null>(null);
  const [cropResult, setCropResult] = useState<CropResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { isInitializing, isProcessing, cropPhoto } = useFaceCrop();

  /**
   * Process an image (from upload or camera)
   */
  const processImage = useCallback(
    async (blob: Blob) => {
      setError(null);
      setCropResult(null);

      try {
        const result = await cropPhoto(blob);
        setCropResult(result);

        // Create preview URLs
        if (originalUrl) URL.revokeObjectURL(originalUrl);
        if (croppedUrl) URL.revokeObjectURL(croppedUrl);
        setOriginalUrl(URL.createObjectURL(result.originalBlob));
        setCroppedUrl(URL.createObjectURL(result.croppedBlob));
      } catch (err) {
        if (err instanceof FaceNotDetectedError) {
          setError('No face detected - please center your face and try again');
        } else {
          setError(err instanceof Error ? err.message : 'Processing failed');
        }
      }
    },
    [cropPhoto, originalUrl, croppedUrl]
  );

  /**
   * Handle file upload
   */
  const handleFileUpload = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      await processImage(file);
    },
    [processImage]
  );

  /**
   * Start camera
   */
  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      setCameraStream(stream);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to access camera');
    }
  }, []);

  /**
   * Stop camera
   */
  const stopCamera = useCallback(() => {
    if (cameraStream) {
      cameraStream.getTracks().forEach((track) => track.stop());
      setCameraStream(null);
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    }
  }, [cameraStream]);

  /**
   * Capture photo from camera
   */
  const captureFromCamera = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      setError('Failed to get canvas context');
      return;
    }

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob(async (blob) => {
      if (blob) {
        await processImage(blob);
      } else {
        setError('Failed to capture photo');
      }
    }, 'image/jpeg', 0.9);
  }, [processImage]);

  /**
   * Draw head bounds and landmarks on original image
   */
  const drawAnnotations = useCallback((canvas: HTMLCanvasElement, imageUrl: string) => {
    if (!cropResult) return;

    const img = new Image();
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.drawImage(img, 0, 0);

      // Draw head bounds (green rectangle)
      if (cropResult.cropMetadata.headBounds) {
        const bounds = cropResult.cropMetadata.headBounds;
        ctx.strokeStyle = '#00ff00';
        ctx.lineWidth = 2;
        ctx.strokeRect(bounds.xMin, bounds.yMin, bounds.width, bounds.height);
      }

      // Draw face bounding box (blue rectangle - for comparison)
      if (cropResult.cropMetadata.boundingBox) {
        const box = cropResult.cropMetadata.boundingBox;
        ctx.strokeStyle = '#0088ff';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.strokeRect(box.x * img.width, box.y * img.height, box.width * img.width, box.height * img.height);
        ctx.setLineDash([]);
      }

      // Draw landmarks (red dots)
      if (cropResult.cropMetadata.landmarks) {
        const lm = cropResult.cropMetadata.landmarks;
        ctx.fillStyle = '#ff0000';

        [lm.leftEye, lm.rightEye, lm.noseTip, lm.mouthCenter, lm.chinBottom, lm.foreheadTop].forEach((point) => {
          ctx.beginPath();
          ctx.arc(point.x * img.width, point.y * img.height, 4, 0, Math.PI * 2);
          ctx.fill();
        });

        // Draw face center (yellow dot)
        ctx.fillStyle = '#ffff00';
        ctx.beginPath();
        ctx.arc(lm.faceCenter.x * img.width, lm.faceCenter.y * img.height, 6, 0, Math.PI * 2);
        ctx.fill();
      }
    };
    img.src = imageUrl;
  }, [cropResult]);

  // Assign stream to video element after it renders
  React.useEffect(() => {
    if (cameraStream && videoRef.current) {
      videoRef.current.srcObject = cameraStream;
    }
  }, [cameraStream]);

  // Cleanup URLs on unmount
  React.useEffect(() => {
    return () => {
      if (originalUrl) URL.revokeObjectURL(originalUrl);
      if (croppedUrl) URL.revokeObjectURL(croppedUrl);
      stopCamera();
    };
  }, [originalUrl, croppedUrl, stopCamera]);

  return (
    <div style={{ padding: '20px', fontFamily: 'monospace', maxWidth: '1200px', margin: '0 auto' }}>
      <h1>Face Crop Test Page</h1>
      <p style={{ color: '#666', marginBottom: '20px' }}>
        Dev-only page for testing client-side face cropping functionality
      </p>

      {isInitializing && (
        <div style={{ padding: '10px', background: '#fff3cd', border: '1px solid #ffc107', marginBottom: '20px' }}>
          Loading face detector model...
        </div>
      )}

      {error && (
        <div style={{ padding: '10px', background: '#f8d7da', border: '1px solid #dc3545', marginBottom: '20px' }}>
          <strong>Error:</strong> {error}
        </div>
      )}

      {/* Input Controls */}
      <div style={{ marginBottom: '20px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={isInitializing || isProcessing}
          style={{
            padding: '10px 20px',
            background: '#007bff',
            color: 'white',
            border: 'none',
            cursor: 'pointer',
            borderRadius: '4px',
          }}
        >
          Upload Image
        </button>

        {!cameraStream ? (
          <button
            onClick={startCamera}
            disabled={isInitializing || isProcessing}
            style={{
              padding: '10px 20px',
              background: '#28a745',
              color: 'white',
              border: 'none',
              cursor: 'pointer',
              borderRadius: '4px',
            }}
          >
            Start Camera
          </button>
        ) : (
          <>
            <button
              onClick={captureFromCamera}
              disabled={isProcessing}
              style={{
                padding: '10px 20px',
                background: '#17a2b8',
                color: 'white',
                border: 'none',
                cursor: 'pointer',
                borderRadius: '4px',
              }}
            >
              Capture Photo
            </button>
            <button
              onClick={stopCamera}
              style={{
                padding: '10px 20px',
                background: '#dc3545',
                color: 'white',
                border: 'none',
                cursor: 'pointer',
                borderRadius: '4px',
              }}
            >
              Stop Camera
            </button>
          </>
        )}

        <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileUpload} style={{ display: 'none' }} />
      </div>

      {/* Camera Preview */}
      {cameraStream && (
        <div style={{ marginBottom: '20px' }}>
          <h3>Camera Preview</h3>
          <video ref={videoRef} autoPlay playsInline style={{ maxWidth: '100%', maxHeight: '400px', border: '2px solid #ccc' }} />
        </div>
      )}

      <canvas ref={canvasRef} style={{ display: 'none' }} />

      {/* Results */}
      {cropResult && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
            {/* Original with annotations */}
            <div>
              <h3>Original (with head bounds & landmarks)</h3>
              <div style={{ fontSize: '12px', color: '#666', marginBottom: '8px' }}>
                Green: head bounds | Blue dashed: face box | Red: landmarks | Yellow: face center
              </div>
              {originalUrl && (
                <canvas
                  ref={(canvas) => {
                    if (canvas && originalUrl) {
                      drawAnnotations(canvas, originalUrl);
                    }
                  }}
                  style={{ width: '100%', border: '2px solid #ccc' }}
                />
              )}
            </div>

            {/* Cropped result with transparency preview */}
            <div>
              <h3>Isolated Head (PNG with transparency)</h3>
              {croppedUrl && (
                <div
                  style={{
                    backgroundImage: `
                      linear-gradient(45deg, #ccc 25%, transparent 25%),
                      linear-gradient(-45deg, #ccc 25%, transparent 25%),
                      linear-gradient(45deg, transparent 75%, #ccc 75%),
                      linear-gradient(-45deg, transparent 75%, #ccc 75%)
                    `,
                    backgroundSize: '20px 20px',
                    backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px',
                    border: '2px solid #ccc',
                  }}
                >
                  <img src={croppedUrl} alt="Isolated Head" style={{ width: '100%', display: 'block' }} />
                </div>
              )}
            </div>
          </div>

          {/* Metadata */}
          <div style={{ background: '#f8f9fa', padding: '15px', border: '1px solid #dee2e6', borderRadius: '4px' }}>
            <h3>Crop Metadata</h3>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <tbody>
                <tr>
                  <td style={{ padding: '8px', borderBottom: '1px solid #dee2e6', fontWeight: 'bold' }}>Face Detected</td>
                  <td style={{ padding: '8px', borderBottom: '1px solid #dee2e6' }}>
                    {cropResult.cropMetadata.faceDetected ? '✓ Yes' : '✗ No'}
                  </td>
                </tr>
                <tr>
                  <td style={{ padding: '8px', borderBottom: '1px solid #dee2e6', fontWeight: 'bold' }}>Segmentation Used</td>
                  <td style={{ padding: '8px', borderBottom: '1px solid #dee2e6' }}>
                    {cropResult.cropMetadata.segmentationMaskUsed ? '✓ Yes' : '✗ No'}
                  </td>
                </tr>
                <tr>
                  <td style={{ padding: '8px', borderBottom: '1px solid #dee2e6', fontWeight: 'bold' }}>Confidence</td>
                  <td style={{ padding: '8px', borderBottom: '1px solid #dee2e6' }}>
                    {(cropResult.cropMetadata.confidence * 100).toFixed(1)}%
                  </td>
                </tr>
                {cropResult.cropMetadata.headBounds && (
                  <tr>
                    <td style={{ padding: '8px', borderBottom: '1px solid #dee2e6', fontWeight: 'bold' }}>Head Bounds (px)</td>
                    <td style={{ padding: '8px', borderBottom: '1px solid #dee2e6' }}>
                      {cropResult.cropMetadata.headBounds.width}x{cropResult.cropMetadata.headBounds.height} at (
                      {cropResult.cropMetadata.headBounds.xMin}, {cropResult.cropMetadata.headBounds.yMin})
                    </td>
                  </tr>
                )}
                {cropResult.cropMetadata.boundingBox && (
                  <tr>
                    <td style={{ padding: '8px', borderBottom: '1px solid #dee2e6', fontWeight: 'bold' }}>
                      Face Box (normalized)
                    </td>
                    <td style={{ padding: '8px', borderBottom: '1px solid #dee2e6' }}>
                      x: {cropResult.cropMetadata.boundingBox.x.toFixed(3)}, y: {cropResult.cropMetadata.boundingBox.y.toFixed(3)}, w:{' '}
                      {cropResult.cropMetadata.boundingBox.width.toFixed(3)}, h: {cropResult.cropMetadata.boundingBox.height.toFixed(3)}
                    </td>
                  </tr>
                )}
                <tr>
                  <td style={{ padding: '8px', borderBottom: '1px solid #dee2e6', fontWeight: 'bold' }}>Landmarks Detected</td>
                  <td style={{ padding: '8px', borderBottom: '1px solid #dee2e6' }}>
                    {cropResult.cropMetadata.landmarks ? '✓ Yes (7 key points)' : '✗ No'}
                  </td>
                </tr>
                <tr>
                  <td style={{ padding: '8px', borderBottom: '1px solid #dee2e6', fontWeight: 'bold' }}>Output Size</td>
                  <td style={{ padding: '8px', borderBottom: '1px solid #dee2e6' }}>
                    {cropResult.cropMetadata.outputSize.width}x{cropResult.cropMetadata.outputSize.height} (PNG)
                  </td>
                </tr>
                <tr>
                  <td style={{ padding: '8px', borderBottom: '1px solid #dee2e6', fontWeight: 'bold' }}>Padding</td>
                  <td style={{ padding: '8px', borderBottom: '1px solid #dee2e6' }}>{(cropResult.cropMetadata.padding * 100).toFixed(0)}%</td>
                </tr>
                <tr>
                  <td style={{ padding: '8px', fontWeight: 'bold' }}>Processing Time</td>
                  <td style={{ padding: '8px' }}>{cropResult.cropMetadata.processingTimeMs}ms</td>
                </tr>
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
};
