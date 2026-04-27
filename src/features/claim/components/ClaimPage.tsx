import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/core/auth';
import { supabase } from '@/core/supabase/client';
import { claimService } from '@/core/supabase/claimService';
import { MessageComposePage } from '@/features/messages';
import styles from './ClaimPage.module.css';

interface ComposeContext {
  tokenId: string;
  recipientName: string;
}

export function ClaimPage() {
  const { tokenId } = useParams<{ tokenId: string }>();
  const navigate = useNavigate();
  const { authMode, isLoading } = useAuth();
  const hasExecutedRef = useRef(false);
  const [composeContext, setComposeContext] = useState<ComposeContext | null>(null);

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

    // Guard against StrictMode double-invocation — only execute the claim once.
    // The redirect branches above are intentionally unguarded: authMode can
    // legitimately flip null→'user' after the initial render.
    if (hasExecutedRef.current) return;
    hasExecutedRef.current = true;

    // Peek at the pending token's payload to decide which edge function to call.
    // Drawing claims need a dedicated function because moving the PNG between
    // buckets is a storage op that can't live in a Postgres trigger.
    // Message claims show a compose UI instead of auto-executing.
    (async () => {
      try {
        const { data: token } = await supabase
          .from('claim_tokens')
          .select('payload')
          .eq('id', tokenId)
          .single();

        const payload = token?.payload as { type?: string; data?: { recipient_name?: string } } | null;
        const payloadType = payload?.type;

        if (payloadType === 'message') {
          setComposeContext({
            tokenId,
            recipientName: payload?.data?.recipient_name ?? 'someone',
          });
          return;
        }

        if (payloadType === 'drawing') {
          await claimService.executeDrawingClaim(tokenId);
          navigate('/user/gallery', { replace: true });
          return;
        }

        const result = await claimService.executeClaim(tokenId);
        navigate('/claim/success', { state: { payload: result.payload }, replace: true });
      } catch (err) {
        const reason = encodeURIComponent(err instanceof Error ? err.message : 'Claim failed');
        navigate(`/claim/error?reason=${reason}`, { replace: true });
      }
    })();
  }, [authMode, isLoading, tokenId, navigate]);

  if (composeContext) {
    return (
      <MessageComposePage
        tokenId={composeContext.tokenId}
        recipientName={composeContext.recipientName}
      />
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.content}>
        <span className={styles.text}>claiming...</span>
      </div>
    </div>
  );
}
