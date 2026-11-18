-- Candy rewards for Gumball Slice.
-- A winning round's claim token (payload.type = 'candy_reward') becomes a
-- candy_voucher on the claimer's account, limited to daily_cap_per_user per
-- local day. Vouchers never expire; staff exchange them at the front desk for
-- a coin for the candy machine (redemption + Google Sheet sync come later).
--
-- All writes go through issue_candy_voucher(), which only the claim-candy-reward
-- edge function can call (service role), matching the 015/016/017 convention of
-- no client-side INSERT/UPDATE policies.

BEGIN;

-- ------------------------------------------------------------
-- 1. Per-org reward settings
-- ------------------------------------------------------------
-- Editable without a deploy. min_slices / max_broccoli_hits are the server's
-- copy of the win rule (GUMBALL_SLICE_CONFIG on the kiosk should match); the
-- server's values decide.

create table reward_config (
  org_id             uuid        primary key references organization(id) on delete cascade,
  enabled            boolean     not null default true,
  daily_cap_per_user integer     not null default 1 check (daily_cap_per_user >= 0),
  min_slices         integer     not null default 20,
  max_broccoli_hits  integer     not null default 2,
  timezone           text        not null default 'America/New_York',
  updated_at         timestamptz not null default now()
);

-- No policies: only the service role (edge functions, SQL editor) reads or
-- changes settings for now.
alter table reward_config enable row level security;

-- ------------------------------------------------------------
-- 2. Vouchers
-- ------------------------------------------------------------

create type candy_voucher_status as enum ('issued', 'redeemed', 'void');

create table candy_voucher (
  id             uuid                 primary key default gen_random_uuid(),
  org_id         uuid                 not null references organization(id) on delete cascade,
  owner_id       uuid                 not null references "user"(id) on delete cascade,
  claim_token_id uuid                 unique references claim_tokens(id) on delete set null,
  round_id       text                 not null unique, -- one voucher per game round
  game_id        text                 not null,
  code           text                 not null,        -- short code staff match at the desk
  status         candy_voucher_status not null default 'issued',
  won_on         date                 not null,        -- local day of the win; drives the daily cap
  round          jsonb                not null,        -- round stats from the claim payload
  issued_at      timestamptz          not null default now(),
  redeemed_at    timestamptz,

  unique (org_id, code),

  -- (owner_id, org_id) must refer to the same "user" row, as in game_score.
  foreign key (owner_id, org_id) references "user"(id, org_id)
);

create index idx_candy_voucher_owner_day  on candy_voucher (owner_id, won_on);
create index idx_candy_voucher_org_status on candy_voucher (org_id, status);

alter table candy_voucher enable row level security;

-- Players can read their own vouchers (the phone's "My candy" section).
create policy "owners_can_read_own_candy_vouchers"
  on candy_voucher for select
  to authenticated
  using (owner_id = auth.uid());

-- Lets the phone update live when a voucher is redeemed.
alter publication supabase_realtime add table candy_voucher;

-- ------------------------------------------------------------
-- 3. issue_candy_voucher: claim a candy_reward token in one transaction
-- ------------------------------------------------------------
-- Returns jsonb { status: 'issued' | 'capped' | 'disabled' | 'error', ... }.
-- 'error' results carry an http status and make no changes. For the other
-- results the token is claimed and the round is saved to game_score:
--   issued   → a voucher was created (voucher_id, code, won_on)
--   capped   → the player already won today's candy (resets_at)
--   disabled → candy rewards are switched off for this org

create or replace function public.issue_candy_voucher(p_token_id uuid, p_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_alphabet   constant text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; -- no 0/O, 1/I/L
  v_user_org   uuid;
  v_token      claim_tokens%rowtype;
  v_cfg        reward_config%rowtype;
  v_data       jsonb;
  v_round_id   text;
  v_today      date;
  v_won_today  integer;
  v_code       text;
  v_voucher    candy_voucher%rowtype;
  v_constraint text;
begin
  -- Kiosks and admins have no "user" row, which rejects them.
  select org_id into v_user_org from "user" where id = p_user_id;
  if v_user_org is null then
    return jsonb_build_object('status', 'error', 'http', 403, 'error', 'User not found or has no organization');
  end if;

  -- Lock the token so concurrent claims of the same QR serialize here.
  select * into v_token from claim_tokens where id = p_token_id for update;
  if not found then
    return jsonb_build_object('status', 'error', 'http', 404, 'error', 'Token not found');
  end if;
  if v_token.status <> 'pending' then
    return jsonb_build_object('status', 'error', 'http', 409, 'error', 'Token has already been claimed or expired');
  end if;
  if v_token.expires_at <= now() then
    return jsonb_build_object('status', 'error', 'http', 410, 'error', 'Token has expired');
  end if;
  if v_token.org_id <> v_user_org then
    return jsonb_build_object('status', 'error', 'http', 403, 'error', 'Token is not from your organization');
  end if;
  if v_token.payload->>'type' is distinct from 'candy_reward' then
    return jsonb_build_object('status', 'error', 'http', 400, 'error', 'Not a candy reward token');
  end if;

  v_data := v_token.payload->'data';
  v_round_id := v_data->>'round_id';
  if v_round_id is null then
    return jsonb_build_object('status', 'error', 'http', 400, 'error', 'Candy reward token has no round_id');
  end if;
  if exists (select 1 from candy_voucher where round_id = v_round_id) then
    return jsonb_build_object('status', 'error', 'http', 409, 'error', 'This round was already claimed');
  end if;

  insert into reward_config (org_id) values (v_token.org_id) on conflict (org_id) do nothing;
  select * into v_cfg from reward_config where org_id = v_token.org_id;

  -- Re-check the win rule server-side; the kiosk isn't fully trusted.
  if not coalesce((v_data->>'full_round')::boolean, false)
     or coalesce((v_data->>'sliced_count')::integer, 0) < v_cfg.min_slices
     or coalesce((v_data->>'broccoli_hits')::integer, 0) > v_cfg.max_broccoli_hits then
    return jsonb_build_object('status', 'error', 'http', 422, 'error', 'This round does not qualify for candy');
  end if;

  -- From here the claim always goes through: the token is used up and the
  -- round counts as a score on the player's profile, whether or not a
  -- voucher is issued.
  update claim_tokens set status = 'claimed', claimed_by = p_user_id where id = p_token_id;

  insert into game_score (owner_id, org_id, game_id, score, metadata)
  values (p_user_id, v_token.org_id, coalesce(v_data->>'game_id', 'gumballslice'),
          coalesce((v_data->>'score')::integer, 0), v_data);

  if not v_cfg.enabled then
    return jsonb_build_object('status', 'disabled');
  end if;

  -- One player at a time, so two phones on one account can't both slip
  -- under the daily cap.
  perform pg_advisory_xact_lock(hashtext('candy_voucher:' || p_user_id::text));

  v_today := (now() at time zone v_cfg.timezone)::date;
  select count(*) into v_won_today
  from candy_voucher
  where owner_id = p_user_id and won_on = v_today and status <> 'void';

  if v_won_today >= v_cfg.daily_cap_per_user then
    return jsonb_build_object(
      'status', 'capped',
      'resets_at', ((v_today + 1)::timestamp at time zone v_cfg.timezone)
    );
  end if;

  -- Retry on the (rare) short-code collision; anything else is a real error.
  loop
    v_code := '';
    for i in 1..4 loop
      v_code := v_code || substr(v_alphabet, 1 + floor(random() * length(v_alphabet))::integer, 1);
    end loop;

    begin
      insert into candy_voucher (org_id, owner_id, claim_token_id, round_id, game_id, code, won_on, round)
      values (v_token.org_id, p_user_id, p_token_id, v_round_id,
              coalesce(v_data->>'game_id', 'gumballslice'), v_code, v_today, v_data)
      returning * into v_voucher;
      exit;
    exception when unique_violation then
      get stacked diagnostics v_constraint = constraint_name;
      if v_constraint <> 'candy_voucher_org_id_code_key' then
        raise;
      end if;
    end;
  end loop;

  return jsonb_build_object(
    'status', 'issued',
    'voucher_id', v_voucher.id,
    'code', v_voucher.code,
    'won_on', v_voucher.won_on
  );
end;
$$;

revoke all on function public.issue_candy_voucher(uuid, uuid) from public, anon, authenticated;
grant execute on function public.issue_candy_voucher(uuid, uuid) to service_role;

COMMIT;
