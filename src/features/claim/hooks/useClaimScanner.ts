import { useState, useRef, useCallback, useEffect } from 'react';
import type { Html5Qrcode } from 'html5-qrcode';

const CLAIM_TOKEN_PATTERN = /\/claim\/([0-9a-f-]{36})(?:[?#].*)?$/;

/**
 * html5-qrcode's stop() throws synchronously (a string, not a rejected
 * promise) when the scanner isn't running. Left uncaught in a React cleanup
 * it unmounts the whole app, leaving a blank screen, so every stop goes
 * through here.
 */
async function safeStop(scanner: Html5Qrcode | null): Promise<void> {
  if (!scanner) return;
  try {
    await scanner.stop();
  } catch {
    // Not running (never started, or already stopped)
  }
}

interface UseClaimScannerOptions {
  elementId: string;
  /**
   * Called once with the token of the first claim QR scanned. The scanner is
   * already stopped. The caller opens /claim/:tokenId so a scan behaves exactly
   * like opening the QR link (message compose, drawing, candy, ...).
   */
  onScan: (tokenId: string) => void;
}

interface UseClaimScannerResult {
  isScanning: boolean;
  error: string | null;
  start: () => Promise<void>;
  stop: () => Promise<void>;
}

export function useClaimScanner({ elementId, onScan }: UseClaimScannerOptions): UseClaimScannerResult {
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const mountedRef = useRef(true);
  // Bumped by every start/stop, so a start that is still awaiting the camera
  // can tell it was cancelled (closed early, or StrictMode's double mount).
  const runIdRef = useRef(0);
  const onScanRef = useRef(onScan);
  useEffect(() => {
    onScanRef.current = onScan;
  }, [onScan]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      // Also cancels a start still awaiting the camera (see isCurrent).
      mountedRef.current = false;
      void safeStop(scannerRef.current);
      scannerRef.current = null;
    };
  }, []);

  const stop = useCallback(async () => {
    runIdRef.current++;
    const scanner = scannerRef.current;
    scannerRef.current = null;
    await safeStop(scanner);
    if (mountedRef.current) setIsScanning(false);
  }, []);

  const start = useCallback(async () => {
    if (!mountedRef.current) return;
    const runId = ++runIdRef.current;
    const isCurrent = () => mountedRef.current && runIdRef.current === runId;
    setError(null);
    setIsScanning(true);

    // A scanner left over from an earlier start must not keep the camera.
    await safeStop(scannerRef.current);
    scannerRef.current = null;

    try {
      const { Html5Qrcode: Html5QrcodeClass } = await import('html5-qrcode');
      if (!isCurrent()) return;
      const scanner = new Html5QrcodeClass(elementId);
      scannerRef.current = scanner;
      let handled = false;

      await scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        async (decodedText: string) => {
          const match = decodedText.match(CLAIM_TOKEN_PATTERN);
          if (!match || handled) return;
          handled = true;

          await safeStop(scanner);
          if (scannerRef.current === scanner) scannerRef.current = null;
          if (!isCurrent()) return;
          setIsScanning(false);
          onScanRef.current(match[1]);
        },
        undefined,
      );

      // Closed while the camera was starting: release it now.
      if (!isCurrent()) {
        await safeStop(scanner);
        if (scannerRef.current === scanner) scannerRef.current = null;
      }
    } catch (err) {
      if (!isCurrent()) return;
      const msg = err instanceof Error ? err.message : 'Could not start camera';
      setError(msg);
      setIsScanning(false);
    }
  }, [elementId]);

  return { isScanning, error, start, stop };
}
