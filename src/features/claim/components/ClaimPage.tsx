import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/core/auth';
import { claimService } from '@/core/supabase/claimService';
import styles from './ClaimPage.module.css';

export function ClaimPage() {
  const { tokenId } = useParams<{ tokenId: string }>();
  const navigate = useNavigate();
  const { authMode, isLoading } = useAuth();

  useEffect(() => {
    if (isLoading) return;

    if (authMode !== 'user') {
      // Preserve destination for post-login resume
      navigate(`/user?next=/claim/${tokenId}`, { replace: true });
      return;
    }

    if (!tokenId) {
      navigate('/claim/error?reason=Missing+token+ID', { replace: true });
      return;
    }

    claimService.executeClaim(tokenId).then((result) => {
      navigate('/claim/success', { state: { payload: result.payload }, replace: true });
    }).catch((err) => {
      const reason = encodeURIComponent(err instanceof Error ? err.message : 'Claim failed');
      navigate(`/claim/error?reason=${reason}`, { replace: true });
    });
  }, [authMode, isLoading, tokenId, navigate]);

  return (
    <div className={styles.page}>
      <div className={styles.content}>
        <span className={styles.text}>claiming...</span>
      </div>
    </div>
  );
}
