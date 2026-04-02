import { useSharedCamera } from '@/core/cv/SharedCameraProvider';

/**
 * useCamera Hook
 * Consumes the shared camera stream from SharedCameraProvider.
 * Previously called getUserMedia() directly — now shares a single stream
 * with the CV cursor to avoid camera conflicts.
 */
export const useCamera = () => {
  const { stream, isLoading, error } = useSharedCamera();
  return { stream, isLoading, error };
};
