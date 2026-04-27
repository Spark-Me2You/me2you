import { useClaimQR } from '../hooks/useClaimQR';
import { ClaimQR } from './ClaimQR';
import type { ClaimPayload } from '../types';

interface ClaimSectionProps {
  payload: ClaimPayload;
  onClaimed: () => void;
}

export function ClaimSection({ payload, onClaimed }: ClaimSectionProps) {
  const { claim, isGenerating, error, secondsRemaining, regenerate } =
    useClaimQR(payload, { onClaimed });

  return (
    <ClaimQR
      claim={claim}
      isGenerating={isGenerating}
      error={error}
      secondsRemaining={secondsRemaining}
      onRegenerate={regenerate}
    />
  );
}
