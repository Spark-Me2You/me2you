-- Front-desk candy redemption, driven by the staff Google Sheet.
-- The sheet's Apps Script talks to the candy-desk edge function, which calls
-- these functions with the service role:
--   candy_desk_vouchers()        every minute: the sheet's full picture of vouchers
--   set_candy_voucher_redeemed() when staff flip a row's Status
-- The sheet is authoritative for "redeemed"; a redemption can be undone for
-- 15 minutes, after which it is final.

BEGIN;

-- ------------------------------------------------------------
-- 1. candy_desk_vouchers: every voucher in an org, with who won it
-- ------------------------------------------------------------

create or replace function public.candy_desk_vouchers(p_org_id uuid)
returns table (
  voucher_id   uuid,
  code         text,
  status       candy_voucher_status,
  issued_at    timestamptz,
  redeemed_at  timestamptz,
  player_name  text,
  player_email text
)
language sql
stable
security definer
set search_path = public, auth
as $$
  select v.id, v.code, v.status, v.issued_at, v.redeemed_at, u.name, a.email::text
  from candy_voucher v
  join "user" u on u.id = v.owner_id
  left join auth.users a on a.id = v.owner_id
  where v.org_id = p_org_id
  order by v.issued_at;
$$;

-- ------------------------------------------------------------
-- 2. set_candy_voucher_redeemed: redeem, or undo a recent redemption
-- ------------------------------------------------------------
-- Returns jsonb { status: 'ok', voucher: {...} } or
-- { status: 'error', http, error } with no changes made. Repeating a call
-- that already took effect is a no-op 'ok', so the sheet can retry safely.

create or replace function public.set_candy_voucher_redeemed(
  p_voucher_id uuid,
  p_org_id     uuid,
  p_redeemed   boolean
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_undo_window constant interval := interval '15 minutes';
  v_voucher     candy_voucher%rowtype;
begin
  select * into v_voucher
  from candy_voucher
  where id = p_voucher_id and org_id = p_org_id
  for update;

  if not found then
    return jsonb_build_object('status', 'error', 'http', 404, 'error', 'Voucher not found');
  end if;
  if v_voucher.status = 'void' then
    return jsonb_build_object('status', 'error', 'http', 409, 'error', 'This voucher was cancelled');
  end if;

  if p_redeemed and v_voucher.status = 'issued' then
    update candy_voucher set status = 'redeemed', redeemed_at = now()
    where id = p_voucher_id
    returning * into v_voucher;
  elsif not p_redeemed and v_voucher.status = 'redeemed' then
    if v_voucher.redeemed_at < now() - v_undo_window then
      return jsonb_build_object('status', 'error', 'http', 409,
        'error', 'Redeemed more than 15 minutes ago, so it can''t be undone');
    end if;
    update candy_voucher set status = 'issued', redeemed_at = null
    where id = p_voucher_id
    returning * into v_voucher;
  end if;

  return jsonb_build_object(
    'status', 'ok',
    'voucher', jsonb_build_object(
      'voucher_id', v_voucher.id,
      'status', v_voucher.status,
      'redeemed_at', v_voucher.redeemed_at
    )
  );
end;
$$;

revoke all on function public.candy_desk_vouchers(uuid) from public, anon, authenticated;
revoke all on function public.set_candy_voucher_redeemed(uuid, uuid, boolean) from public, anon, authenticated;
grant execute on function public.candy_desk_vouchers(uuid) to service_role;
grant execute on function public.set_candy_voucher_redeemed(uuid, uuid, boolean) to service_role;

COMMIT;
