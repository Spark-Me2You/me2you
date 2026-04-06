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
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
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
   * Draw bounding box on original image
   */
  const drawBoundingBox = useCallback(
    (canvas: HTMLCanvasElement, imageUrl: string, box: { x: number; y: number; width: number; height: number }) => {
      const img = new Image();
      img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.drawImage(img, 0, 0);

        // Draw bounding box
        ctx.strokeStyle = '#00ff00';
        ctx.lineWidth = 3;
        ctx.strokeRect(box.x * img.width, box.y * img.height, box.width * img.width, box.height * img.height);

        // Draw center point
        ctx.fillStyle = '#ff0000';
        ctx.beginPath();
        ctx.arc((box.x + box.width / 2) * img.width, (box.y + box.height / 2) * img.height, 5, 0, Math.PI * 2);
        ctx.fill();
      };
      img.src = imageUrl;
    },
    []
  );

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
            {/* Original with bounding box */}
            <div>
              <h3>Original (with face bounding box)</h3>
              {originalUrl && cropResult.cropMetadata.boundingBox && (
                <canvas
                  ref={(canvas) => {
                    if (canvas && originalUrl && cropResult.cropMetadata.boundingBox) {
                      drawBoundingBox(canvas, originalUrl, cropResult.cropMetadata.boundingBox);
                    }
                  }}
                  style={{ width: '100%', border: '2px solid #ccc' }}
                />
              )}
              {originalUrl && !cropResult.cropMetadata.boundingBox && (
                <img src={originalUrl} alt="Original" style={{ width: '100%', border: '2px solid #ccc' }} />
              )}
            </div>

            {/* Cropped result */}
            <div>
              <h3>Cropped Result</h3>
              {croppedUrl && <img src={croppedUrl} alt="Cropped" style={{ width: '100%', border: '2px solid #ccc' }} />}
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
                  <td style={{ padding: '8px', borderBottom: '1px solid #dee2e6', fontWeight: 'bold' }}>Confidence</td>
                  <td style={{ padding: '8px', borderBottom: '1px solid #dee2e6' }}>
                    {(cropResult.cropMetadata.confidence * 100).toFixed(1)}%
                  </td>
                </tr>
                {cropResult.cropMetadata.boundingBox && (
                  <tr>
                    <td style={{ padding: '8px', borderBottom: '1px solid #dee2e6', fontWeight: 'bold' }}>Bounding Box</td>
                    <td style={{ padding: '8px', borderBottom: '1px solid #dee2e6' }}>
                      x: {cropResult.cropMetadata.boundingBox.x.toFixed(3)}, y: {cropResult.cropMetadata.boundingBox.y.toFixed(3)}, w:{' '}
                      {cropResult.cropMetadata.boundingBox.width.toFixed(3)}, h: {cropResult.cropMetadata.boundingBox.height.toFixed(3)}
                    </td>
                  </tr>
                )}
                <tr>
                  <td style={{ padding: '8px', borderBottom: '1px solid #dee2e6', fontWeight: 'bold' }}>Output Size</td>
                  <td style={{ padding: '8px', borderBottom: '1px solid #dee2e6' }}>
                    {cropResult.cropMetadata.outputSize.width}x{cropResult.cropMetadata.outputSize.height}
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
