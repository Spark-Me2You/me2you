# Me2You: SPARK Space Interactive Installation

## Overview

Me2You is a community installation for SPARK space where students use hand gestures to explore and connect with one another. The system has two distinct rendering contexts:

- **Kiosk (`/app`)** — a full-screen installation on a physical display driven by a state machine and real-time hand tracking via MediaPipe.
- **Mobile (`/user`, `/register`, `/claim/*`)** — lightweight pages opened on a visitor's phone via QR code for account creation, profile management, and claiming drawings.

---

## Features

### Kiosk: Gesture-Driven Interface

The kiosk is navigated entirely by hand. A MediaPipe `HandLandmarker` model tracks the index finger for cursor movement and detects a thumb-pinch as a click — no mouse or touch required.

**State machine flow:**

```
IDLE → DISCOVERY | HUB | GAMES | AUTH
AUTH → ONBOARDING (new user) | HUB (existing user)
```

### Kiosk: Discovery Mode

Pose a specific hand gesture to trigger a random profile reveal from the community. A progress indicator counts down between reveals and a match overlay animates the transition.

### Kiosk: Community Hub

Browse the full network of registered users rendered as animated Pixi.js mii avatars on a shared cork-board canvas. Avatars are pulled live from the database and update in real time via Supabase subscriptions.

### Kiosk: Mini-Games

Two CV-powered games accessible from the IDLE screen:

- **DrawIt** — draw the daily prompt word on a canvas using a pinch gesture for the brush. Drawings are saved to Supabase and can be claimed by the creator via QR code.
- **FlapFlap** — control a flapping character by raising and lowering your arms. High scores are logged per user and viewable on a leaderboard.

### Mobile: Registration

Visitors scan a QR code from the kiosk, create an account, fill in their profile (name, role/year, interests, projects), and take a gesture-triggered profile photo. Face landmark data is extracted from the cropped photo and stored for accessory placement.

### Mobile: Profile & Avatar Customization

After registering, users can:

- Edit their profile fields and visibility (public/private).
- Choose and position accessories (hat, sunglasses, balloon) on their mii avatar — placement is rendered through Pixi.js using the same math as the kiosk hub.
- View their uploaded gallery and game score history.
- Compose and send messages to other users.

### Mobile: Claim Flow

After playing DrawIt on the kiosk, users scan a claim QR code to link their drawing to their account. The claim flow supports both registered and unregistered users.

---

## Technical Stack

### Frontend

- **React 18 + Vite + TypeScript**
- **Pixi.js** for all avatar/mii rendering (hub animated scene and mobile static previews share the same placement math)
- **MediaPipe HandLandmarker** for real-time hand tracking and gesture detection
- **MediaPipe FaceDetector** for face cropping during registration
- **React Router v6** for client-side routing
- **React Context** for auth state, app state machine, camera stream, and CV cursor

### Backend & Services

- **Supabase** — PostgreSQL, Auth, Storage, Edge Functions
- Row-level security (RLS) policies scope kiosk reads to the authenticated org via JWT `app_metadata`
- 9 Edge Functions handle: kiosk session minting, QR registration, claim token generation/execution, and account deletion
- Profile photos and gesture snapshots stored in Supabase object storage buckets

### CV Cursor System (`src/core/cv/`)

- `SharedCameraProvider` owns a single `MediaStream` shared across all CV consumers
- `useCvCursor` runs HandLandmarker, EMA-smooths the index-finger tip position to screen coordinates, and detects pinch (thumb-to-index normalized distance < `0.06`) with a 300 ms click cooldown
- Games access raw `isPinched` (no cooldown) for continuous interactions like painting and flapping

---

## Development

### Prerequisites

- Node.js (latest LTS)
- npm
- USB or integrated camera
- Supabase project

### Setup

```bash
git clone https://github.com/Spark-Me2You/me2you.git
cd me2you
npm ci
```

Create `.env` (see `.env.example`):

```env
SUPABASE_URL=<your url>
SUPABASE_ANON_KEY=<anon key>
```

Download MediaPipe models:

```bash
npx ts-node scripts/download-models.ts
```

### Common Commands

```bash
npm run dev        # start Vite dev server
npm run build      # tsc -b && vite build (TypeScript errors surface here)
npm run lint       # ESLint
```

### Supabase

```bash
supabase functions deploy <function-name>   # deploy a single edge function
supabase db push                            # apply migrations to remote
```

### CI/CD

GitHub Actions workflows under `.github/workflows/` run builds on `main` and `dev` branches and provide a deployment template triggered on pushes to `main`.

---

## Architecture

See [`docs/architecture.md`](docs/architecture.md) for the full directory structure, provider hierarchy, routing table, state machine transitions, and feature/shared layer details.

---

## Team

| Member | Role                |
| ------ | ------------------- |
| Nora   | Technical Developer |
| Jen    | Technical Developer |
| Shawn  | Technical Developer |
| Sebah  | UI/UX Designer      |
