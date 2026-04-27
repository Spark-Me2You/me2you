-- Kiosks need to SELECT their own org's claim_tokens regardless of status so
-- Supabase Realtime can deliver UPDATE events. Realtime evaluates RLS against
-- the post-update row, which has status='claimed' — the existing user-scoped
-- policy requires status='pending' and uses get_user_org_id() which returns
-- null for the kiosk JWT, so that policy fails and the event is silently dropped.
create policy "kiosk_can_read_own_claim_tokens"
  on claim_tokens for select
  to authenticated
  using (
    coalesce((auth.jwt() -> 'app_metadata' ->> 'is_kiosk')::boolean, false) = true
    and org_id = nullif(auth.jwt() -> 'app_metadata' ->> 'org_id', '')::uuid
  );
