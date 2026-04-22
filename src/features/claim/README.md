# Claim System

A payload-agnostic QR claim infrastructure. The kiosk generates a short-lived QR code encoding a claim token; a user scans it with their phone; the token is atomically claimed to their account; and the kiosk is notified in real-time.

The system is intentionally feature-agnostic — it knows nothing about highscores, badges, or messages. Those features layer on top by supplying a payload and handling the `onClaimed` callback.

---

## How it works

```
Kiosk                          Supabase                      User's phone
─────────────────────────────────────────────────────────────────────────
1. useClaimQR(payload)
   → calls generate-claim-token ──► inserts claim_tokens row
   ← receives { token_id,            (status: 'pending')
                claim_url,
                expires_at }

2. <ClaimQR /> renders QR
   (QRCodeSVG from claim_url)

3. subscribeToClaim(token_id) ──► subscribes to realtime
   (waiting for UPDATE event)       UPDATE on that row

                                                    4. User scans QR
                                                       phone opens /claim/:id

                                                    5. ClaimPage checks auth
                                                       → if not user: /user?next=
                                                       → if user: executeClaim()

                                                    6. execute-claim edge fn
                                                       ← verifies user + org match
                              ◄── UPDATE status='claimed'
                                       claimed_by = user.id

7. Realtime fires onClaimed ◄──
   (payload, claimedBy)
   Feature reacts here

                                                    8. /claim/success renders
                                                       payload.display content
```

---

## Directory structure

```
src/features/claim/
├── types.ts                    # ClaimPayload, GeneratedClaim, ClaimResult
├── index.ts                    # Barrel exports
├── hooks/
│   ├── useClaimQR.ts           # Kiosk: generate QR, countdown, realtime subscription
│   └── useClaimScanner.ts      # Mobile: in-app camera scanner
└── components/
    ├── ClaimQR.tsx             # Kiosk QR display + countdown
    ├── ClaimQR.module.css
    ├── ClaimScanner.tsx        # Mobile in-app scanner modal
    ├── ClaimScanner.module.css
    ├── ClaimPage.tsx           # Route handler at /claim/:tokenId
    ├── ClaimPage.module.css
    ├── ClaimSuccessPage.tsx    # Success display driven by payload.display
    ├── ClaimSuccessPage.module.css
    ├── ClaimErrorPage.tsx      # Error display with reason string
    └── ClaimErrorPage.module.css
```

Backend:
```
supabase/migrations/015_claim_tokens.sql
supabase/functions/generate-claim-token/index.ts
supabase/functions/execute-claim/index.ts
src/core/supabase/claimService.ts
```

---

## Payload envelope

Every claim token carries a typed payload envelope. The claim system reads only `display` (to render success UI) and ignores `data` entirely — `data` is opaque and belongs to the feature.

```ts
type ClaimPayload = {
  version: '1.0';
  type: string;           // feature-defined, e.g. 'high_score', 'badge', 'art_piece'
  display: {
    title: string;        // shown on ClaimSuccessPage, e.g. "New High Score!"
    description: string;  // e.g. "You scored 500 points in Retro Racer"
    icon?: string;        // key into the icon map: 'trophy' | 'badge' | 'gift' | 'star' | 'art'
  };
  data: Record<string, unknown>; // feature-specific, opaque to claim infra
};
```

Example:
```json
{
  "version": "1.0",
  "type": "high_score",
  "display": {
    "title": "New High Score!",
    "description": "You scored 500 points in Retro Racer.",
    "icon": "trophy"
  },
  "data": {
    "game_id": "retro_racer_v1",
    "score": 500,
    "difficulty": "hard"
  }
}
```

To add a new claim type: define your payload shape, pass it to `useClaimQR`, and handle the `onClaimed` callback. No changes to claim infrastructure required.

---

## Kiosk usage

```tsx
import { useClaimQR, ClaimQR } from '@/features/claim';

function MyGameResultScreen({ score }: { score: number }) {
  const { claim, isGenerating, error, secondsRemaining, regenerate } = useClaimQR(
    {
      version: '1.0',
      type: 'high_score',
      display: {
        title: 'New High Score!',
        description: `You scored ${score} points.`,
        icon: 'trophy',
      },
      data: { game_id: 'my_game', score },
    },
    {
      onClaimed: (payload, claimedBy) => {
        console.log('Claimed by user:', claimedBy);
        // Run your side-effect here: insert leaderboard row, show celebration, etc.
        transitionTo(AppState.IDLE);
      },
      onExpire: () => {
        // Optional: auto-regenerate or show a message
        regenerate();
      },
    }
  );

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
```

`useClaimQR` automatically:
- Calls `generate-claim-token` on mount
- Ticks a countdown every second
- Subscribes to the Supabase Realtime UPDATE event on that token row
- Fires `onClaimed(payload, claimedBy)` the moment the user claims it
- Cleans up the subscription on unmount

---

## Mobile user flows

### Flow A — Native camera (no app required)

The QR encodes `https://your-app.com/claim/:tokenId`. The user points their phone camera at the kiosk, the OS opens the browser, and the app handles it at `/claim/:tokenId`.

`ClaimPage` checks auth on load:
- **Not signed in as a user** → redirects to `/user?next=/claim/:tokenId`. After sign-in, `UserLandingPage` reads the `?next=` param and resumes the claim route.
- **Already signed in as a user** → calls `executeClaim(tokenId)` immediately.
- On success → `/claim/success` with `payload` in location state.
- On error → `/claim/error?reason=...`.

### Flow B — In-app scanner

Users already signed in at `/user/profile` can tap **"scan a code"** to open `ClaimScanner`. The modal opens the device camera, scans for a matching URL, calls `executeClaim`, then navigates to `/claim/success`.

The in-app scanner uses `html5-qrcode` (dynamically imported to avoid SSR issues) with rear-facing camera mode.

---

## Service API (`src/core/supabase/claimService.ts`)

```ts
// Kiosk: generate a token and get back the claim URL + expiry
claimService.generateClaimToken(payload: ClaimPayload): Promise<GeneratedClaim>

// Mobile: atomically claim a token by ID
claimService.executeClaim(tokenId: string): Promise<ClaimResult>

// Kiosk: subscribe to a realtime UPDATE on a specific token row
// Returns an unsubscribe function — call it on cleanup
claimService.subscribeToClaim(
  tokenId: string,
  onClaimed: (payload: ClaimPayload, claimedBy: string) => void
): () => void
```

---

## Security model

| Concern | How it's handled |
|---|---|
| Non-kiosk users generating tokens | `generate-claim-token` rejects callers without `app_metadata.is_kiosk = true` |
| Kiosk forging `org_id` | Edge function reads `org_id` from JWT `app_metadata` only — body value is ignored |
| User claiming another org's token | `execute-claim` checks `token.org_id === user.org_id` (queried from `"user"` table) |
| User directly updating `status` | No RLS UPDATE policy exists — only the service role client in `execute-claim` can mutate tokens |
| Double-claim race condition | Atomic `UPDATE ... WHERE status = 'pending'` — zero rows returned → 409 |
| Screenshot sharing | 5-minute TTL on all tokens |
| Token enumeration | UUIDs are not guessable |
| Kiosks/admins calling `execute-claim` | Edge function queries the `"user"` table for the caller — kiosks/admins have no row there, so they're rejected with 403 |

The `claim_tokens` table has no UPDATE RLS policy. All status transitions happen exclusively inside `execute-claim` via a service role client, which bypasses RLS. Regular users and kiosks cannot mutate token state directly.

---

## Database schema

```sql
create type claim_status as enum ('pending', 'claimed', 'expired');

create table claim_tokens (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references organization(id) on delete cascade,
  payload     jsonb not null,
  status      claim_status not null default 'pending',
  claimed_by  uuid references auth.users(id) on delete set null,
  expires_at  timestamptz not null default (now() + interval '5 minutes'),
  created_at  timestamptz not null default now()
);
```

RLS policies:
- **INSERT**: kiosk only (`app_metadata.is_kiosk = true`, `org_id` matches JWT)
- **SELECT**: users can read `pending`, non-expired tokens for their own org
- **UPDATE**: none (service role only via edge function)

Token expiry is enforced at query time (`expires_at > now()`) and in `execute-claim` before the atomic update. There is no background cleanup job — expired tokens simply fail validation and are ignored. A `pg_cron` cleanup job can be added later if table size becomes a concern.

---

## Adding a new claim type

1. Define your payload shape extending `ClaimPayload` (optional — `data` is typed as `Record<string, unknown>`)
2. Call `useClaimQR(payload, { onClaimed })` from your kiosk feature component
3. In `onClaimed`, run your side-effect (insert a DB row, update state, etc.)
4. Optionally add your icon key to the `ICON_MAP` in `ClaimSuccessPage.tsx` if you want a custom emoji

No changes to migrations, edge functions, or the claim service are needed.
