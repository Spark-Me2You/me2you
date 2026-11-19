# Clothesline

The clothesline (`src/features/clothesline/`, opened from the hub's main room) is a photo booth: a
visitor takes a picture, the kiosk cuts their clothes out of it, and the cutouts hang on a
community line for everyone in the org to see. A visitor can scan a QR code to claim their
clothes and wear the top on their mii.

```
ClotheslineView                 ← stages: line → booth → review → hung; HubView renders it
  components/ClotheslineWall    ← the ropes of GarmentPegs; garments can be dragged
  components/PhotoBooth         ← live camera, 3-2-1, capture
  components/ReviewGarments     ← keep / toss each piece before anything is saved
  components/HungUp             ← confirmation + claim QR
  components/MyClothes          ← mobile wardrobe on /user/customize
cv/garmentMask.ts               ← which pixels are a garment (pure, tested)
cv/garmentCutout.ts             ← mask → transparent PNG
cv/clothesSegmenter.ts          ← MediaPipe models + the capture pipeline
services/clotheslineStore.ts    ← the one store the UI talks to
utils/topPlacement.ts           ← where a top sits on the mii body (pure, tested)
utils/lineLayout.ts             ← garment spots on the wall's ropes (pure, tested)
```

## Where it shows up

| Place | What |
|---|---|
| Hub, main room | A short rope of recent garments in the top-right corner (decoration, not interactive), with the "clothesline" button (`bg-action-clothesline`) under it |
| Clothesline screen | The full line, how-it-works note, "add my outfit". "network" goes back to the hub's main room |
| Hub walkers | Each mii wears the top its user equipped |
| Phone, customize avatar | "my clothes": wear / take off a top, delete anything you claimed |

## Dragging garments on the line

Garments on the clothesline screen can be picked up and moved along a rope or onto another one,
by mouse, touch or a CV hand pinch (`ClotheslineWall`). A hand press follows the live pinch
from `cursorStateRef` and ignores the overlay's synthetic `pointerup`, like walker dragging in
the hub (it reuses `HAND_RELEASE_GRACE_MS`). Positions are kept only while the screen is open;
they aren't saved, so the line goes back to newest-first next time.

## Privacy: what the cutout keeps

The rule is that **only clothing pixels leave the browser**. The photo itself is never uploaded
or stored; the frame canvas is wiped as soon as the cutouts are made.

`extractGarments` (in `cv/garmentMask.ts`) builds the mask from MediaPipe `selfie_multiclass`
categories and is deliberately conservative:

1. Only pixels labelled **clothes** are candidates. Background, hair, body skin, face skin and
   "others" are never copied.
2. Everything at or above the **chin line** is dropped (bottom of the face-skin region plus a
   margin, or the pose shoulder line if no face skin was found). If neither can be found the
   capture is **rejected** rather than guessed.
3. Clothes pixels within a guard radius of hair, face or skin are cleared, so soft mask edges
   can't carry a sliver of neck, hand or hair.
4. The mask is eroded, and only the largest connected blob in each half is kept, which drops
   stray specks (and most other people in the background).
5. The cutout's RGB is zeroed wherever alpha is 0, so nothing hides in transparent pixels.

These invariants are covered by `cv/garmentMask.test.ts`. Change them with care.

What the model **cannot** remove, and the review step exists for: name tags, lanyards and ID
badges, printed names or logos on a shirt, and the overall body silhouette. The review screen
tells visitors to check and lets them toss either piece or walk away with nothing saved.

Top and bottom are split at the pose landmarker's hip line. Dresses, coats and jumpsuits come
out as one "top". Only tops can be worn on a mii; bottoms just hang on the line.

## Storage backends

`clotheslineStore` implements `GarmentStore` (`services/garmentStore.ts`) for the backend named
by `VITE_CLOTHESLINE_BACKEND`:

| Backend | Where garments live | Claim + wear |
|---|---|---|
| `local` (default) | This browser's IndexedDB; 60 garments max, gone after 24 h | No. The kiosk shows a "coming soon" note instead of a QR |
| `supabase` | `garments` table + private `garments` bucket | Yes |

The local backend exists so the kiosk flow can be tried before the database changes are applied.
Garments stay on that one device and phones never see them.

### Turning on the Supabase backend

Nothing here has been applied to the remote project. To switch over:

1. `supabase db push` (applies `034_clothesline.sql`)
2. `supabase functions deploy claim-garment`
3. `npm run gen:types`, commit the result, then delete the `db` cast in
   `services/supabaseGarmentStore.ts` (marked `TODO(clothesline)`)
4. Set `VITE_CLOTHESLINE_BACKEND=supabase`

Note that `supabase db push` applies every pending migration, so 034 goes out with whatever is
pushed next. Hold the file back if the feature isn't ready.

The number 034 leaves room for 027–032 (PR #149) and 033 (in progress) ahead of it. Apply those
first: if 034 reaches the remote before them, a later `db push` refuses the lower numbers unless
run with `--include-all`. PR #149 also adds payload validation to `generate-claim-token`
(`supabase/functions/_shared/claimPayload.ts`) that rejects unknown types, so it needs a
`garment` case (`data.garment_ids`: non-empty array of uuids) or the hung-up QR stops working.

### Schema (migration 034)

- `garments`: `id, org_id, owner_id (null until claimed), kind ('top'|'bottom'), image_path,
  width, height, created_at, expires_at`. Unclaimed rows expire after 24 h and stop being
  readable; claiming clears `expires_at`.
- `accessories.equipped_garment_id`: the top a mii wears. A trigger rejects anything that isn't
  a top owned by that user; deleting the garment sets it back to null.
- RLS: kiosks insert anonymous rows for their own org and upload under `<org_id>/`; org members
  and kiosks read the line; owners delete their own; admins can delete anything in their org.
  There is no client UPDATE: claiming is done by `claim-garment` with the service role.

### Claim flow

Same shape as DrawIt drawings. `HungUp` asks `ClaimSection` for a token with payload
`{ type: 'garment', data: { garment_ids } }`. On the phone, `ClaimPage` sees the type, calls
`claimService.executeGarmentClaim` → `claim-garment`, which spends the token and sets
`owner_id` on those garments only if they are unowned and in the caller's org, then sends the
user to `/user/customize`.

## Follow-ups

- **Sweeping storage.** Expired unclaimed garments are hidden by RLS but their rows and files
  stay. So do files whose row insert failed, and files of users who delete their account (the
  rows cascade, the files don't). A scheduled cleanup function should remove these.
- **Realtime.** The line refreshes when this browser changes it, not when another kiosk does.
- **Profile page.** The worn top shows in the hub and on the customize page, not yet on
  `/user/profile`.
- **Bottoms on the mii.** The body sprite has no separate legs to dress.
- **Tuning.** `MII_TOP_FIT`, the hub rope position and the hub's clothesline button were set
  without a kiosk to look at; check them on the real screen.
