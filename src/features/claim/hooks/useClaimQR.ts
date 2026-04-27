import { useState, useEffect, useRef, useCallback } from 'react';
import { claimService } from '@/core/supabase/claimService';
import { playClaimSound } from '@/shared/sound/playClaimSound';
import type { ClaimPayload, GeneratedClaim } from '../types';

interface UseClaimQROptions {
  onClaimed?: (payload: ClaimPayload, claimedBy: string) => void;
  onExpire?: () => void;
}

interface UseClaimQRResult {
  claim: GeneratedClaim | null;
  isGenerating: boolean;
  error: string | null;
  secondsRemaining: number;
  regenerate: () => void;
}

export function useClaimQR(payload: ClaimPayload, options: UseClaimQROptions = {}): UseClaimQRResult {
  const [claim, setClaim] = useState<GeneratedClaim | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [secondsRemaining, setSecondsRemaining] = useState(0);

  const optionsRef = useRef(options);
  optionsRef.current = options;

  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const generate = useCallback(async (currentPayload: ClaimPayload) => {
    if (!mountedRef.current) return;
    setIsGenerating(true);
    setError(null);
    setClaim(null);

    try {
      const result = await claimService.generateClaimToken(currentPayload);
      if (!mountedRef.current) return;
      setClaim(result);
      const secs = Math.floor((new Date(result.expires_at).getTime() - Date.now()) / 1000);
      setSecondsRemaining(Math.max(0, secs));
    } catch (err) {
      if (!mountedRef.current) return;
      setError(err instanceof Error ? err.message : 'Failed to generate QR code');
    } finally {
      if (mountedRef.current) setIsGenerating(false);
    }
  }, []);

  // Generate on mount (guarded against StrictMode double-invocation)
  const payloadRef = useRef(payload);
  const hasGeneratedRef = useRef(false);
  useEffect(() => {
    if (hasGeneratedRef.current) return;
    hasGeneratedRef.current = true;
    payloadRef.current = payload;
    generate(payload);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Countdown timer
  useEffect(() => {
    if (!claim) return;

    const interval = window.setInterval(() => {
      if (!mountedRef.current) return;
      const secs = Math.floor((new Date(claim.expires_at).getTime() - Date.now()) / 1000);
      const remaining = Math.max(0, secs);
      setSecondsRemaining(remaining);
      if (remaining === 0) {
        optionsRef.current.onExpire?.();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [claim]);

  // Realtime subscription for claim event
  useEffect(() => {
    if (!claim) return;

    const unsubscribe = claimService.subscribeToClaim(
      claim.token_id,
      (claimedPayload, claimedBy) => {
        playClaimSound();
        optionsRef.current.onClaimed?.(claimedPayload, claimedBy);
      }
    );

    return unsubscribe;
  }, [claim?.token_id]); // eslint-disable-line react-hooks/exhaustive-deps

  const regenerate = useCallback(() => {
    generate(payloadRef.current);
  }, [generate]);

  return { claim, isGenerating, error, secondsRemaining, regenerate };
}
