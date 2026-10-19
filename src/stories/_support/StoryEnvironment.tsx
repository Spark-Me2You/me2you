/**
 * Story environment
 * Resets the mock backend and simulated camera for each story, then renders it
 * inside the same router + auth providers as the real app.
 */

import { useEffect, useState, type ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '@/core/auth';
import { state, type FunctionHandler, type Tables } from './mocks/mockDb';
import { applyScenario, type AuthPreset } from './fixtures/scenarios';
import { attachSimControls, resetSim, setTwoPlayers, sim, type SimGesture } from './sim/simInput';
import { installFakeCamera, stopFakeCamera, type CameraMode } from './sim/fakeCamera';

/** Serializable per-story settings, set via `Story.meta` or a file's default export. */
export interface StoryMeta {
  /** Who is signed in. Defaults to 'unauthenticated'. */
  auth?: AuthPreset;
  /** Initial router location. Defaults to '/'. */
  route?: string;
  /** `location.state` for the initial route (e.g. the claim success payload). */
  routeState?: unknown;
  seed?: 'default' | 'empty';
  delay?: number | 'forever';
  fail?: string[];
  /** Drive the CV cursor/gestures/pose from mouse + keyboard (see sim/simInput.ts). */
  cv?: boolean;
  camera?: CameraMode;
  /** Hand gesture held from the start (keys 1/2/3 change it in `cv` stories). */
  gesture?: SimGesture;
  /** Number of players in front of the camera for pose games. Defaults to 1. */
  players?: 1 | 2;
  /** Whether the simulated face crop finds a face. Defaults to true. */
  face?: boolean;
  /** Story is expected to log console errors (error states); the smoke test tolerates them. */
  allowConsoleErrors?: boolean;
  /** Leave the story out of the smoke test entirely (e.g. it renders the ErrorBoundary fallback on purpose). */
  skipSmoke?: boolean;
}

/** Tables as the environment seeded them, so <Scenario> tweaks stay idempotent under StrictMode. */
let baselineTables: Tables = {};

function StoryEnvironmentInner({ meta, children }: { meta: StoryMeta; children: ReactNode }) {
  // Runs during the first render so data is in place before any child effect fires.
  useState(() => {
    applyScenario({ auth: meta.auth, seed: meta.seed, delay: meta.delay, fail: meta.fail });
    baselineTables = structuredClone(state.tables);
    resetSim();
    sim.face = meta.face ?? true;
    sim.gesture = meta.gesture ?? null;
    if (meta.players === 2) setTwoPlayers(true);
    installFakeCamera(meta.camera ?? 'ok');
    return null;
  });

  useEffect(() => {
    const detach = meta.cv ? attachSimControls({ blockNativeClicks: true }) : () => {};
    return () => {
      detach();
      stopFakeCamera();
    };
  }, [meta.cv]);

  const url = new URL(meta.route ?? '/', 'http://story.local');
  return (
    <MemoryRouter initialEntries={[{ pathname: url.pathname, search: url.search, state: meta.routeState }]}>
      <AuthProvider>{children}</AuthProvider>
    </MemoryRouter>
  );
}

export function StoryEnvironment({ storyId, meta, children }: { storyId: string; meta: StoryMeta; children: ReactNode }) {
  // Keyed by story so switching stories remounts everything with fresh state.
  return (
    <StoryEnvironmentInner key={storyId} meta={meta}>
      {children}
    </StoryEnvironmentInner>
  );
}

interface ScenarioProps {
  /** Mutate the seeded tables before children render. */
  tables?: (tables: Tables) => void;
  functions?: Record<string, FunctionHandler>;
  children: ReactNode;
}

/**
 * Per-story data tweaks that can't live in serializable meta. Applies on top of
 * the scenario the environment already set up (auth stays as configured).
 */
export function Scenario({ tables, functions, children }: ScenarioProps) {
  useState(() => {
    if (tables) {
      state.tables = structuredClone(baselineTables);
      tables(state.tables);
    }
    Object.assign(state.functions, functions);
    return null;
  });
  return <>{children}</>;
}
