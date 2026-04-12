# Automatic Rescue Flow

## Overview

The **Automatic Rescue Flow** is a user experience feature that allows users who abandon the registration process mid-way to seamlessly resume where they left off when they return.

## Problem Statement

In the original registration flow, users could exit at any point during the multi-step process (signup → profile → photo). This created "orphaned" auth accounts:

- **Auth account created**: User completes Step 1 (email/password signup)
- **User exits**: User abandons registration before completing profile and photo
- **Orphan created**: `auth.users` record exists, but no corresponding `user` table record

When the user returns and tries to sign up again with the same email, they receive an error: "Email already registered." This creates frustration because they can't complete their registration, and the partially created account blocks them.

## Solution

The Automatic Rescue Flow detects when a returning user has an incomplete registration and seamlessly resumes their onboarding process.

### How It Works

```
User attempts signup with existing email
         │
         ├─ Error: "Email already exists"
         │
         ├─  SECURITY: Attempt sign-in with provided password
         │     │
         │     ├─ Sign-in FAILS → Show "Invalid credentials" (don't reveal email exists)
         │     │
         │     └─ Sign-in SUCCEEDS → Check onboarding status
         │           │
         │           ├─ onboarding_complete = true → Show "Account exists, please log in"
         │           │
         │           └─ onboarding_complete = false →  RESCUE
         │                 │
         │                 └─ Show "Welcome back! Let's finish setting up."
         │                       → Resume at profile step
```

## Database Schema

A new column tracks onboarding completion:

```sql
ALTER TABLE "user" ADD COLUMN onboarding_complete BOOLEAN DEFAULT false;
```

**Updated Flow:**

1. **Step 1 (Signup)**: Creates auth account + minimal `user` record with `onboarding_complete = false`
2. **Step 2 (Profile)**: Data stored locally (not yet persisted)
3. **Step 3 (Photo)**: Updates `user` record with full profile data + sets `onboarding_complete = true`

## Security Considerations

** CRITICAL**: The flow MUST authenticate the user before revealing any information about account existence.

### Why This Matters

**Email Enumeration Attack**: Attackers could try many emails to discover which ones have accounts in the system.

**Vulnerable Implementation** (DON'T DO THIS):

```typescript
//  BAD: Reveals if email exists before validating password
if (emailExists) {
  const isComplete = await checkOnboardingStatus(email);
  if (!isComplete) {
    showWelcomeBackMessage();
  }
}
```

**Secure Implementation** (CORRECT):

```typescript
// GOOD: Only reveals info after successful authentication
try {
  const user = await signIn(email, password); // MUST succeed first
  const isComplete = await checkOnboardingStatus(user.id);
  if (!isComplete) {
    showWelcomeBackMessage();
  }
} catch {
  // If sign-in fails, show generic error (don't reveal if email exists)
  showError("Invalid email or password");
}
```

### Implementation Details

See `src/features/registration/hooks/useRegistration.ts:handleSignUp()`:

1. Catch "email already exists" error from signup attempt
2. **MUST**: Attempt sign-in with provided credentials
3. **ONLY IF** sign-in succeeds: Check `onboarding_complete` status
4. If sign-in fails: Show generic "Invalid credentials" (prevents email enumeration)
5. If onboarding incomplete: Resume at profile step
6. If onboarding complete: Show "Account exists, please log in"

## User Experience

### Scenario 1: User abandons registration, returns later

**Without Automatic Rescue:**

- User tries to sign up again
- Gets error: "Email already registered"
- Frustrated, confused, may create duplicate account with different email

**With Automatic Rescue:**

- User tries to sign up again with same credentials
- Sees: "Welcome back! Let's finish setting up your account."
- Seamlessly continues to profile step
- Completes registration successfully

### Scenario 2: User tries to sign up with wrong password

**Secure behavior:**

- User enters existing email but wrong password
- System attempts sign-in (fails)
- Shows generic error: "Invalid email or password"
- Does NOT reveal whether email exists

### Scenario 3: User completed registration, forgot they have an account

**Friendly redirect:**

- User tries to sign up again
- System signs them in (password validated)
- Checks `onboarding_complete = true`
- Shows: "Account already exists. Please log in instead."
- Signs them out automatically

## Code References

### Database Migration

- `supabase/migrations/008_add_onboarding_complete.sql`

### Core Services

- `src/core/supabase/userRegistrationAuth.ts`
  - `createMinimalUserRecord()`: Creates initial user record on signup
  - `updateUserProfile()`: Updates user record with full data on completion
  - `signIn()`: Authenticates user for rescue flow
  - `checkOnboardingComplete()`: Queries onboarding status

### Registration Flow

- `src/features/registration/hooks/useRegistration.ts`
  - `handleSignUp()`: Implements rescue flow with security validation
  - `handlePhotoSubmit()`: Marks onboarding complete

## Future Enhancements

### Automatic Cleanup (Not in current implementation)

A scheduled function could periodically clean up truly orphaned accounts:

```sql
DELETE FROM auth.users
WHERE id NOT IN (SELECT id FROM "user")
  AND created_at < NOW() - INTERVAL '24 hours';
```

**Why 24 hours?**

- Gives users time to return and resume
- Prevents buildup of old orphans
- Only cleans accounts that were never completed

This cleanup is intentionally **not** in the current implementation to:

1. Avoid accidentally deleting active mid-registration users
2. Allow manual review of orphaned accounts
3. Gather metrics on abandonment rates

### OAuth Compatibility

When OAuth is implemented, the flow will handle it differently:

- **Email/Password**: Create auth → create minimal user → complete on photo
- **OAuth**: Create auth + complete user immediately (OAuth completes in one step)

The `onboarding_complete` flag still applies, but OAuth users skip the incremental approach since OAuth providers return all necessary data upfront.

## Testing Checklist

- [ ] New user completes full registration successfully
- [ ] User abandons at profile step, returns with correct credentials → resumes
- [ ] User abandons at profile step, returns with wrong credentials → generic error
- [ ] Completed user tries to sign up again → "Account exists" message
- [ ] Migration adds `onboarding_complete` column correctly
- [ ] Existing users marked as `onboarding_complete = true`
- [ ] No email enumeration vulnerability (wrong password doesn't reveal if email exists)

## Related Documentation

- `src/core/auth/README.md` - Admin authentication (separate from user registration)
- `ADMIN_SETUP_GUIDE.md` - Admin account management
- `README.md` - Project overview
