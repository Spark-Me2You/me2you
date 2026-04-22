# Me2You: SPARK Space Interactive Installation

## Overview

Me2You is a public installation for the SPARK space where students use hand gestures to explore and connect with one another. The system combines real‑time computer vision, a browsable profile hub, and playful interactive elements to foster community.

---

## Features

### Gesture Interaction & Discovery

- **Presence detection:** Camera feed monitors for users and begins tracking when someone enters the frame.
- **Discovery gesture:** Specific gestures trigger a random profile reveal from previous users.
- **Feedback loop:** Unrecognized gestures prompt users to try again.

### Profiles and Community Hub

- **Profile fields:** Each user may supply name, role/year, interests, projects and experience.
- **Visibility controls:** Profiles can be toggled Public/Private. Private entries are omitted from browsing and gesture matches.
- **Private notes:** Authenticated users can leave notes on public profiles; notes are visible only to their author.

### Additional Interactive Modules

- **Mini‑games:** A set of computer-vision games with individual or competitive play; high scores are logged and viewable.
- **Gesture photo:** During setup, users capture their profile picture via gesture, generating a linked signature for future recognition.
- **Idle screensaver:** When no interaction is detected, the display cycles information, user artwork previews or community‑generated animations.

---

## Technical Stack

### Frontend

- **React** with **Vite** for fast development and building.
- **Computer vision** powered by OpenCV.js and MediaPipe for pose/face detection and gesture encoding.
- UI components designed for readability from 4–6 feet.
- **State management** uses React Context for authentication and app state machine orchestration.

### Backend & Services

- Hosted on **Supabase** with PostgreSQL for data storage.
- Profile photos and gesture snapshots are saved in Supabase **object storage** (buckets) alongside metadata in the database.

---

## Development

### Prerequisites

- Node.js (latest LTS recommended)
- npm
- USB or integrated camera for local development
- Supabase project (for backend integration)

### Setup

```bash
git clone https://github.com/Spark-Me2You/me2you.git
cd me2you
npm ci
```

Copy `.env.example` or create `.env` with:

```env
SUPABASE_URL=<your url>
SUPABASE_ANON_KEY=<anon key>
```

### Scripts

- `npm run dev` – start development server
- `npm run build` – compile TypeScript and build with Vite
- `npm run lint` – run ESLint

### CI/CD

GitHub Actions workflows under `.github/workflows` ensure builds run on `main`/`dev` and provide a deployment template triggered on `main`.

---

## Team

| Member | Role                |
| ------ | ------------------- |
| Nora   | Technical Developer |
| Jen    | Technical Developer |
| Shawn  | Technical Developer |
| Sebah  | UI/UX Designer      |
