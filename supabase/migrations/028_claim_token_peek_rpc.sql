-- 028: Replace direct claim_tokens reads with a peek_claim_token() RPC.
--
-- WHAT IT FIXES
--   015's "user_can_read_pending_claim_tokens" lets every org member SELECT and
--   list all pending tokens in the org, while the token UUID is the only bearer
--   secret. Any member could enumerate and read other people's pending tokens.
--
-- HOW
--   public.peek_claim_token(p_token_id) returns the token's payload only for a
--   specific known id that is pending, unexpired and in the caller's org
--   (public.get_user_org_id()); otherwise NULL. The member SELECT policy is then
--   dropped. Kiosk policies (015 insert, 021 select) and the realtime
--   publication are untouched.
--
-- CLIENT BEHAVIOUR / DEPLOY ORDERING
--   Deploy this together with the ClaimPage client change that calls the RPC.
--   The client falls back gracefully if the RPC is missing, but once the policy
--   is dropped the direct select returns nothing, so an old client sees every
--   token as not found.

BEGIN;

create or replace function public.peek_claim_token(p_token_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select t.payload
  from public.claim_tokens t
  where t.id = p_token_id
    and t.status = 'pending'
    and t.expires_at > now()
    and t.org_id = public.get_user_org_id();
$$;

revoke all on function public.peek_claim_token(uuid) from public, anon;
grant execute on function public.peek_claim_token(uuid) to authenticated;

drop policy if exists "user_can_read_pending_claim_tokens" on claim_tokens;

COMMIT;
