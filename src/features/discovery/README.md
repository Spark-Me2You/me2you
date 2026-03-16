# Discovery Feature - Random Image Display

## Overview

The Discovery feature enables kiosk users to view random public images from their organization by showing a peace sign gesture. This creates an interactive, gesture-based browsing experience for exploring community profiles.

**Key Features:**
- Gesture-activated image display (peace sign / Victory gesture)
- Random selection from organization's public images
- Displays image with owner's display name and bio
- Automatic cleanup on gesture release
- Private bucket support with signed URLs
- Comprehensive error handling

---

## Architecture

### Component Hierarchy

```
DiscoveryView (Container)
├── CameraView (Left Side)
│   ├── useCamera (Camera stream)
│   └── useGestureRecognition (MediaPipe hand detection)
└── ImagePlaceholder (Right Side)
    └── Displays: Image + Owner Info
```

### Data Flow

```
1. Camera → MediaPipe → Gesture Detection
2. Gesture = "Victory" → Trigger Fetch
3. DiscoveryService → Database Query (image JOIN user)
4. Random Selection → Storage Service
5. Signed URL Generation → ImagePlaceholder
6. Display Image + Bio
7. Gesture Release → Clear Image
```

---

## How It Works

### Step-by-Step Flow

#### 1. Gesture Detection
**File:** `hooks/useGestureRecognition.ts`

- MediaPipe GestureRecognizer processes video frames
- Detects hand gestures in real-time
- Peace sign recognized as "Victory" gesture
- Returns: `{ gestureName: 'Victory', confidence: 0.95, handedness: 'Right' }`

#### 2. State Management
**File:** `components/DiscoveryView.tsx`

**State:**
```typescript
const [imageData, setImageData] = useState<RandomImageData | null>(null);
const [isLoadingImage, setIsLoadingImage] = useState(false);
const [imageError, setImageError] = useState<string | null>(null);
```

**Effect 1: Fetch on Peace Sign**
```typescript
useEffect(() => {
  if (detectedGesture?.gestureName === 'Victory' && kioskOrgId) {
    if (!imageData && !isLoadingImage) {
      // Fetch random image
      discoveryService.fetchRandomImage(kioskOrgId);
    }
  }
}, [detectedGesture, kioskOrgId, imageData, isLoadingImage]);
```

**Effect 2: Clear on Gesture Release**
```typescript
useEffect(() => {
  if (detectedGesture?.gestureName !== 'Victory' && imageData) {
    // Clear image data to allow new fetch on next peace sign
    setImageData(null);
    setImageError(null);
  }
}, [detectedGesture, imageData]);
```

#### 3. Database Query
**File:** `services/discoveryService.ts`

**SQL Equivalent:**
```sql
SELECT
  image.id,
  image.owner_id,
  image.org_id,
  image.storage_path,
  image.category,
  image.is_public,
  image.created_at,
  user.id,
  user.display_name,
  user.bio
FROM image
JOIN user ON image.owner_id = user.id
WHERE image.org_id = :kioskOrgId
  AND image.is_public = true
```

**Supabase Query:**
```typescript
const { data, error } = await supabase
  .from('image')
  .select(`
    id, owner_id, org_id, storage_path, category, is_public, created_at,
    user (id, display_name, bio)
  `)
  .eq('org_id', orgId)
  .eq('is_public', true);
```

**Key Points:**
- Joins `image` and `user` tables (requires FK: `image.owner_id` → `user.id`)
- Filters by kiosk's organization
- Only returns public images (`is_public = true`)
- RLS policies enforce org-scoped access

#### 4. Random Selection
**File:** `services/discoveryService.ts`

```typescript
const randomIndex = Math.floor(Math.random() * data.length);
const selectedImage = data[randomIndex];
```

**Strategy:**
- Client-side random selection
- Simple, truly random each time
- No duplicate tracking (user requirement)
- Efficient for small-to-medium datasets

**Alternative (for large datasets):**
```sql
-- Server-side random (not implemented)
ORDER BY random() LIMIT 1
```

#### 5. Signed URL Generation
**File:** `core/supabase/storage.ts`

```typescript
const { data, error } = await supabase.storage
  .from('images')
  .createSignedUrl(path, 3600); // 1 hour expiry

return data.signedUrl;
```

**Why Signed URLs?**
- Works with **private buckets** (security requirement)
- Temporary access (1-hour expiry)
- RLS policies control who can generate URLs
- URLs include authentication token

**Storage Path Format:**
```
{org_id}/{user_id}/{filename}
```

**Example:**
```
6c0b2dc3-6a80-4ec9-849f-547ca89483fd/e5e91888-5d9a-423f-9129-8d0c37762c83/test1.jpg
```

**Generated Signed URL:**
```
https://hgjybsryjxbmohbncvmc.supabase.co/storage/v1/object/sign/images/6c0b2dc3-6a80-4ec9-849f-547ca89483fd/e5e91888-5d9a-423f-9129-8d0c37762c83/test1.jpg?token=...
```

#### 6. Display Image
**File:** `components/ImagePlaceholder.tsx`

**4 Display States:**

1. **Default** - No gesture detected
   - Shows: "Show a peace sign! ✌️"
   - Gray background, dashed border

2. **Loading** - Peace sign detected, fetching image
   - Shows: "Loading image..."
   - Gray background, dashed border

3. **Error** - Fetch failed or no images available
   - Shows: Error message
   - Yellow background (#fff3cd)
   - Instruction: "Try showing the peace sign again"

4. **Success** - Image loaded
   - Shows: Image + owner info
   - Green border (#4caf50)
   - Layout: Image above, name + bio below

**UI Layout:**
```
┌───────────────────────────────────┐
│                                   │
│                                   │
│         [Image Display]           │
│       (objectFit: contain)        │
│                                   │
│                                   │
├───────────────────────────────────┤
│ John Doe                          │ ← display_name (1.5rem)
│ Computer science student          │ ← bio (1rem, optional)
│                                   │
│ Right hand • 95% confidence       │ ← Debug info (0.75rem)
└───────────────────────────────────┘
```

---

## Database Schema

### Tables

**image**
```sql
CREATE TABLE image (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id uuid NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    org_id uuid NOT NULL REFERENCES organization(id) ON DELETE CASCADE,
    storage_path text NOT NULL UNIQUE,
    category text NOT NULL DEFAULT 'uncategorized',
    is_public boolean DEFAULT false,
    created_at timestamptz NOT NULL DEFAULT now()
);
```

**user**
```sql
CREATE TABLE "user" (
    id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    org_id uuid REFERENCES organization(id) ON DELETE SET NULL,
    username text NOT NULL,
    display_name text NOT NULL,
    bio text,
    visibility text DEFAULT 'public',
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);
```

### Foreign Key Relationship

**Migration:** `006_add_image_user_foreign_key.sql`

```sql
ALTER TABLE image
ADD CONSTRAINT image_owner_id_user_fkey
FOREIGN KEY (owner_id)
REFERENCES "user"(id)
ON DELETE CASCADE;
```

**Purpose:** Enables Supabase to automatically join `image` and `user` tables.

---

## Row Level Security (RLS)

### Image Table Policy

**Migration:** `003_new_kiosk_policies.sql`

```sql
CREATE POLICY "Kiosk can view images in their org"
ON image FOR SELECT
TO authenticated
USING (
  (auth.jwt() -> 'app_metadata' ->> 'is_kiosk')::boolean = true
  AND org_id = (auth.jwt() -> 'app_metadata' ->> 'org_id')::uuid
);
```

**Enforcement:**
- Kiosk users can only see images from their organization
- `org_id` verified from JWT `app_metadata` (server-signed, tamper-proof)
- Even if client tries to query other orgs, database blocks it

### Storage Bucket Policy

**File:** `supabase/policies.md`

```sql
CREATE POLICY "Kiosk can view images in their org"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'images'
  AND (storage.foldername(name))[1] = (auth.jwt() -> 'app_metadata' ->> 'org_id')::text
  AND (auth.jwt() -> 'app_metadata' ->> 'is_kiosk')::boolean = true
);
```

**Enforcement:**
- Kiosk can only generate signed URLs for images in their org folder
- Folder structure: `images/{org_id}/{user_id}/{filename}`
- First folder level `[1]` must match kiosk's org_id

---

## Type Definitions

**File:** `types/image.ts`

### ImageRecord
```typescript
export interface ImageRecord {
  id: string;                  // UUID
  owner_id: string;            // User who owns the image
  org_id: string;              // Organization ID
  storage_path: string;        // Path in storage bucket
  category: string;            // e.g., 'profile', 'uncategorized'
  is_public: boolean;          // Public visibility flag
  created_at: string;          // ISO timestamp
}
```

### UserProfile
```typescript
export interface UserProfile {
  id: string;                  // UUID
  display_name: string;        // User's display name
  bio: string | null;          // User's bio (optional)
}
```

### RandomImageData
```typescript
export interface RandomImageData {
  image: ImageRecord;          // Image metadata from database
  owner: UserProfile;          // Owner's profile information
  imageUrl: string;            // Signed URL to access the image
}
```

---

## Error Handling

### Database Errors
**Location:** `discoveryService.fetchRandomImage()`

**Scenarios:**
- Network failure
- RLS policy blocks access
- Invalid SQL query
- Missing foreign key relationship

**Handling:**
```typescript
if (error) {
  console.error('[discoveryService] Database query failed:', error);
  throw new Error(`Failed to fetch images: ${error.message}`);
}
```

**UI Impact:** ImagePlaceholder shows error state with message.

### No Images Available
**Location:** `discoveryService.fetchRandomImage()`

**Scenario:** Query succeeds but returns no results.

**Handling:**
```typescript
if (!data || data.length === 0) {
  console.log('[discoveryService] No public images found for org:', orgId);
  return null; // Not an error, just no data
}
```

**UI Impact:** Shows "No images available in your organization".

### Storage URL Generation Errors
**Location:** `storageService.getPhotoUrl()`

**Scenarios:**
- Empty path
- Invalid path
- Bucket not found
- RLS blocks signed URL creation

**Handling:**
```typescript
if (error || !data || !data.signedUrl) {
  throw new Error(`Failed to generate signed URL: ${error?.message}`);
}
```

**UI Impact:** Propagates to ImagePlaceholder error state.

### Image Load Errors
**Location:** `ImagePlaceholder` component

**Scenarios:**
- Broken image URL (404)
- Network timeout
- CORS issues
- Invalid image format

**Handling:**
```typescript
<img
  src={imageData.imageUrl}
  onError={(e) => {
    console.error('[ImagePlaceholder] Failed to load image:', imageData.imageUrl);
    (e.target as HTMLImageElement).style.display = 'none';
  }}
/>
```

**UI Impact:** Image element hidden, user info still displays.

### Missing Auth Context
**Location:** `DiscoveryView` useEffect

**Scenario:** `kioskOrgId` is null (shouldn't happen in normal flow).

**Handling:**
```typescript
if (!isPeaceSign || !kioskOrgId) {
  return; // Early exit, don't fetch
}
```

**UI Impact:** ImagePlaceholder stays in default state.

---

## Performance Considerations

### Debouncing
**Problem:** Peace sign gesture is detected ~24 times per second (FPS).

**Solution:** State-based debouncing in `DiscoveryView`:
```typescript
// Only fetch if we don't already have data
if (imageData || isLoadingImage) {
  return; // Skip fetch
}
```

**Result:** Only one fetch per peace sign gesture, even if held for multiple seconds.

### Random Selection
**Current:** Client-side random selection
```typescript
const randomIndex = Math.floor(Math.random() * data.length);
```

**Performance:**
- Fast for small-to-medium datasets (<100 images)
- Loads all image IDs into memory

**Alternative (for large datasets):**
Server-side random via PostgreSQL:
```typescript
.order('created_at', { ascending: false }) // Can't use random() in JS client
// Would need raw SQL or database function
```

### Signed URL Expiry
**Expiry:** 1 hour (3600 seconds)

**Implications:**
- URLs valid for entire kiosk session
- No need to regenerate on every peace sign
- Could implement caching (not done due to "random every time" requirement)

---

## Security Architecture

### Authentication Layers

**Layer 1: Kiosk Session**
- Admin logs in, mints kiosk session for specific org
- JWT contains: `{ is_kiosk: true, org_id: 'uuid' }`
- JWT is server-signed (cannot be tampered with)

**Layer 2: Database RLS**
- All queries filtered by JWT `org_id`
- Even if client tries to query other orgs, database blocks it

**Layer 3: Storage RLS**
- Signed URLs can only be generated for files in kiosk's org folder
- Folder structure enforces org isolation

### Private Bucket Advantage

**Public Bucket:**
- URLs predictable: `/images/{org_id}/{user_id}/{filename}`
- Anyone with URL can access (if RLS allows)
- Simpler, faster

**Private Bucket (Current Implementation):**
- URLs include authentication token
- Tokens expire after 1 hour
- Unpredictable URLs
- Better security posture

### Threat Model

**Prevented:**
- ✅ Kiosk accessing other org's images (RLS + folder structure)
- ✅ Unauthenticated access (private bucket + signed URLs)
- ✅ JWT tampering (server-signed)
- ✅ Direct storage access (RLS policies)

**Not Prevented (Acceptable):**
- ⚠️ Kiosk user sharing signed URL with someone (expires in 1 hour)
- ⚠️ User taking photo of screen (physical security issue)

---

## Testing Guide

### Prerequisites
1. Kiosk session minted for an organization
2. Storage bucket "images" exists (private bucket)
3. At least one image uploaded with `is_public = true`
4. Foreign key relationship `image.owner_id` → `user.id` exists

### Manual Testing

**Happy Path:**
1. Navigate to Discovery feature (`/app` in kiosk mode)
2. Show peace sign gesture with either hand
3. **Expected:** "Loading image..." appears
4. **Expected:** Random image displays with owner's name and bio
5. Release peace sign
6. **Expected:** Image clears
7. Show peace sign again
8. **Expected:** New random image appears (may be same image, that's OK)

**Edge Cases:**

**No Public Images:**
1. Set all images to `is_public = false` in database
2. Show peace sign
3. **Expected:** "No images available in your organization"

**User with No Bio:**
1. Create user with `bio = null`
2. Upload image for that user
3. Show peace sign (may need multiple tries to get that user's image)
4. **Expected:** Only display_name shows, no bio section

**Broken Image URL:**
1. Corrupt `storage_path` in database (e.g., change filename)
2. Show peace sign
3. **Expected:** Image fails to load (hidden), but user info still displays

**Network Error:**
1. Disconnect network
2. Show peace sign
3. **Expected:** Error message "Failed to fetch images: ..."

**Rapid Gestures:**
1. Show peace sign → release → show again quickly
2. **Expected:** First image clears, new image loads

### Console Logging

**Normal Flow:**
```
[DiscoveryView] Fetching random image for org: 6c0b2dc3-6a80-4ec9-849f-547ca89483fd
[discoveryService] Random image selected: 4ca1f92c-b076-4810-b21e-049ae4154a39 from 5 available images
[DiscoveryView] Image fetched: 4ca1f92c-b076-4810-b21e-049ae4154a39
[DiscoveryView] Peace sign released, clearing image
```

**Error Flow:**
```
[DiscoveryView] Fetching random image for org: 6c0b2dc3-6a80-4ec9-849f-547ca89483fd
[discoveryService] Database query failed: [error details]
[discoveryService] fetchRandomImage failed: Error: Failed to fetch images: ...
[DiscoveryView] Fetch failed: Error: Failed to fetch images: ...
```

**No Images:**
```
[DiscoveryView] Fetching random image for org: 6c0b2dc3-6a80-4ec9-849f-547ca89483fd
[discoveryService] No public images found for org: 6c0b2dc3-6a80-4ec9-849f-547ca89483fd
[DiscoveryView] No images available
```

---

## Troubleshooting

### Issue: "Bucket not found"

**Symptoms:** Error in console: `{"statusCode":"404","error":"Bucket not found"}`

**Diagnosis:**
1. Check bucket exists in Supabase Storage dashboard
2. Verify bucket name is exactly "images" (lowercase)
3. Check if bucket is private (expected) or public

**Solution:** Bucket exists but is private → code already uses signed URLs (correct).

### Issue: "Could not find a relationship between 'image' and 'owner_id'"

**Symptoms:** Database query fails with relationship error.

**Diagnosis:** Missing foreign key constraint.

**Solution:** Apply migration `006_add_image_user_foreign_key.sql`:
```sql
ALTER TABLE image
ADD CONSTRAINT image_owner_id_user_fkey
FOREIGN KEY (owner_id)
REFERENCES "user"(id)
ON DELETE CASCADE;
```

### Issue: Images not displaying, "Failed to load image"

**Symptoms:** Image element triggers `onError` handler.

**Diagnosis:**
1. Check `storage_path` in database matches actual file path
2. Verify file exists in Supabase Storage
3. Check signed URL generation succeeded
4. Try accessing signed URL directly in browser

**Solution:** Ensure `storage_path` format is `{org_id}/{user_id}/{filename}` (no `files/buckets/images/` prefix).

### Issue: Peace sign not detected

**Symptoms:** Gesture detection shows other gestures but not "Victory".

**Diagnosis:**
1. Check MediaPipe model loaded successfully
2. Verify gesture confidence threshold (default: 0.5)
3. Try different hand positions
4. Check console for MediaPipe errors

**Solution:**
- Hold hand steadier
- Increase lighting
- Check `mediapipe-config.ts` for confidence thresholds

### Issue: Same image every time

**Symptoms:** Random selection always returns same image.

**Diagnosis:** Only one public image in database.

**Solution:** Add more images with `is_public = true`.

---

## Future Enhancements

### 1. Duplicate Tracking
**Current:** Truly random (can show same image twice)

**Enhancement:** Track shown image IDs in session
```typescript
const [shownImageIds, setShownImageIds] = useState<string[]>([]);

// In query:
.not('id', 'in', `(${shownImageIds.join(',')})`)
```

**Trade-off:** Eventually exhausts all images, need reset logic.

### 2. Image Preloading
**Current:** Fetches on peace sign (user sees loading state)

**Enhancement:** Prefetch next random image in background
```typescript
useEffect(() => {
  if (!imageData && !isLoadingImage && kioskOrgId) {
    discoveryService.fetchRandomImage(kioskOrgId).then(setImageData);
  }
}, [imageData, isLoadingImage, kioskOrgId]);
```

**Trade-off:** More API calls, may prefetch same image twice.

### 3. Server-Side Random Selection
**Current:** Client-side `Math.random()` (loads all IDs)

**Enhancement:** PostgreSQL `ORDER BY random() LIMIT 1`
```typescript
// Would need database function or raw SQL
```

**Trade-off:** More efficient for large datasets, but different error handling.

### 4. Image Caching
**Current:** No caching (random every time)

**Enhancement:** Cache signed URLs in state/localStorage

**Trade-off:** Contradicts "random every time" requirement.

### 5. Gesture Cooldown
**Current:** Can show peace sign immediately after release

**Enhancement:** Force 2-3 second cooldown between fetches

**Trade-off:** Less responsive, but prevents rapid repeated requests.

---

## API Reference

### discoveryService

```typescript
import { discoveryService } from '@/features/discovery';

// Fetch random image
const imageData = await discoveryService.fetchRandomImage(orgId);

// Returns:
// - RandomImageData if images found
// - null if no images available
// - throws Error if query fails
```

### storageService

```typescript
import { storageService } from '@/core/supabase';

// Get signed URL for image
const signedUrl = await storageService.getPhotoUrl(storagePath);

// Returns:
// - Signed URL string (expires in 1 hour)
// - throws Error if path invalid or generation fails
```

### useAuth Hook

```typescript
import { useAuth } from '@/core/auth';

const { kioskOrgId } = useAuth();

// Returns:
// - string: Organization ID for kiosk session
// - null: Not in kiosk mode or unauthenticated
```

---

## File Reference

### Core Files
- `types/image.ts` - TypeScript type definitions
- `services/discoveryService.ts` - Business logic for fetching images
- `components/DiscoveryView.tsx` - Container component with state management
- `components/ImagePlaceholder.tsx` - UI component for displaying images
- `hooks/useGestureRecognition.ts` - MediaPipe gesture detection

### Supporting Files
- `core/supabase/storage.ts` - Storage service for signed URLs
- `core/supabase/client.ts` - Supabase client initialization
- `core/auth/AuthContext.tsx` - Authentication context (provides kioskOrgId)

### Database
- `supabase/migrations/001_initial_schema.sql` - Initial tables
- `supabase/migrations/003_new_kiosk_policies.sql` - Kiosk RLS policies
- `supabase/migrations/006_add_image_user_foreign_key.sql` - Foreign key relationship
- `supabase/policies.md` - Storage bucket policies

---

## Related Documentation

- **Kiosk Authentication:** `src/core/auth/KIOSK_AUTH.md`
- **Admin Setup:** `ADMIN_SETUP_GUIDE.md`
- **Project Overview:** `README.md`
- **Main Architecture:** `.claude/CLAUDE.md`

---

**Last Updated:** 2026-03-16
**Version:** 1.0.0
