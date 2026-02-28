me2you/
├── public/
│ ├── models/ # MediaPipe/OpenCV weight files
│ │ ├── pose_landmarker.task
│ │ └── face_mesh.task
│ └── screensaver/ # Idle state art and previews
│ ├── artwork/
│ └── community-photos/ # Auto-generated user photo collages
│
├── supabase/ # Database schema and migrations
│ ├── migrations/
│ │ ├── 001_initial_schema.sql
│ │ ├── 002_gesture_embeddings.sql
│ │ └── 003_rls_policies.sql
│ ├── seed.sql # Demo data for development
│ └── config.toml # Supabase project config
│
├── src/
│ ├── core/ # Shared infrastructure
│ │ ├── supabase/
│ │ │ ├── client.ts # Supabase client initialization
│ │ │ ├── auth.ts # Card swipe auth logic
│ │ │ └── storage.ts # Photo upload helpers
│ │ │
│ │ ├── cv/ # Computer vision engine
│ │ │ ├── opencv-worker.ts # Off-thread CV processing (24fps+)
│ │ │ ├── mediapipe-config.ts # Pose detection settings
│ │ │ ├── cameraManager.ts # Single camera stream coordinator
│ │ │ ├── cvBridge.ts # Worker↔React communication layer
│ │ │ ├── gestureEncoder.ts # Pose→embedding conversion
│ │ │ └── gestureComparison.ts # Similarity matching algorithm
│ │ │
│ │ ├── state-machine/ # App state orchestration (replaces routing)
│ │ │ ├── appStateMachine.ts # State definitions and transitions
│ │ │ ├── stateContext.tsx # React context for global state
│ │ │ └── stateLogger.ts # Debug state transitions
│ │ │
│ │ └── monitoring/ # Performance tracking
│ │ ├── performanceMonitor.ts # FPS tracking, CV latency
│ │ └── errorBoundary.tsx # Crash recovery UI
│ │
│ ├── store/ # Centralized state management (Zustand)
│ │ ├── index.ts # Store configuration
│ │ ├── slices/
│ │ │ ├── sessionSlice.ts # Current user, auth, timeout state
│ │ │ ├── profileSlice.ts # Active profile being viewed
│ │ │ ├── gestureSlice.ts # Cooldown state, last match
│ │ │ ├── cameraSlice.ts # Camera stream state
│ │ │ └── systemSlice.ts # Presence detection, idle state
│ │ └── middleware/
│ │ ├── persistenceMiddleware.ts # sessionStorage sync (NOT localStorage)
│ │ └── loggerMiddleware.ts # Debug store changes
│ │
│ ├── features/ # Domain-specific modules
│ │ ├── auth-session/ # Session management and card swipe
│ │ │ ├── components/
│ │ │ │ ├── CardSwipePrompt.tsx
│ │ │ │ ├── SessionTimeoutWarning.tsx
│ │ │ │ └── LogoutButton.tsx
│ │ │ ├── hooks/
│ │ │ │ ├── useSession.ts # 90s inactivity tracking
│ │ │ │ ├── useCardReader.ts # USB card reader integration
│ │ │ │ └── useInactivityTimer.ts # Reusable timeout logic
│ │ │ ├── services/
│ │ │ │ └── sessionService.ts # Token mgmt + data clearing
│ │ │ └── index.ts # Feature export
│ │ │
│ │ ├── discovery/ # Gesture matching and random profiles
│ │ │ ├── components/
│ │ │ │ ├── GestureCamera.tsx # Live camera feed + overlay
│ │ │ │ ├── MatchOverlay.tsx # Matched profile display
│ │ │ │ ├── CooldownIndicator.tsx # 3-5s cooldown UI
│ │ │ │ └── NextButton.tsx # Bypass gesture for next profile
│ │ │ ├── hooks/
│ │ │ │ ├── useGestureMatch.ts # Main matching orchestrator
│ │ │ │ ├── useCooldown.ts # Cooldown timer logic
│ │ │ │ └── useRandomProfile.ts # No-repeat profile selection
│ │ │ ├── services/
│ │ │ │ └── discoveryService.ts # API: match gestures, fetch profiles
│ │ │ └── utils/
│ │ │ └── matchingAlgorithm.ts # Embedding comparison logic
│ │ │
│ │ ├── hub/ # Mii-inspired community dashboard
│ │ │ ├── components/
│ │ │ │ ├── HubScene.tsx # 3D/2D avatar grid
│ │ │ │ ├── ProfileGrid.tsx # Grid layout manager
│ │ │ │ ├── ProfileCard.tsx # Card component (photo + top 3 interests)
│ │ │ │ ├── ProfileDetail.tsx # Full profile modal
│ │ │ │ └── HubNavigation.tsx # Hub-specific controls
│ │ │ ├── hooks/
│ │ │ │ ├── useProfileFetch.ts # Fetch public profiles
│ │ │ │ ├── useProfilePagination.ts # Infinite scroll/pagination
│ │ │ │ └── useProfileFilter.ts # Search/filter by interests
│ │ │ ├── services/
│ │ │ │ └── hubService.ts # API: get public profiles
│ │ │ └── HubView.tsx # Main hub entry point
│ │ │
│ │ ├── profile-editor/ # Profile creation and photo capture
│ │ │ ├── components/
│ │ │ │ ├── ProfileForm.tsx # Multi-step wizard container
│ │ │ │ ├── PhotoCapture.tsx # Camera + gesture capture
│ │ │ │ ├── PhotoPreview.tsx # Approve/retake interface
│ │ │ │ ├── InterestTags.tsx # Tag input (max 15)
│ │ │ │ ├── ProjectForm.tsx # Dynamic project entries
│ │ │ │ ├── ExperienceForm.tsx # Dynamic work experience
│ │ │ │ └── StepIndicator.tsx # Progress bar
│ │ │ ├── hooks/
│ │ │ │ ├── usePhotoOptimization.ts # Compress before upload
│ │ │ │ ├── useFormValidation.ts # Required field checks
│ │ │ │ └── useMultiStepForm.ts # Step navigation
│ │ │ ├── services/
│ │ │ │ └── profileService.ts # API: create/update profile
│ │ │ └── validation/
│ │ │ └── profileSchema.ts # Zod/Yup validation rules
│ │ │
│ │ ├── social/ # Private networking features
│ │ │ ├── components/
│ │ │ │ ├── NoteEditor.tsx # Private note textarea (500 char)
│ │ │ │ ├── NoteList.tsx # User's saved notes
│ │ │ │ ├── NoteIndicator.tsx # "Has note" badge on cards
│ │ │ │ └── PrivacyToggle.tsx # Public/Private profile switch
│ │ │ ├── hooks/
│ │ │ │ ├── useNotes.ts # CRUD operations for notes
│ │ │ │ └── usePrivacySetting.ts # Visibility toggle logic
│ │ │ ├── services/
│ │ │ │ └── noteService.ts # API: authenticated note CRUD
│ │ │ └── utils/
│ │ │ └── noteValidation.ts # Character limit, sanitization
│ │ │
│ │ ├── system/ # Presence detection and onboarding
│ │ │ ├── components/
│ │ │ │ ├── HowToOverlay.tsx # Tutorial overlay
│ │ │ │ ├── GestureAnimation.tsx # Looping gesture demo
│ │ │ │ ├── IdleScreensaver.tsx # Art slideshow
│ │ │ │ └── PresenceIndicator.tsx # "System active" glow
│ │ │ ├── hooks/
│ │ │ │ ├── usePresence.ts # Face detection → active state
│ │ │ │ ├── useIdleTimeout.ts # 30s no presence → screensaver
│ │ │ │ └── useOverlayDismiss.ts # Gesture/button to close overlay
│ │ │ └── services/
│ │ │ └── presenceService.ts # Face detection logic
│ │ │
│ │ └── games/ # CV-based mini-games
│ │ ├── components/
│ │ │ ├── GameMenu.tsx # Game selection screen
│ │ │ ├── GameCanvas.tsx # Shared game rendering
│ │ │ ├── Leaderboard.tsx # High scores display
│ │ │ └── ScoreSubmit.tsx # Save score UI
│ │ ├── games/
│ │ │ ├── PoseMatchGame/ # Match the pose challenge
│ │ │ ├── ReactionTime/ # Gesture speed test
│ │ │ └── DanceParty/ # Multiplayer dance-off
│ │ ├── hooks/
│ │ │ ├── useGameScore.ts # Score tracking
│ │ │ └── useMultiplayer.ts # 2-player coordination
│ │ └── services/
│ │ └── gameService.ts # API: save/fetch scores
│ │
│ ├── shared/ # Global UI elements and utilities
│ │ ├── components/
│ │ │ ├── Button.tsx # Accessible, touch-optimized
│ │ │ ├── Modal.tsx # Overlay dialogs
│ │ │ ├── LoadingSpinner.tsx # Loading states
│ │ │ ├── ErrorMessage.tsx # Error display
│ │ │ ├── ConfirmDialog.tsx # Delete confirmations
│ │ │ └── CharacterCounter.tsx # For notes, bio, etc.
│ │ │
│ │ ├── hooks/
│ │ │ ├── useDebounce.ts # Input debouncing
│ │ │ ├── useInterval.ts # Safe interval hook
│ │ │ ├── useKeyboardShortcut.ts # Accessibility
│ │ │ └── useSessionStorage.ts # sessionStorage wrapper (NOT localStorage)
│ │ │
│ │ ├── utils/
│ │ │ ├── constants.ts # App-wide constants
│ │ │ ├── formatting.ts # Date, text formatting
│ │ │ ├── validation.ts # Common validators
│ │ │ └── gestureConstants.ts # Pose keypoint indices
│ │ │
│ │ └── theme/
│ │ ├── index.ts # Theme provider
│ │ ├── colors.ts # Color palette
│ │ ├── typography.ts # Font sizes for legibility
│ │ └── spacing.ts # Layout constants
│ │
│ ├── App.tsx # State machine orchestrator (not router)
│ ├── main.tsx # Vite entry point
│ └── vite-env.d.ts # TypeScript types (if using TS)
│
├── docs/  
│
├── scripts/ # Development utilities
│ ├── generate-embeddings.ts # Pre-compute gesture embeddings
│ ├── test-camera.ts # Camera hardware diagnostics
│ └── kiosk-setup.sh # Auto-start script for Linux kiosk mode
│
├── .env.example # Environment variable template
├── .env # Actual credentials (gitignored)
├── .gitignore
├── package.tson
├── vite.config.ts # Build optimizations
├── eslint.config.ts # Code quality
└── README.md # Project overview
