# me2you Architecture

This document reflects the current repository structure after cleanup of unused scaffold modules.

## Top-Level Shape

```text
me2you/
├── public/                    # static assets, models, screensaver content
├── supabase/                  # migrations, seed data, edge functions
├── src/
│   ├── core/                  # infrastructure shared by features
│   │   ├── auth/              # AuthContext/AuthProvider and route guards
│   │   ├── supabase/          # client + admin/user registration + kiosk services
│   │   ├── state-machine/     # app states and state provider
│   │   ├── cv/                # camera + mediapipe config + cursor system
│   │   └── monitoring/        # error boundaries
│   ├── features/              # domain features (admin/discovery/hub/games/etc.)
│   ├── shared/                # reusable UI, hooks, theme, constants
│   ├── App.tsx                # router entry
│   └── AppContainer.tsx       # state-machine driven kiosk shell
├── docs/                      # project documentation
└── scripts/                   # development scripts
```

## Routing and App Flow

- React Router handles top-level routes in `src/App.tsx`:
  - `/login` for admin login
  - `/user` and `/register` for mobile/user flows
  - `/app` for the kiosk state-machine container
- Inside `/app`, `src/AppContainer.tsx` switches views by app state from `src/core/state-machine`.

## Authentication

- Auth state is managed with React Context in `src/core/auth/AuthProvider.tsx`.
- Supabase auth/database services are in `src/core/supabase/`.
- Admin and user registration flows are separated by service and route concerns.

## Computer Vision

- Shared camera lifecycle is handled by `src/core/cv/SharedCameraProvider.tsx`.
- CV cursor logic lives in `src/core/cv/cursor/`.
- MediaPipe configuration/loading is in `src/core/cv/mediapipe-config.ts` and `src/core/cv/mediapipe-loader.ts`.

## Notes on Cleanup

The following legacy scaffolding was removed because it was unused at runtime:

- Unwired Zustand store scaffolding under `src/store/`
- Placeholder profile-editor form components that had no call sites
- Unused CV/monitoring utility stubs and stale barrel exports
- Unused discovery/system/hub hook/service stubs

This keeps docs aligned with what actually executes today.
