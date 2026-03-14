# Admin Authentication System

This directory contains the core authentication system for **admin users** in the me2you application. Admin authentication is separate from user authentication (card swipe) and uses email/password login.

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [Design Decisions](#design-decisions)
- [File Structure](#file-structure)
- [How It Works](#how-it-works)
- [Usage Guide](#usage-guide)
- [Common Issues](#common-issues)
- [API Reference](#api-reference)

---

## Architecture Overview

### Two-Layer Routing

The application uses a **two-layer routing architecture** to separate admin authentication from the main application:

```
React Router (Top Level)
├── /login → AdminLoginPage (email/password auth)
└── /app → AppContainer (state machine for main app)
    ├── IDLE state
    ├── DISCOVERY state
    ├── MY_PROFILE state
    └── ... (all other app states)
```

**Why this approach?**
- Admin auth uses standard page routing (React Router)
- Main app uses state machine routing (for CV-heavy interactions)
- Clean separation of concerns
- Admin auth doesn't interfere with app state machine

### Admin vs User Auth Separation

| Feature | Admin Auth | User Auth |
|---------|------------|-----------|
| **Location** | `src/core/auth/` | `src/features/user-session/` |
| **Method** | Email/password | Card swipe (TODO) |
| **Service** | `adminAuthService` in `core/supabase/adminAuth.ts` | `userAuthService` in `core/supabase/userAuth.ts` |
| **Table** | `admin` table | `user` table |
| **Provider** | `AuthProvider` (React Context) | Not yet implemented |
| **Purpose** | Installation management | Student interaction |

**Why separate?**
- Different authentication methods (email vs card swipe)
- Different use cases (management vs usage)
- Prevents confusion in codebase
- Allows independent development

---

## Design Decisions

### 1. Why Use React Context for Auth State?

**Decision:** Use React Context (`AuthProvider`) to manage admin authentication state globally.

**Reasons:**
- Auth state needs to be accessible throughout the app
- Avoids prop drilling
- Provides centralized state management
- Easy to access via `useAuth()` hook

**Alternatives considered:**
- Redux/Zustand: Too heavy for just auth state
- Props: Would require passing through many components
- Local state: Can't be shared across components

### 2. Why Check Admin Table After Supabase Auth?

**Decision:** Two-step verification - authenticate with Supabase, then verify `admin` table.

**Reasons:**
- Security: Not all authenticated users are admins
- Prevents unauthorized access if someone gets valid credentials
- Follows principle of least privilege

**Flow:**
```typescript
1. User enters email/password
2. Supabase authenticates (checks auth.users table)
3. Query admin table to verify user is an admin
4. If not admin → sign out immediately and throw error
5. If admin → return session and admin data
```

**Code location:** `src/core/supabase/adminAuth.ts:signInWithEmail()`

### 3. Why Skip Initial Auth Event?

**Decision:** Use `isInitializing` flag to skip the first `onAuthStateChange` event during app initialization.

**The Problem:**

When the app loads, we need to check if there's an existing session. However, Supabase's `onAuthStateChange` fires **immediately and synchronously** when you subscribe, before any async operations complete.

This creates a race condition:

```typescript
// What happens WITHOUT the flag:
1. useEffect runs
2. initializeAuth() starts (async) → calls getCurrentAdmin()
3. onAuthStateChange subscribes → FIRES IMMEDIATELY → also calls getCurrentAdmin()
4. Two getCurrentAdmin() calls run simultaneously
5. supabase.auth.getSession() gets called twice at same time
6. Race condition → one call hangs → infinite loading! ❌
```

**The Solution:**

Use an `isInitializing` flag to prevent duplicate work:

```typescript
// With the flag:
1. useEffect runs
2. isInitializing = true
3. initializeAuth() starts (async) → calls getCurrentAdmin()
4. onAuthStateChange subscribes → FIRES IMMEDIATELY
5. Event handler sees isInitializing = true → SKIPS processing
6. Only ONE getCurrentAdmin() call happens ✅
7. initializeAuth() completes → sets isInitializing = false
8. Future auth events (login, logout) are processed normally
```

**Why we can't just use onAuthStateChange alone:**

The immediate event from `onAuthStateChange` is **synchronous**, but we need to do **asynchronous** work (query database). If we try to handle everything in the event handler:
- We still make multiple async calls
- Race conditions still occur
- Code becomes harder to reason about

**Key insight:** The initial event from `onAuthStateChange` is telling us about the **same session** that `initializeAuth()` is already fetching. We don't need to handle it twice.

**Code location:** `src/core/auth/AuthProvider.tsx` (lines 30-80)

### 4. Why Use Protected Routes?

**Decision:** Wrap `/app` route in a `ProtectedRoute` component.

**Reasons:**
- Security: Prevents unauthenticated access
- User experience: Redirects to login automatically
- Centralized auth check
- Easy to extend with role-based access later

**How it works:**
```typescript
<Route
  path="/app"
  element={
    <ProtectedRoute>
      <AppContainer />
    </ProtectedRoute>
  }
/>
```

The `ProtectedRoute` component:
1. Checks `isAuthenticated` from auth context
2. Shows loading spinner while checking
3. Redirects to `/login` if not authenticated
4. Renders children if authenticated

---

## File Structure

```
src/core/auth/
├── README.md                   # This file
├── AuthContext.tsx            # Auth context definition & useAuth hook
├── AuthProvider.tsx           # Auth state management & session handling
├── ProtectedRoute.tsx         # Route guard component
└── index.ts                   # Public exports

src/core/supabase/
├── adminAuth.ts               # Admin authentication service (email/password)
├── userAuth.ts                # User authentication service (card swipe - TODO)
└── client.ts                  # Supabase client initialization

src/features/admin/
├── components/
│   ├── AdminLoginPage.tsx     # Login page container
│   └── LoginForm.tsx          # Email/password form UI
├── hooks/
│   └── useAdminLogin.ts       # Optional login hook
└── index.ts                   # Feature exports

src/features/user-session/     # User session (card swipe - TODO)
├── components/
│   ├── CardSwipePrompt.tsx
│   ├── LogoutButton.tsx
│   └── SessionTimeoutWarning.tsx
├── hooks/
│   ├── useCardReader.ts
│   ├── useSession.ts
│   └── useInactivityTimer.ts
└── services/
    └── sessionService.ts
```

---

## How It Works

### Authentication Flow

#### 1. **Fresh Login**

```
User navigates to app
    ↓
Protected route checks auth
    ↓
Not authenticated → Redirect to /login
    ↓
User enters email/password
    ↓
AdminLoginPage calls signIn()
    ↓
AuthProvider.signIn() → adminAuthService.signInWithEmail()
    ↓
Supabase authenticates user
    ↓
Query admin table to verify admin status
    ↓
If not admin: sign out + throw error
If admin: return { user, admin, session }
    ↓
AuthProvider updates state
    ↓
onAuthStateChange fires SIGNED_IN event (skipped - already handled)
    ↓
Navigate to /app
    ↓
ProtectedRoute sees isAuthenticated = true
    ↓
Render AppContainer (state machine)
```

#### 2. **Page Reload (Maintaining Session)**

```
User reloads page while logged in
    ↓
App mounts → AuthProvider useEffect runs
    ↓
isInitializing = true
    ↓
initializeAuth() starts
    ↓
adminAuthService.getCurrentAdmin()
    ├─ Get session from localStorage (Supabase handles this)
    ├─ If session exists → Query admin table
    └─ Return { user, admin, session } or null
    ↓
Meanwhile: onAuthStateChange fires SIGNED_IN
    ↓
Event handler sees isInitializing = true → SKIP
    ↓
initializeAuth() completes
    ├─ Updates auth state
    ├─ Sets isLoading = false
    └─ Sets isInitializing = false
    ↓
User stays on /app (no redirect)
```

#### 3. **Logout**

```
User clicks "Admin Logout" button
    ↓
Calls signOut()
    ↓
AuthProvider.signOut() → adminAuthService.signOut()
    ↓
Supabase clears session
    ↓
onAuthStateChange fires SIGNED_OUT event
    ↓
Event handler clears auth state
    ↓
isAuthenticated becomes false
    ↓
ProtectedRoute sees change
    ↓
Redirect to /login
```

### Session Management

**Persistence:**
- Supabase automatically persists sessions in `localStorage`
- Sessions auto-refresh before expiry
- No manual session management needed

**Security:**
- JWT tokens stored securely by Supabase
- Tokens auto-refresh
- Expired sessions automatically cleared

**State:**
```typescript
{
  user: User | null,           // Supabase auth.users data
  admin: AdminUser | null,     // admin table data
  session: Session | null,     // Supabase session (JWT)
  isLoading: boolean,          // Auth initialization state
  isAuthenticated: boolean,    // Computed: !!session && !!admin
}
```

---

## Usage Guide

### Accessing Auth State

```typescript
import { useAuth } from '@/core/auth';

function MyComponent() {
  const { user, admin, session, isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!isAuthenticated) {
    return <div>Not logged in</div>;
  }

  return (
    <div>
      <p>Welcome, {admin.email}!</p>
      <p>Organization: {admin.org_id}</p>
    </div>
  );
}
```

### Protecting Routes

```typescript
import { ProtectedRoute } from '@/core/auth';

<Route
  path="/admin-only"
  element={
    <ProtectedRoute>
      <AdminOnlyPage />
    </ProtectedRoute>
  }
/>
```

### Manual Login

```typescript
import { useAuth } from '@/core/auth';

function LoginPage() {
  const { signIn } = useAuth();
  const [error, setError] = useState(null);

  const handleLogin = async (email: string, password: string) => {
    try {
      await signIn(email, password);
      // Success - will redirect automatically
    } catch (err) {
      setError(err.message);
    }
  };

  return <LoginForm onSubmit={handleLogin} error={error} />;
}
```

### Manual Logout

```typescript
import { useAuth } from '@/core/auth';

function LogoutButton() {
  const { signOut } = useAuth();

  const handleLogout = async () => {
    try {
      await signOut();
      // Will redirect to /login automatically
    } catch (err) {
      console.error('Logout failed:', err);
    }
  };

  return <button onClick={handleLogout}>Logout</button>;
}
```

---

## Common Issues

### Issue: "infinite recursion detected in policy for relation 'admin'"

**Cause:** RLS policy on `admin` table queries the `admin` table from within itself.

**Solution:** Apply migration `002_fix_admin_rls_recursion.sql`:

```sql
DROP POLICY IF EXISTS "Admins can view other admins in same org" ON admin;
```

See: `supabase/migrations/002_fix_admin_rls_recursion.sql`

---

### Issue: "User is not authorized as an admin"

**Cause:** User authenticated with Supabase but not in `admin` table.

**Solution:** Insert admin record with correct user ID:

```sql
-- Get user ID from auth
SELECT id, email FROM auth.users WHERE email = 'your-email@example.com';

-- Insert into admin table (use ID from above)
INSERT INTO admin (id, org_id, email)
VALUES ('user-id-from-auth', 'org-id', 'your-email@example.com');
```

See: `ADMIN_SETUP_GUIDE.md` for detailed setup instructions.

---

### Issue: Infinite loading on page reload

**Cause:** Race condition between `initializeAuth()` and `onAuthStateChange` event.

**Solution:** Already implemented via `isInitializing` flag. If you still see this:

1. Check console logs for where it stops
2. Clear localStorage: `localStorage.clear()` then refresh
3. Ensure Supabase client is configured correctly
4. Check for JavaScript errors in console

---

### Issue: Session not persisting across page reloads

**Cause:** Supabase session not being stored or RLS blocking query.

**Checks:**
1. Verify `localStorage` has Supabase auth token
2. Check `getCurrentAdmin()` returns session on reload
3. Ensure RLS policies allow admin to view own record
4. Check browser console for errors

---

## API Reference

### `useAuth()`

Hook to access authentication context.

**Returns:**
```typescript
{
  user: User | null;              // Supabase user object
  admin: AdminUser | null;        // Admin table data
  session: Session | null;        // Supabase session
  isLoading: boolean;             // True during initialization
  isAuthenticated: boolean;       // True if logged in as admin
  signIn: (email, password) => Promise<void>;
  signOut: () => Promise<void>;
}
```

**Example:**
```typescript
const { admin, isAuthenticated, signOut } = useAuth();
```

---

### `adminAuthService`

Service for admin authentication operations.

**Location:** `src/core/supabase/adminAuth.ts`

#### `signInWithEmail(email, password)`

Authenticate admin with email/password.

**Steps:**
1. Authenticate with Supabase
2. Verify user is in `admin` table
3. If not admin, sign out and throw error
4. Return `{ user, admin, session }`

**Throws:** Error if authentication fails or user is not an admin

**Example:**
```typescript
const { user, admin, session } = await adminAuthService.signInWithEmail(
  'admin@example.com',
  'password123'
);
```

---

#### `getCurrentAdmin()`

Get current admin session (if any).

**Steps:**
1. Get session from Supabase (checks localStorage)
2. If no session, return null
3. Verify user is in `admin` table
4. Return `{ user, admin, session }` or null

**Returns:** `Promise<{ user, admin, session } | null>`

**Example:**
```typescript
const adminSession = await adminAuthService.getCurrentAdmin();
if (adminSession) {
  console.log('Logged in as:', adminSession.admin.email);
}
```

---

#### `signOut()`

Sign out current admin.

**Throws:** Error if sign out fails

**Example:**
```typescript
await adminAuthService.signOut();
```

---

#### `onAuthStateChange(callback)`

Subscribe to authentication state changes.

**Events:**
- `SIGNED_IN` - User signed in
- `SIGNED_OUT` - User signed out
- `TOKEN_REFRESHED` - Session token refreshed
- `USER_UPDATED` - User data updated

**Returns:** Subscription object with `unsubscribe()` method

**Example:**
```typescript
const { data: { subscription } } = adminAuthService.onAuthStateChange(
  (event, session) => {
    console.log('Auth event:', event);
  }
);

// Cleanup
subscription.unsubscribe();
```

---

### `ProtectedRoute`

Component that protects routes from unauthorized access.

**Props:**
```typescript
{
  children: React.ReactNode;  // Content to render if authenticated
}
```

**Behavior:**
- Shows loading spinner while checking auth
- Redirects to `/login` if not authenticated
- Renders children if authenticated

**Example:**
```typescript
<Route
  path="/admin"
  element={
    <ProtectedRoute>
      <AdminDashboard />
    </ProtectedRoute>
  }
/>
```

---

## Future Enhancements

### Planned Features

1. **Password Reset Flow**
   - "Forgot Password" link on login page
   - Email-based password reset via Supabase

2. **Multi-Factor Authentication (MFA)**
   - Optional 2FA for admin accounts
   - TOTP-based authentication

3. **Role-Based Access Control (RBAC)**
   - Different admin roles (super admin, org admin, etc.)
   - Permission-based feature access

4. **Session Management**
   - View active sessions
   - Remote logout from all devices
   - Session timeout warnings

5. **Audit Logging**
   - Log all admin authentication events
   - Track login/logout times
   - Security event monitoring

---

## Testing

### Manual Testing Checklist

- [ ] Fresh login with valid credentials → Success
- [ ] Fresh login with invalid credentials → Error shown
- [ ] Fresh login with non-admin user → Error shown
- [ ] Page reload while logged in → Stay logged in
- [ ] Logout → Redirect to login
- [ ] Access `/app` without login → Redirect to login
- [ ] Session persists across browser tabs
- [ ] Session expires after inactivity (if configured)

### Console Logs to Check

On successful page reload:
```
[AuthProvider] Initializing auth...
[adminAuth] Getting current session...
[AuthProvider] Auth state changed: SIGNED_IN session exists
[AuthProvider] Skipping event during initialization
[adminAuth] Session found for user: <uuid>
[adminAuth] Admin verified: <email>
[AuthProvider] Found existing admin session: <email>
[AuthProvider] Auth initialization complete
```

---

## Related Documentation

- [Admin Setup Guide](../../../ADMIN_SETUP_GUIDE.md) - How to create admin accounts
- [Supabase Docs](https://supabase.com/docs/guides/auth) - Supabase authentication
- [React Router Docs](https://reactrouter.com/) - Client-side routing

---

## Questions or Issues?

If you encounter issues with admin authentication:

1. Check the [Common Issues](#common-issues) section
2. Review console logs for errors
3. See `ADMIN_SETUP_GUIDE.md` for setup help
4. Check Supabase dashboard for RLS policy issues
