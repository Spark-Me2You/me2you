import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { kioskQrService } from '@/core/supabase/kioskQrService';

interface RegistrationQRValue {
  url: string | null;
  expiresAt: number | null;
  isLoading: boolean;
  error: string | null;
}

const RegistrationQRContext = createContext<RegistrationQRValue | null>(null);

const ROTATION_MS = 270000;

export function RegistrationQRProvider({ children }: { children: ReactNode }) {
  const [url, setUrl] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const fetchQrCode = async () => {
      try {
        setError(null);
        const response = await kioskQrService.generateRegistrationQR();
        if (cancelled) return;
        if (!response.url || !response.expires_at) {
          throw new Error('Invalid response from QR generation service');
        }
        setUrl(response.url);
        setExpiresAt(response.expires_at);
        setIsLoading(false);
      } catch (err) {
        if (cancelled) return;
        console.error('[RegistrationQRProvider] Failed to fetch QR code:', err);
        setError(err instanceof Error ? err.message : 'Failed to generate QR code');
        setIsLoading(false);
      }
    };

    fetchQrCode();
    const interval = setInterval(fetchQrCode, ROTATION_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  return (
    <RegistrationQRContext.Provider value={{ url, expiresAt, isLoading, error }}>
      {children}
    </RegistrationQRContext.Provider>
  );
}

export function useRegistrationQR(): RegistrationQRValue {
  const ctx = useContext(RegistrationQRContext);
  if (!ctx) {
    throw new Error('useRegistrationQR must be used within RegistrationQRProvider');
  }
  return ctx;
}
