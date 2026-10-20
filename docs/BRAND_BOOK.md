# me2you Brand Book

How me2you looks and sounds, and how to build that in code. The source of truth for values is
`src/styles/theme.css` (`@theme`). This doc explains **when** to use each token. If the two
disagree, fix whichever is wrong in the same PR.

Derived from the three anchor screens: **Home** (`kiosk/components/IdleScreen.tsx`),
**Discovery** (`discovery/components/DiscoveryView.tsx` and its profile view) and **Hub**
(`hub/HubView.tsx`, which shares `ProfileCardView`).

---

## 1. Personality

me2you is a **friendly digital scrapbook**: bright saturated color on a sky-to-cream background,
frosted-glass panels, and paper pieces (corkboard, sticky notes, polaroids, tape) pinned at
slight angles. Ozzy the otter is the guide.

| Principle | In practice |
|---|---|
| Playful, not childish | Saturated hues and tilted cards, but clean layouts and generous space |
| Handmade | Paper textures, tape strips, small rotations (±2–9°), hand-drawn arrows |
| Readable from across the room | Kiosk type is large (18–78px at 1920×1080) with wide tracking |
| One hue per destination | Users learn "orange = discover" and can find it again |

### Voice

- **all lowercase** for UI copy: `discover`, `scan to join!`, `confused?`
- Short, warm, second person: `see yourself & others!`, `have fun!`
- Casual shorthand is on-brand in moderation: `nice2meetu ;)`, `info!!`
- Exceptions: user-entered content (names, status) is shown exactly as typed. Error messages
  may use sentence case for clarity.

---

## 2. Color

Two tiers. **Use a role when one fits; fall back to the palette only when none does.** Never
write a hex or `rgba()` in a component for a color that has a token.

### Palette

| Token | Value | Swatch use |
|---|---|---|
| `orange` | `#e44805` | Discover, profile label chips, primary buttons |
| `orange-dark` | `#b8360a` | Hover/pressed state of orange |
| `purple` | `#7105e4` | Games, the Discovery pose banner (`/57`) |
| `blue` | `#1405e4` | Network (Hub) |
| `lime` | `#d3e405` | Help, speech bubble, highlight borders |
| `lime-dark` | `#b8c704` | Hover/pressed state of lime |
| `magenta` | `#e405ac` | Tape, QR frames, info button, the name "ozzy" |
| `magenta-dim` | `#b0006a` | Disabled magenta (admin login) |
| `sky` | `#58e7f7` | Top of the page gradient, exit button border |
| `cream` | `#fefffb` | Bottom of the page gradient |
| `red` | `#ff0000` | Exit button only |
| `violet` | `#7c5cff` | Dwell-to-click progress ring |
| `snow` | `#fff5f5` | Text on orange cards |
| `note` | `#ffeeb0` | Sticky notes |
| `polaroid` | `#ede8d0` | Polaroid cards |
| `ink` | `#000000` | Default text on light surfaces |
| `ink-soft` | `#1a1a1a` | Long-form text, tooltips |
| `ink-muted` | `#666666` | Loading and empty-state text |
| `green` | `#22c55e` | Progress/success |

### Roles

| Role | Points at | Use for |
|---|---|---|
| `action-discover` / `-games` / `-network` | orange / purple / blue | The three Home destinations and anything that brands them |
| `action-help` | lime | `?` help buttons |
| `action-exit` | red | Exit / back buttons (`ExitButton`) |
| `tape` / `tape-alt` | magenta / lime | Tape strips on paper pieces |
| `glass` | white 13% | Frosted-glass panels |
| `scrim` | black 60% | Behind modals and popups |
| `scrim-slate` | slate 78% | Behind the Home "about" overlay |
| `gradient-start` / `-end` | sky / cream | Page background (via `bg-page-gradient`) |
| `error` | `#b0003a` | Error text and states |
| `success` | green | Timers, success states |

### Translucency

Use Tailwind's opacity modifier on a token instead of a new `rgba` value:
`bg-action-network/93`, `bg-magenta/93`, `bg-purple/57`, `bg-orange/92`, `bg-tape-alt/68`.
The `/93` level is the standard for solid-looking brand buttons that let a hint of the
background through.

### Page background

`bg-page-gradient` (sky → cream, top to bottom). `body` already has it, so full-screen views
only need it when they paint their own opaque layer.

Game screens use `bg-games-gradient` instead (`action-games` purple → `blue`), which stays dark
enough for white text from top to bottom.

### Accessibility

White text on `orange`, `purple`, `blue`, `magenta` and `red` is fine at kiosk sizes. On `lime`,
`note`, `polaroid` and `glass`, use `ink`, never white.

---

## 3. Typography

| Family | Token | Role |
|---|---|---|
| Jersey 10 | `font-jersey` | **Display**: titles, button labels, names, chips |
| Averia Libre | `font-averia` | **Body**: friendly copy, instructions, subtitles, speech bubbles |
| Andale Mono | `font-mono` | **Typed**: text a user entered (status, interests) |

Exceptions that are allowed but should not spread:

- `font-pixelify` (Pixelify Sans): the `games` menu title only.
- `font-jersey-arial`: mobile user pages (Jersey with an Arial fallback).
- `font-handwritten` (Caveat): one label on the admin org selector.

Don't add new families. Barlow Condensed was dropped as unused.

### Tracking

The signature look is **wide lowercase tracking at 0.17em**. Use `tracking-brand` for Jersey and
Averia headings, buttons and callouts at every size. Small UI text (≤ 22px) can use tighter
values; user-typed mono text uses `tracking-[-0.72px]`.

### Kiosk type scale

Sizes are in design pixels on the 1920×1080 kiosk canvas.

### Text shadows

| Token | Use |
|---|---|
| `text-shadow-games` | The Pixelify `games` title: soft drop + lime and magenta offsets |
| `text-shadow-pop` | Hard 4px offset under big game text (titles, countdown, scores) |

| Token | Size | Use |
|---|---|---|
| `text-display-xl` | 78px | Menu button titles, page titles (`about`) |
| `text-display-lg` | 60px | Corkboard and popup titles |
| `text-display-md` | 46px | Pill buttons (`info!!`) |
| `text-body-xl` | 35px | Speech bubbles, button subtitles |
| `text-body-lg` | 25px | Corkboard card copy |
| `text-body-md` | 18px | Notes, help bullets, typed values |

Sizes in between (53, 32, 28, 22px) still exist on the anchor screens as arbitrary values.
Reach for a scale step first in new work. Fluid sizes on non-scaled views use
`text-[clamp(min,vw,max)]`.

---

## 4. Shape and elevation

### Radii

| Token | Value | Use |
|---|---|---|
| `rounded-glass` | 46px | Pill cards, menu buttons, QR frames, speech bubbles |
| `rounded-btn` | 13px | Rectangular buttons (exit) |
| `rounded-tag` | 10px | Chips, namecards, small inputs, small buttons |
| `rounded-full` | | Circular icon buttons (`?`) |

### Shadows

| Token | Use |
|---|---|
| `shadow-glass-card` | **Default for any brand panel or button**: drop + inner edge + white glow |
| `shadow-glass` | Same layers, older order; used by mobile glass cards |
| `shadow-glass-inset` | Glass sheen overlaid on a card that already has a drop |
| `shadow-drop` | Plain drop: exit button, envelopes |
| `shadow-well` | Recessed white well holding a photo or a typed value |
| `shadow-note` | Sticky notes and paper on the corkboard |
| `shadow-tape` | Tape strips |

---

## 5. Motifs

| Motif | Recipe |
|---|---|
| **Glass panel** | `bg-glass shadow-glass-card rounded-glass`, optionally rotated a couple of degrees |
| **Menu pill button** | `rounded-glass shadow-glass-card bg-action-*` + `font-jersey text-display-xl tracking-brand lowercase text-white` title, `font-averia text-body-xl` subtitle |
| **Sticky note** | `bg-note shadow-note rounded-[6px]`, `font-averia text-ink`, tape on top |
| **Polaroid** | `bg-polaroid` + `polaroid_frame1.svg` overlay + tape |
| **Tape** | `absolute bg-tape` (or `bg-tape-alt/68`), ~90×22px, rotated ±3–6°, `shadow-tape` |
| **Corkboard** | `corkboard.png` behind tutorial and help content |
| **Label chip** | `bg-orange` + `font-jersey tracking-brand text-ink`, square corners |
| **Photo well** | `bg-white shadow-well` with a large radius |
| **QR tab** | `PinnedRegistrationQR`: `bg-magenta/93 shadow-glass-card`, half-rounded on the inner edge |
| **Ozzy** | `otter_default_rough_draft.png` (full) and `hand.png` (pointing at the QR) |
| **Arrows** | `arrow2.svg` and `pink_back_arrow.svg`, rotated to point at the target |

### Game screens

Recipes live in `src/features/games/components/gameUi.ts`; import them rather than restyling.

| Piece | Recipe |
|---|---|
| Background | `bg-games-gradient` |
| Title (`GAME_TITLE`) | `font-jersey text-[160px] tracking-brand lowercase text-white text-shadow-pop` |
| Buttons (`BTN_LG` / `BTN_MD`) | Glass-card pills, `tracking-brand lowercase`, `hover:scale-105` |
| Primary (`BTN_PRIMARY`) | `bg-lime text-ink`: the one main action per screen (start, submit, claim) |
| Secondary (`BTN_SECONDARY`) | `bg-glass` + white/40 border, white text: back, discard, gallery |
| Panel (`GAME_PANEL`) | Glass panel with blur: leaderboards, the DrawIt toolbox |
| Game over (`GAME_OVER_SCRIM`) | `bg-action-games/85` + blur over the frozen canvas |
| Highlights | `lime` for the current run, selected tool, word of the day, countdown |
| Confirm dialog | `bg-scrim` + `bg-cream rounded-glass` card, `action-exit` yes, white no |
| Gallery cards | Polaroids (`bg-polaroid shadow-note`), small alternating tilt, tape on top |

Pixi art in FlapFlap mirrors the palette: `sky` background, `purple` pipes, `lime` ground,
`magenta` bird (P1) with an `orange` beak, `orange` bird for P2. The DrawIt brush palette is
the brand palette plus white and brown.

Rotations are part of the look: keep them small and use them on decorative pieces and panels,
not on running text inside a panel.

---

## 6. Components

Reuse these before building a new version:

| Component | Path | Notes |
|---|---|---|
| `ExitButton` | `src/shared/components/ExitButton.tsx` | Red, sky border, top-left. `compact` for small screens |
| `PinnedRegistrationQR` | `src/features/kiosk/components/` | Every kiosk screen shows one |
| `RegistrationQRDisplay` | `src/features/kiosk/components/` | Bare QR; wrap it in a magenta glass frame |
| `HelpPopup` | `src/features/discovery/components/` | Corkboard + note + gif help pattern |
| `GlassCard` | `src/shared/components/GlassCard.tsx` | Large glass container |
| `BadgeDisplay` | `src/shared/components/BadgeDisplay.tsx` | Badge grid with tooltips |

Inside a component, name repeated class strings with a `const` at the top of the file (see
`MENU_BUTTON` in `IdleScreen.tsx` and `LABEL` in `ProfileCardView.tsx`) rather than repeating
them inline.

---

## 7. Layout

- **Kiosk** screens are designed at **1920×1080** and either scaled to fit
  (`IdleScreen`: `scale(min(100vw/1920, 100vh/1080))`) or laid out in viewport units/percentages
  (Discovery, profile view). Pick one per screen; don't mix.
- Fixed chrome: exit top-left, help `?` top-right, QR tab on the left or right edge.
- **Mobile** pages are a single column, `max-w-[430px]`, glass cards around `max-w-[350px]`.
- Spacing uses Tailwind's default scale (`1` = 4px).

---

## 8. Motion

Defined as `--animate-*` in `theme.css`. Keep motion short and springy:

| Utility | Use |
|---|---|
| `animate-fade-in`, `animate-fade-in-fast` | Scrims, overlays |
| `animate-slide-in-right` | Popups entering from the side |
| `animate-pop-in`, `animate-pop` | Cards and badges appearing |
| `animate-info-trace` | Dwell-to-click ring |
| `animate-completion-flash` | Discovery hold-timer complete |
| `animate-timer-pulse`, `animate-timer-flash` | Game countdowns |

Hover states are a small scale (`1.06`) plus the `-dark` shade; pressed is `scale(0.96)`. The CV
cursor fires synthetic mouse events, so hover feedback driven by React state (see
`BadgeDisplay`) is more reliable than CSS `:hover` for anything important.

---

## 9. Rules for contributors

1. **No raw colors** in components when a token exists. Add a token instead of repeating a value.
2. **Adding a token**: add a palette entry only for a genuinely new hue. Add a role when a palette
   color gains a specific job. Update the tables here in the same PR.
3. **Translucency** goes through opacity modifiers (`/93`), not new `rgba` tokens.
4. **Inline `style={{}}`** only for runtime values (computed lengths, image URLs, props).
5. **Pixi** (Hub network, game engines) can't read CSS tokens. If Pixi code needs a brand color,
   mirror the hex from this doc and leave a comment naming the token.
6. Don't redesign while migrating: keep visuals faithful and move values onto tokens.

---

## 10. Building a new page or feature

Go through this before writing any styles, and again before opening the PR.

1. **Pick the context.** Kiosk (1920×1080, CV cursor, read from across the room) or mobile
   (single column, touch)? Follow the matching layout rules in §7.
2. **Pick the hue.** If the page belongs to a Home destination, use its `action-*` role for
   its key surfaces. New top-level destination? Propose a role and add it to §2.
3. **Start from existing pieces.** Reuse the components in §6 (`ExitButton`, `PinnedRegistrationQR`,
   `HelpPopup`...) and the motifs in §5 before building new ones.
4. **Use tokens only.** No hex or `rgba()` in `className` or `style` when a token exists. Missing a
   value? Add it to `theme.css` and to the tables here in the same PR (§9).
5. **Type.** Jersey for display, Averia for body, mono for user-typed text. Use `tracking-brand`
   on headings and buttons, scale steps from §3, and lowercase copy in the brand voice (§1).
6. **Kiosk inputs.** Hit targets large enough for the hand cursor. Hover feedback through React
   state where it matters (§8). Every screen has an exit and a QR tab.
7. **Check it.** Look at it on the real screen size (kiosk at 1920×1080 and scaled down, mobile at
   ~390px) and put screenshots in the PR.

---

## 11. Migration status

Migrated onto these tokens: Home (`IdleScreen`, `InfoOverlay`), Discovery (`DiscoveryView`,
`PoseOverlay`, `HelpPopup`, `CameraView`, `RandomImageCard`, `BorderProgress`), the profile
view used by Discovery and Hub (`ProfileCardView`, `SendMessageButton`), `ExitButton` and
`PinnedRegistrationQR`. Games: the games menu, FlapFlap 1P/2P (launcher, leaderboard, game
over, split camera, Pixi colors) and every DrawIt screen.

Not yet migrated (still uses raw hex values): registration, mobile user pages, admin,
claim. The mobile pages use their own blue palette (`#003366`, `#a7d1f5`, `#e6f2ff`→`#c4dff5`
gradient) and Material reds (`#d32f2f`, `#b71c1c`). Decide whether that becomes a documented
"mobile" palette or folds into this one before migrating them.

`src/features/hub/components/ProfileCard.tsx` is not imported anywhere (the Hub renders
characters in Pixi) and was left untouched.
