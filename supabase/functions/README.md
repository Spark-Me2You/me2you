# Supabase Edge Functions

This directory contains Supabase Edge Functions for the me2you application.

## Functions

### `mint-kiosk-session`
Creates a kiosk session for an admin-selected organization. See the function's inline documentation for details.

### `generate-registration-qr`
Generates a signed JWT token for QR-code based registration. The token is displayed as a QR code on the kiosk and rotates every 5 minutes.

**Authentication Required:** Kiosk session (checks `app_metadata.is_kiosk`)

**Response:**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "url": "https://me2you.app/register?token=...",
  "expires_at": 1234567890,
  "expires_in_seconds": 300
}
```

### `delete-user-images`

Deletes all gesture and cropped image records (DB rows + storage objects) for the calling user. The user's account, profile, and profile photo (`image` table) remain intact. Intended as a "clear my photos / start fresh" operation.

**Authentication Required:** Regular user session JWT

**Request:** `POST` (no body — identity derived entirely from JWT)

**Success Response:**
```json
{
  "success": true,
  "gesture_rows_deleted": 3,
  "cropped_rows_deleted": 3,
  "storage_objects_deleted": 6
}
```

**Error Response:**
```json
{
  "success": false,
  "error": "User profile not found",
  "error_code": "USER_NOT_FOUND"
}
```

**Error Codes:**
- `MISSING_AUTH` (401) — No `Authorization` header provided
- `INVALID_TOKEN` (401) — JWT is invalid, expired, or malformed
- `USER_NOT_FOUND` (404) — No `public.user` row for the authenticated user
- `ORG_NOT_RESOLVED` (400) — User row has no `org_id`
- `DB_ERROR` (500) — Failed to query or delete `gesture_image` / `cropped_image` rows
- `STORAGE_ERROR` (500) — Failed to remove objects from the `images` bucket
- `SERVER_ERROR` (500) — Unexpected internal error

**Security:**
- `user_id` is extracted from the verified JWT only — never trusted from request body.
- `org_id` is fetched from `public.user` under the caller's own JWT (RLS enforced); callers cannot target another user's data.
- Service role client is only created after the JWT + ownership check passes.
- Only paths sourced from `gesture_image` and `cropped_image` are deleted — profile photos in the `image` table are untouched.

---

### `delete-user-account`

Permanently deletes the calling user's account: removes all storage objects, then deletes the `auth.users` row. Cascades via FK constraints from migration `013_add_cascade_deletes.sql` automatically clean up `public.user`, `public.admin`, `public.image`, `public.gesture_image`, and `public.cropped_image`.

**Authentication Required:** Regular user session JWT

**Request:** `POST` (no body — identity derived entirely from JWT)

**Success Response:**
```json
{
  "success": true,
  "storage_objects_deleted": 4,
  "auth_user_deleted": true
}
```

**Error Response:**
```json
{
  "success": false,
  "error": "Account images removed but account deletion failed. Please contact support to complete removal.",
  "error_code": "AUTH_DELETE_FAILED"
}
```

**Error Codes:**
- `MISSING_AUTH` (401) — No `Authorization` header provided
- `INVALID_TOKEN` (401) — JWT is invalid, expired, or malformed
- `USER_NOT_FOUND` (404) — No `public.user` row for the authenticated user
- `ORG_NOT_RESOLVED` (400) — User row has no `org_id`
- `STORAGE_ERROR` (500) — Failed to list or remove objects from the `images` bucket
- `AUTH_DELETE_FAILED` (500) — Storage deleted but `auth.admin.deleteUser()` failed (orphan state — see note below)
- `SERVER_ERROR` (500) — Unexpected internal error

**Ordering and Failure Handling:**
Storage is deleted **before** the auth user row. If `auth.admin.deleteUser()` fails, the user's images are gone but the account remains intact — the user can retry. The reverse ordering would leave orphaned storage objects with no identifiable owner for cleanup. An `AUTH_DELETE_FAILED` response is logged with the `user_id` and `org_id` for admin investigation.

**Cascade chain (no manual DB cleanup needed):**
`auth.users` → `public.user`, `public.admin`, `public.image`, `public.gesture_image`, `public.cropped_image` (all ON DELETE CASCADE, migration `013_add_cascade_deletes.sql`)

**Security:**
- `user_id` is extracted from the verified JWT only — never trusted from request body.
- `org_id` is fetched from `public.user` under the caller's own JWT (RLS enforced).
- Service role client is only created after the JWT + ownership check passes.
- A caller can only delete their own account. Admin-initiated deletion of other users is out of scope for this function.

---

### `generate-claim-token`
Creates a one-time claim token for a kiosk feature (game score, badge, art piece, etc.). Returns a claim URL and expiry — the kiosk renders the QR code client-side. The claim URL encodes a UUID row ID, not any payload data.

**Authentication Required:** Kiosk session (checks `app_metadata.is_kiosk`)

**Request:**
```json
{
  "payload": {
    "version": "1.0",
    "type": "high_score",
    "display": {
      "title": "New High Score!",
      "description": "You scored 500 points.",
      "icon": "trophy"
    },
    "data": {
      "game_id": "retro_racer_v1",
      "score": 500
    }
  }
}
```

**Success Response:**
```json
{
  "success": true,
  "token_id": "uuid",
  "claim_url": "https://me2you.app/claim/uuid",
  "expires_at": "2024-01-01T00:05:00Z"
}
```

**Error Codes:**
- `401` — Missing or invalid Authorization header
- `403` — Caller is not a kiosk account (`app_metadata.is_kiosk` not true)
- `400` — Kiosk has no `org_id` in `app_metadata`, or payload fails envelope validation
- `500` — Database insert failed

**Security:**
- `org_id` is always read from the kiosk's JWT `app_metadata` — never from the request body.
- The RLS INSERT policy on `claim_tokens` independently enforces this: insert is only allowed when `app_metadata.is_kiosk = true` and the supplied `org_id` matches the JWT.
- The claim URL is a UUID — the payload is never embedded in the URL.

---

### `execute-claim`
Atomically claims a token on behalf of an authenticated user. Returns the token's payload so the client can render a type-specific success screen. The claim system itself is payload-agnostic — no per-type dispatch happens here. Features react to the claim via the Supabase Realtime subscription on the kiosk side.

**Authentication Required:** Regular user session JWT (kiosks and admins are rejected — they have no row in `public.user`)

**Request:**
```json
{
  "token_id": "uuid"
}
```

**Success Response:**
```json
{
  "success": true,
  "token_id": "uuid",
  "payload": {
    "version": "1.0",
    "type": "high_score",
    "display": { "title": "New High Score!", "description": "...", "icon": "trophy" },
    "data": { "game_id": "retro_racer_v1", "score": 500 }
  }
}
```

**Error Codes:**
- `401` — Missing or invalid Authorization header
- `403` — Caller has no `public.user` row (kiosk/admin), or `org_id` does not match token's `org_id`
- `404` — Token not found
- `409` — Token already claimed (or lost an atomic race)
- `410` — Token expired (`expires_at < now()`)
- `500` — Internal error

**Security:**
- User identity and `org_id` come from the verified JWT + `public.user` table query — never from the request body.
- Token read and the atomic `UPDATE ... WHERE status = 'pending'` both use the service role client (bypasses RLS). No UPDATE RLS policy exists on `claim_tokens` for regular users.
- Org isolation: `token.org_id` must equal the user's `org_id` or the request is rejected with 403.
- Double-claim protection: the `WHERE status = 'pending'` guard on the UPDATE is atomic — whichever concurrent request wins gets 0 rows back and returns 409.

---

### `verify-registration-token`
Verifies a registration token and returns organization information.

**Authentication Required:** None (public endpoint)

**Request:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Success Response:**
```json
{
  "success": true,
  "org_id": "uuid",
  "org_name": "SPARK"
}
```

**Error Response:**
```json
{
  "success": false,
  "error": "QR code has expired. Please scan a new code at the kiosk.",
  "error_code": "TOKEN_EXPIRED"
}
```

**Error Codes:**
- `TOKEN_EXPIRED` - QR code has expired (5 minutes)
- `INVALID_TOKEN` - Invalid JWT signature or malformed token
- `MISSING_TOKEN` - No token provided in request
- `INVALID_PAYLOAD` - Token payload missing required fields
- `ORG_NOT_FOUND` - Organization not found in database
- `SERVER_ERROR` - Internal server error

---

## Required Secrets

The following secrets must be configured in your Supabase project for the registration QR code system to work:

### `QR_TOKEN_SECRET`
**Required for:** `generate-registration-qr`, `verify-registration-token`

**Purpose:** HMAC secret key for signing and verifying JWT tokens

**How to generate:**
```bash
# Generate a random 256-bit (32-byte) secret
openssl rand -base64 32
```

**How to set:**
```bash
# Using Supabase CLI
supabase secrets set QR_TOKEN_SECRET="your-generated-secret-here"

# Or via Supabase Dashboard:
# Project Settings > Edge Functions > Secrets
```

**Important:**
- Keep this secret secure and never commit it to version control
- Use a different secret for production vs development environments
- Rotate this secret periodically (monthly recommended)

### `APP_BASE_URL`
**Required for:** `generate-registration-qr`, `generate-claim-token`

**Purpose:** Base URL for registration links embedded in QR codes

**Example values:**
- Development: `http://localhost:5173`
- Production: `https://me2you.app`

**How to set:**
```bash
# Using Supabase CLI
supabase secrets set APP_BASE_URL="https://me2you.app"

# Or via Supabase Dashboard:
# Project Settings > Edge Functions > Secrets
```

---

## Deployment

### Deploy all functions:
```bash
supabase functions deploy
```

### Deploy a specific function:
```bash
supabase functions deploy generate-registration-qr
supabase functions deploy verify-registration-token
supabase functions deploy generate-claim-token --no-verify-jwt
supabase functions deploy execute-claim --no-verify-jwt
supabase functions deploy delete-user-images --no-verify-jwt
supabase functions deploy delete-user-account --no-verify-jwt
```

### View function logs:
```bash
supabase functions logs generate-registration-qr
supabase functions logs verify-registration-token
supabase functions logs generate-claim-token
supabase functions logs execute-claim
supabase functions logs delete-user-images
supabase functions logs delete-user-account
```

---

## Local Development

### Serve functions locally:
```bash
supabase functions serve
```

### Test with curl:

**Generate QR:**
```bash
curl -X POST http://localhost:54321/functions/v1/generate-registration-qr \
  -H "Authorization: Bearer YOUR_KIOSK_JWT" \
  -H "Content-Type: application/json"
```

**Verify Token:**
```bash
curl -X POST http://localhost:54321/functions/v1/verify-registration-token \
  -H "Content-Type: application/json" \
  -d '{"token": "YOUR_JWT_TOKEN"}'
```

**Generate claim token (requires kiosk JWT):**
```bash
curl -X POST http://localhost:54321/functions/v1/generate-claim-token \
  -H "Authorization: Bearer YOUR_KIOSK_JWT" \
  -H "Content-Type: application/json" \
  -d '{
    "payload": {
      "version": "1.0",
      "type": "test",
      "display": { "title": "Test Claim", "description": "A test claim." },
      "data": {}
    }
  }'
```

**Execute claim (requires user JWT):**
```bash
curl -X POST http://localhost:54321/functions/v1/execute-claim \
  -H "Authorization: Bearer YOUR_USER_JWT" \
  -H "Content-Type: application/json" \
  -d '{"token_id": "YOUR_TOKEN_UUID"}'
```

**Delete user images (requires user JWT):**
```bash
curl -X POST http://localhost:54321/functions/v1/delete-user-images \
  -H "Authorization: Bearer YOUR_USER_JWT" \
  -H "Content-Type: application/json"
```

**Delete user account (requires user JWT — irreversible):**
```bash
curl -X POST http://localhost:54321/functions/v1/delete-user-account \
  -H "Authorization: Bearer YOUR_USER_JWT" \
  -H "Content-Type: application/json"
```

> **Note:** All functions in this project must be deployed with `--no-verify-jwt`. JWT verification is handled inside each function via `supabase.auth.getUser()`, which returns structured JSON error codes instead of a raw gateway 401. This applies to `generate-claim-token`, `execute-claim`, `delete-user-images`, and `delete-user-account`.

---

## Security Notes

1. **JWT Tokens:**
   - Signed with HS256 algorithm
   - 5-minute expiration (300 seconds)
   - Multi-use until expiration (trade-off for UX)

2. **Screenshot Sharing:**
   - QR codes can be screenshot and shared within the 5-minute window
   - Expiration mitigates long-term abuse
   - Future enhancement: single-use tokens with nonce tracking

3. **Secret Rotation:**
   - If `QR_TOKEN_SECRET` is rotated, all active tokens become invalid
   - Coordinate rotation during low-traffic periods
   - Consider implementing dual-secret verification during rotation window

4. **Rate Limiting:**
   - Consider adding rate limiting to `verify-registration-token` endpoint
   - Suggested: 10 validation attempts per IP per 5 minutes
