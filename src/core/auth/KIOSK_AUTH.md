# Kiosk Authentication

## Overview

The kiosk authentication system allows admins to activate a read-only kiosk mode scoped to a specific organization. This enables public installations where users can interact with the application in a controlled, organization-specific environment.

**Key Features:**
- Dual authentication modes: Admin and Kiosk
- Single global shared kiosk account with org-scoped sessions
- JWT-based organization scoping via `app_metadata`
- Seamless transition from admin to kiosk mode
- Session persistence across page reloads

## Architecture

### Authentication Modes

The system supports three authentication modes (managed in `AuthContext`):

1. **`'unauthenticated'`** - No active session
2. **`'admin'`** - Authenticated as admin with full read/write access
3. **`'kiosk'`** - Authenticated as shared kiosk user with read-only access to specific org

Only ONE mode can be active at a time. Modes are mutually exclusive.

### Flow Diagram

```
UNAUTHENTICATED
      │
      ▼
[Admin logs in at /login]
      │
      ▼
ADMIN STATE
- Authenticated as admin
- Full read/write access via admin RLS role
- Sees organization selector UI at /select-org
      │
      ▼
[Admin selects organization]
      │
      ▼
[Edge function: mint-kiosk-session]
  1. Verify admin authentication
  2. Validate admin has access to org
  3. Lookup kiosk user (kiosk@me2you.app)
  4. Update kiosk user app_metadata: { is_kiosk: true, org_id }
  5. Generate magic link token
  6. Return token to client
      │
      ▼
[Client: kioskAuthService.mintKioskSession]
  1. Receive kiosk token from edge function
  2. Sign out admin session
  3. Exchange token for kiosk session (verifyOtp)
  4. AuthProvider detects kiosk mode from JWT
      │
      ▼
KIOSK STATE
- Authenticated as shared kiosk account
- JWT carries org_id in app_metadata
- Read-only access scoped to org (enforced by RLS)
- Full app features available (state machine runs normally)
- Shows "Exit Kiosk Mode" button
      │
      ▼
[User clicks "Exit Kiosk Mode"]
      │
      ▼
[kioskAuthService.exitKioskMode]
  - Sign out kiosk session
  - Clear all auth state
      │
      ▼
UNAUTHENTICATED
```

## Components

### Core Auth Components

#### AuthContext (`src/core/auth/AuthContext.tsx`)

Extended to support kiosk mode:

```typescript
interface AuthContextType {
  // Existing fields
  user: User | null;
  admin: AdminUser | null;
  session: Session | null;
  isLoading: boolean;
  isAuthenticated: boolean;

  // NEW: Kiosk fields
  authMode: 'admin' | 'kiosk' | 'unauthenticated';
  kioskOrgId: string | null;

  // Existing methods
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;

  // NEW: Kiosk methods
  mintKioskSession: (orgId: string) => Promise<void>;
  exitKioskMode: () => Promise<void>;
}
```

#### AuthProvider (`src/core/auth/AuthProvider.tsx`)

Manages both admin and kiosk authentication:

- **Auth Mode Detection**: Inspects JWT `app_metadata` to determine mode
  - If `is_kiosk === true`: Set `authMode = 'kiosk'`
  - Otherwise: Verify admin table, set `authMode = 'admin'`
- **Session Restoration**: On page reload, detects and restores kiosk sessions
- **Transition Handling**: Manages admin → kiosk transition via `mintKioskSession()`

#### AdminOnlyRoute (`src/core/auth/AdminOnlyRoute.tsx`)

Route guard for admin-only pages (e.g., `/select-org`):

- Redirects to `/login` if not authenticated
- Redirects to `/app` if authenticated as kiosk (not admin)
- Renders children only for admin mode

### Kiosk Service Layer

#### kioskAuthService (`src/core/supabase/kioskAuth.ts`)

Service for kiosk session operations:

**Methods:**

```typescript
// Mint kiosk session for organization
mintKioskSession(orgId: string): Promise<KioskSession>

// Get current kiosk session (if any)
getCurrentKioskSession(): Promise<KioskSession | null>

// Exit kiosk mode (sign out)
exitKioskMode(): Promise<void>
```

**KioskSession interface:**

```typescript
interface KioskSession {
  user: User;           // Kiosk user from auth.users
  session: Session;     // Supabase session with JWT
  org_id: string;       // Organization ID from app_metadata
}
```

### Edge Function

#### mint-kiosk-session (`supabase/functions/mint-kiosk-session/index.ts`)

Serverless function that mints kiosk sessions:

**Input:**
```json
{
  "org_id": "uuid-of-organization",
  "otp": "one-time-passcode-from-admin-login"
}
```

**Output (Success):**
```json
{
  "success": true,
  "access_token": "jwt-access-token",
  "refresh_token": "jwt-refresh-token",
  "kiosk_user_id": "uuid-of-kiosk-user",
  "org_id": "uuid-of-organization"
}
```

**Output (Error):**
```json
{
  "success": false,
  "error": "Error message"
}
```

**Steps:**
1. Verify admin authentication via `Authorization` header
2. Validate admin has access to requested `org_id`
3. Verify the provided OTP server-side (e.g., using Supabase Auth OTP APIs)
4. Lookup kiosk user account (`kiosk@me2you.app`)
5. Mint a Supabase session for the kiosk user scoped to the requested `org_id`
6. Return the `access_token` and `refresh_token` along with `kiosk_user_id` and `org_id`
4. Update kiosk user's `app_metadata` with `{ is_kiosk: true, org_id }`
5. Generate magic link token using Supabase Admin API
6. Return token to client

### UI Components

#### OrgSelectorPage (`src/features/admin/components/OrgSelectorPage.tsx`)

Organization selection UI for admins:

- Fetches organizations the admin has access to
- Displays org cards (one button per org)
- On selection: calls `mintKioskSession(orgId)` and navigates to `/app`
- Shows loading state and error messages

#### AppContainer (`src/AppContainer.tsx`)

Main app container with kiosk mode support:

- Logs current auth mode on render
- Renders different logout button based on `authMode`:
  - Admin: "Admin Logout" button
  - Kiosk: "Exit Kiosk Mode" button
- Displays org ID in kiosk mode

## Routing

### Route Structure

```
/login          → AdminLoginPage (public)
                  On success: navigate to /select-org

/select-org     → OrgSelectorPage (admin-only via AdminOnlyRoute)
                  On org selection: navigate to /app in kiosk mode

/app            → AppContainer (admin OR kiosk via ProtectedRoute)
                  Renders based on authMode

/               → Redirects to /app
```

### Navigation Flow

1. **Admin Login**: `/login` → `/select-org` (on success)
2. **Org Selection**: `/select-org` → `/app` (mints kiosk session, then navigates)
3. **Exit Kiosk**: `/app` → `/login` (signs out kiosk, redirect via ProtectedRoute)

## Setup Instructions

### 1. Create Kiosk User Account

The kiosk authentication system requires a shared kiosk user account with email `kiosk@me2you.app`.

**Option A: Via Supabase Dashboard**
1. Navigate to Authentication → Users
2. Click "Add user"
3. Email: `kiosk@me2you.app`
4. Password: Generate a secure password (won't be used for login)
5. Confirm user email automatically
6. Save

**Option B: Via SQL**

```sql
-- Create kiosk user in auth.users table
INSERT INTO auth.users (
  id,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  app_metadata
)
VALUES (
  gen_random_uuid(),
  'kiosk@me2you.app',
  crypt('GENERATE_SECURE_PASSWORD_HERE', gen_salt('bf')),
  now(),
  now(),
  now(),
  '{"is_kiosk": true}'::jsonb
);
```

**Important Notes:**
- The kiosk user should NOT have a password login
- Only magic link authentication is used for kiosk sessions
- The edge function updates `app_metadata` with `org_id` per session

### 2. Deploy Edge Function

```bash
# From project root
supabase functions deploy mint-kiosk-session
```

**Environment Variables Required:**
- `SUPABASE_URL` - Auto-set by Supabase
- `SUPABASE_ANON_KEY` - Auto-set by Supabase
- `SUPABASE_SERVICE_ROLE_KEY` - Auto-set by Supabase (for admin API operations)

### 3. Configure RLS Policies

**TODO**: The user will implement RLS policies separately. Key requirements:

- Kiosk user should have **read-only** access to data
- Access should be scoped by `org_id` from JWT `app_metadata`
- Use `auth.jwt() -> 'app_metadata' ->> 'org_id'` in RLS policies

**Example RLS Policy:**

```sql
-- Read-only access to images for kiosk users
CREATE POLICY "Kiosk users can view images from their org"
  ON image FOR SELECT
  USING (
    auth.jwt() -> 'app_metadata' ->> 'is_kiosk' = 'true'
    AND org_id = (auth.jwt() -> 'app_metadata' ->> 'org_id')::uuid
  );
```

## Console Logging Reference

All auth operations log to console for debugging. Use browser DevTools to monitor the flow.

### Log Format

`[ComponentName/ServiceName] Message: data`

### Key Logging Points

**Admin Sign In:**
```
[AdminLoginPage] Admin signed in, navigating to org selector
[AuthProvider] Admin signed in: admin@example.com
[AuthProvider] Auth mode changed: admin
```

**Org Selection:**
```
[OrgSelector] Admin selecting org: <org_id> (<org_name>)
```

**Edge Function Execution:**
```
[mint-kiosk-session] Function invoked
[mint-kiosk-session] Admin verified: <admin_id>
[mint-kiosk-session] Requested org_id: <org_id>
[mint-kiosk-session] Admin authorized for org
[mint-kiosk-session] Kiosk user found: <kiosk_user_id>
[mint-kiosk-session] Kiosk user metadata updated
[mint-kiosk-session] Kiosk session token generated
```

**Kiosk Session Minting:**
```
[kioskAuth] Minting kiosk session for org: <org_id>
[kioskAuth] Edge function returned token for user: <kiosk_user_id>
[kioskAuth] Signing out admin session
[kioskAuth] Admin signed out
[kioskAuth] Exchanging token for kiosk session
[kioskAuth] Kiosk session established
[kioskAuth] Kiosk user ID: <user_id>
[kioskAuth] Kiosk org_id from metadata: <org_id>
```

**AuthProvider Mode Change:**
```
[AuthProvider] Kiosk session minted for org: <org_id>
[AuthProvider] Kiosk user ID: <user_id>
[AuthProvider] Kiosk token in app_metadata: {"is_kiosk":true,"org_id":"..."}
[AuthProvider] Auth mode changed: kiosk
```

**AppContainer Rendering:**
```
[AppContainer] Rendered in auth mode: kiosk
[AppContainer] Kiosk mode active for org: <org_id>
```

**Exit Kiosk Mode:**
```
[AppContainer] Exit kiosk clicked
[kioskAuth] Exiting kiosk mode
[kioskAuth] Kiosk session signed out
[AuthProvider] Kiosk mode exited
```

## Session Persistence

Kiosk sessions persist in `localStorage` (Supabase default behavior).

**On Page Reload:**
1. `AuthProvider.initializeAuth()` runs
2. Calls `kioskAuthService.getCurrentKioskSession()`
3. Retrieves session from `localStorage`
4. Checks `app_metadata.is_kiosk` and `app_metadata.org_id`
5. If valid kiosk session: restores `authMode = 'kiosk'` and `kioskOrgId`

**Session Expiry:**
- Supabase automatically refreshes JWT tokens before expiry
- If refresh fails: `onAuthStateChange` fires `SIGNED_OUT` event
- AuthProvider clears all state
- User redirected to `/login` by ProtectedRoute

## Error Handling

### Edge Function Errors

**Kiosk user not found:**
```json
{
  "success": false,
  "error": "Kiosk user account not found. Please contact administrator."
}
```
- **Cause**: No user with email `kiosk@me2you.app` exists
- **Solution**: Create kiosk user account (see Setup Instructions)

**Admin not authorized:**
```json
{
  "success": false,
  "error": "Admin does not have access to this organization"
}
```
- **Cause**: Admin's `org_id` doesn't match requested `org_id`
- **Solution**: Verify admin has correct org assignment in `admin` table

**Admin authentication failed:**
```json
{
  "success": false,
  "error": "Admin authentication failed"
}
```
- **Cause**: Invalid or missing `Authorization` header
- **Solution**: Ensure admin is signed in before calling edge function

### Client-Side Errors

**Token exchange failed:**
```
[kioskAuth] Token exchange failed: <error>
```
- **Cause**: Invalid token or Supabase configuration issue
- **Solution**: Check edge function logs, verify kiosk user exists

**Org fetch failed:**
```
[OrgSelector] Failed to fetch organizations: <error>
```
- **Cause**: Database query error or RLS policy blocking access
- **Solution**: Verify admin has access to `organization` table

## Security Considerations

### JWT Trust

The kiosk session's `org_id` is stored in JWT `app_metadata`, which is:
- Server-signed (cannot be tampered with by client)
- Used as the trusted source for RLS policies
- Updated only by edge function using Supabase Admin API

**Never trust client-provided `org_id`** - always use `auth.jwt() -> 'app_metadata' ->> 'org_id'` in RLS policies.

### Kiosk User Security

The kiosk user account:
- Has no password login (magic link only)
- Can only be authenticated via edge function (requires admin auth)
- Has read-only permissions enforced by RLS

**Do not:**
- Share kiosk user credentials
- Allow direct login to kiosk account
- Grant write permissions to kiosk role

### Edge Function Security

The edge function:
- Verifies admin authentication before minting sessions
- Validates admin has access to requested org
- Uses Supabase Service Role Key (server-side only, never exposed to client)

**Environment variables:**
- `SUPABASE_SERVICE_ROLE_KEY` is secret - never commit to version control
- Supabase automatically injects this in edge function environment

## Troubleshooting

### Issue: "Kiosk user account not found"

**Symptoms:** Edge function returns error when selecting org

**Diagnosis:**
1. Check if kiosk user exists:
   ```sql
   SELECT * FROM auth.users WHERE email = 'kiosk@me2you.app';
   ```
2. Check edge function logs in Supabase Dashboard

**Solution:** Create kiosk user account (see Setup Instructions)

---

### Issue: Page refresh logs out of kiosk mode

**Symptoms:** After refreshing page in kiosk mode, redirected to login

**Diagnosis:**
1. Check console logs for session restoration
2. Inspect `localStorage` for `supabase.auth.token`
3. Check if session expired

**Solution:**
- Verify session persistence is enabled in Supabase client (`persistSession: true`)
- Check if JWT expiry is configured correctly
- Ensure `AuthProvider.initializeAuth()` properly detects kiosk sessions

---

### Issue: "Admin does not have access to this organization"

**Symptoms:** Cannot select organization even though admin owns it

**Diagnosis:**
1. Check admin's `org_id` in database:
   ```sql
   SELECT * FROM admin WHERE id = '<admin_user_id>';
   ```
2. Compare with organization being selected

**Solution:** Update admin's `org_id` in database to match organization

---

### Issue: Cannot exit kiosk mode

**Symptoms:** "Exit Kiosk Mode" button doesn't work

**Diagnosis:**
1. Check console logs for errors
2. Verify `exitKioskMode()` is being called
3. Check if sign out is failing

**Solution:**
- Ensure `kioskAuthService.exitKioskMode()` is implemented correctly
- Check Supabase client connection
- Clear `localStorage` manually if needed: `localStorage.clear()`

## API Reference

### AuthContext Hook

```typescript
import { useAuth } from '@/core/auth';

const MyComponent = () => {
  const {
    authMode,        // 'admin' | 'kiosk' | 'unauthenticated'
    kioskOrgId,      // string | null
    mintKioskSession, // (orgId: string) => Promise<void>
    exitKioskMode,   // () => Promise<void>
  } = useAuth();

  // ...
};
```

### Kiosk Auth Service

```typescript
import { kioskAuthService } from '@/core/supabase';

// Mint kiosk session
const kioskSession = await kioskAuthService.mintKioskSession('org-uuid');
// Returns: { user, session, org_id }

// Get current kiosk session
const currentSession = await kioskAuthService.getCurrentKioskSession();
// Returns: KioskSession | null

// Exit kiosk mode
await kioskAuthService.exitKioskMode();
// Returns: Promise<void>
```

## Future Enhancements

- [ ] Add kiosk session timeout (auto-exit after inactivity)
- [ ] Support multiple kiosk accounts per organization
- [ ] Add kiosk mode indicator UI component
- [ ] Implement kiosk-specific analytics tracking
- [ ] Add ability to switch organizations without re-login

---

**For questions or issues, refer to:**
- Main README: `README.md`
- Admin Auth Documentation: `src/core/auth/README.md`
- Database Schema: `supabase/migrations/001_initial_schema.sql`
