import { useState, useRef, useCallback, useEffect } from 'react';
import type { Html5Qrcode } from 'html5-qrcode';
import { claimService } from '@/core/supabase/claimService';
import type { ClaimPayload } from '../types';

const CLAIM_TOKEN_PATTERN = /\/claim\/([0-9a-f-]{36})(?:[?#].*)?$/;

interface UseClaimScannerOptions {
  elementId: string;
  onSuccess: (payload: ClaimPayload) => void;
  onError: (message: string) => void;
}

interface UseClaimScannerResult {
  isScanning: boolean;
  isProcessing: boolean;
  error: string | null;
  start: () => Promise<void>;
  stop: () => Promise<void>;
}

export function useClaimScanner({
  elementId,
  onSuccess,
  onError,
}: UseClaimScannerOptions): UseClaimScannerResult {
  const [isScanning, setIsScanning] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const mountedRef = useRef(true);
  const callbacksRef = useRef({ onSuccess, onError });
  callbacksRef.current = { onSuccess, onError };

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      // Clean up scanner on unmount without triggering state updates
      scannerRef.current?.stop().catch(() => {});
    };
  }, []);

  const stop = useCallback(async () => {
    const scanner = scannerRef.current;
    if (!scanner) return;
    try {
      await scanner.stop();
    } catch {
      // Already stopped
    }
    if (mountedRef.current) setIsScanning(false);
  }, []);

  const start = useCallback(async () => {
    if (!mountedRef.current) return;
    setError(null);
    setIsScanning(true);

    try {
      const { Html5Qrcode: Html5QrcodeClass } = await import('html5-qrcode');
      const scanner = new Html5QrcodeClass(elementId);
      scannerRef.current = scanner;

      await scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        async (decodedText: string) => {
          const match = decodedText.match(CLAIM_TOKEN_PATTERN);
          if (!match) return;

          const tokenId = match[1];
          await scanner.stop().catch(() => {});
          if (mountedRef.current) {
            setIsScanning(false);
            setIsProcessing(true);
          }

          try {
            const result = await claimService.executeClaim(tokenId);
            if (mountedRef.current) callbacksRef.current.onSuccess(result.payload);
          } catch (err) {
            const msg = err instanceof Error ? err.message : 'Claim failed';
            if (mountedRef.current) {
              setError(msg);
              callbacksRef.current.onError(msg);
            }
          } finally {
            if (mountedRef.current) setIsProcessing(false);
          }
        },
        undefined
      );
    } catch (err) {
      if (!mountedRef.current) return;
      const msg = err instanceof Error ? err.message : 'Could not start camera';
      setError(msg);
      setIsScanning(false);
    }
  }, [elementId]);

  return { isScanning, isProcessing, error, start, stop };
}
