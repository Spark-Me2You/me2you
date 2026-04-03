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
**Required for:** `generate-registration-qr`

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
```

### View function logs:
```bash
supabase functions logs generate-registration-qr
supabase functions logs verify-registration-token
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
