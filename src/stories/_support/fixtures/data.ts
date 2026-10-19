/**
 * Seed data for the mock database
 * A small demo org with a handful of users, each with profile/gesture photos,
 * a bobblehead crop, accessories, game scores, drawings and messages.
 */

import type { AuthAccount, Row, Tables } from '../mocks/mockDb';
import { HEAD_LANDMARKS } from './images';

export const ORG_ID = 'org-demo';
export const OTHER_ORG_ID = 'org-other';

export const ADMIN_ID = 'admin-1';
export const KIOSK_ID = `kiosk-${ORG_ID}`;
/** The signed-in mobile user in user-mode stories. */
export const ME_ID = 'user-me';
/** A signed-in user who has an auth account but hasn't completed onboarding. */
export const NEW_USER_ID = 'user-new';

const point = ({ x, y }: { x: number; y: number }) => `(${x},${y})`;

const daysAgo = (days: number, hour = 12) => {
  const d = new Date('2026-10-15T00:00:00.000Z');
  d.setUTCDate(d.getUTCDate() - days);
  d.setUTCHours(hour);
  return d.toISOString();
};

interface PersonSeed {
  id: string;
  name: string;
  pronouns: string | null;
  major: string | null;
  status: string | null;
  interests: string[];
  accessory?: { selected_accessory: 'sunglasses' | 'hat' | 'balloon'; relative_x: number; relative_y: number; scale: number };
  gestures: string[];
}

const PEOPLE: PersonSeed[] = [
  {
    id: ME_ID,
    name: 'Sam Rivera',
    pronouns: 'they/them',
    major: 'Computer Science',
    status: 'building cool things ✨',
    interests: ['robotics', 'climbing', 'jazz'],
    accessory: { selected_accessory: 'sunglasses', relative_x: 0, relative_y: 0, scale: 1 },
    gestures: ['wave', 'peace_sign', 'thumbs_up'],
  },
  { id: 'user-ava', name: 'Ava Chen', pronouns: 'she/her', major: 'Design', status: 'coffee first', interests: ['typography', 'film'], accessory: { selected_accessory: 'hat', relative_x: 0, relative_y: -4, scale: 1.1 }, gestures: ['wave', 'peace_sign'] },
  { id: 'user-ben', name: 'Ben Okafor', pronouns: 'he/him', major: 'Mechanical Eng.', status: null, interests: ['cars', 'cooking'], gestures: ['thumbs_up'] },
  { id: 'user-cleo', name: 'Cleo Martins', pronouns: 'she/her', major: 'Biology', status: 'ask me about frogs', interests: ['frogs', 'hiking', 'piano'], accessory: { selected_accessory: 'balloon', relative_x: 10, relative_y: 0, scale: 0.9 }, gestures: ['wave', 'thumbs_up'] },
  { id: 'user-dev', name: 'Dev Patel', pronouns: 'he/him', major: 'Economics', status: 'open to study groups', interests: ['chess', 'basketball'], gestures: ['peace_sign'] },
  { id: 'user-eli', name: 'Eli Novak', pronouns: 'they/them', major: 'Music', status: '🎸', interests: ['guitar', 'synths'], accessory: { selected_accessory: 'sunglasses', relative_x: 0, relative_y: 2, scale: 1 }, gestures: ['wave', 'peace_sign', 'thumbs_up'] },
  { id: 'user-fatima', name: 'Fatima Haddad', pronouns: 'she/her', major: 'Architecture', status: null, interests: ['sketching', 'travel'], gestures: ['peace_sign', 'thumbs_up'] },
  { id: 'user-gus', name: 'Gus Lindqvist', pronouns: null, major: 'Physics', status: 'thinking about entropy', interests: ['astronomy'], gestures: ['wave'] },
  { id: 'user-hana', name: 'Hana Sato', pronouns: 'she/her', major: 'Psychology', status: 'new here, say hi!', interests: ['podcasts', 'yoga', 'baking'], accessory: { selected_accessory: 'hat', relative_x: 0, relative_y: 0, scale: 1 }, gestures: ['wave', 'peace_sign'] },
  { id: 'user-ivan', name: 'Ivan Petrov', pronouns: 'he/him', major: 'Mathematics', status: null, interests: ['proofs', 'running'], gestures: ['thumbs_up'] },
  { id: 'user-jo', name: 'Jo Adeyemi', pronouns: 'she/they', major: 'Film', status: 'shooting a short this weekend', interests: ['film', 'photography'], gestures: ['wave', 'peace_sign', 'thumbs_up'] },
  { id: 'user-kai', name: 'Kai Nakamura', pronouns: 'he/him', major: null, status: null, interests: [], gestures: [] },
];

function userRow(p: PersonSeed, index: number): Row {
  return {
    id: p.id,
    org_id: ORG_ID,
    name: p.name,
    status: p.status,
    pronouns: p.pronouns,
    major: p.major,
    interests: p.interests,
    visibility: 'public',
    onboarding_complete: true,
    accessory: p.accessory?.selected_accessory ?? null,
    created_at: daysAgo(40 - index * 3),
    updated_at: daysAgo(5),
  };
}

function buildTables(): Tables {
  const users = PEOPLE.map(userRow);
  users.push({
    id: NEW_USER_ID,
    org_id: ORG_ID,
    name: 'New Person',
    status: null,
    pronouns: null,
    major: null,
    interests: [],
    visibility: 'public',
    onboarding_complete: false,
    accessory: null,
    created_at: daysAgo(0),
    updated_at: daysAgo(0),
  });

  const gestureImages: Row[] = [];
  const croppedImages: Row[] = [];
  const accessories: Row[] = [];

  PEOPLE.forEach((p, i) => {
    // Kai has no photos, to exercise the "user without images" branch of the hub.
    if (p.id === 'user-kai') return;
    for (const category of ['profile', ...p.gestures]) {
      gestureImages.push({
        id: `gesture-${p.id}-${category}`,
        owner_id: p.id,
        org_id: ORG_ID,
        storage_path: `${p.id}/${category}.jpg`,
        category,
        is_public: true,
        created_at: daysAgo(30 - i),
        updated_at: daysAgo(30 - i),
      });
    }
    croppedImages.push({
      id: `cropped-${p.id}`,
      owner_id: p.id,
      org_id: ORG_ID,
      storage_path: `${p.id}/profile_cropped.png`,
      centroid_point: point(HEAD_LANDMARKS.faceCenter),
      left_eye_point: point(HEAD_LANDMARKS.leftEye),
      right_eye_point: point(HEAD_LANDMARKS.rightEye),
      nose_tip_point: point(HEAD_LANDMARKS.noseTip),
      mouth_center_point: point(HEAD_LANDMARKS.mouthCenter),
      chin_bottom_point: point(HEAD_LANDMARKS.chinBottom),
      forehead_top_point: point(HEAD_LANDMARKS.foreheadTop),
      is_public: true,
      created_at: daysAgo(30 - i),
      updated_at: daysAgo(30 - i),
    });
    if (p.accessory) {
      accessories.push({ user_id: p.id, org_id: ORG_ID, ...p.accessory });
    }
  });

  const scores = [
    ['user-eli', 42],
    ['user-ava', 37],
    [ME_ID, 31],
    ['user-ben', 28],
    ['user-ava', 25],
    ['user-jo', 19],
    ['user-dev', 14],
    [ME_ID, 12],
    ['user-hana', 7],
  ] as const;
  const gameScores: Row[] = scores.map(([owner, score], i) => ({
    id: `score-${i}`,
    owner_id: owner,
    org_id: ORG_ID,
    game_id: 'flapflap',
    score,
    metadata: null,
    created_at: daysAgo(i, 15),
  }));

  const prompts = ['cat', 'rocket', 'tree', 'pizza', 'bicycle', 'sun'];
  const drawings: Row[] = prompts.map((prompt, i) => ({
    id: `drawing-${i}`,
    owner_id: i < 3 ? ME_ID : PEOPLE[i].id,
    org_id: ORG_ID,
    image_path: `${i < 3 ? ME_ID : PEOPLE[i].id}/drawing-${i}.png`,
    prompt,
    created_at: daysAgo(i * 2, 10),
  }));

  const drawitSubmissions: Row[] = ['cat', 'cat', 'cat', 'cat', 'cat'].map((word, i) => ({
    id: `drawit-${i}`,
    word,
    image_path: `gallery/drawing-sub-${i}.png`,
    created_at: daysAgo(0, 9 + i),
  }));

  const messages: Row[] = [
    { from: 'user-ava', body: 'Love the sunglasses 😎', days: 0 },
    { from: 'user-eli', body: 'Want to jam on Friday? I just got a new pedal.', days: 1 },
    { from: 'user-hana', body: 'Hi! We have the same lab section I think', days: 3 },
    { from: 'user-dev', body: 'gg on flapflap, rematch?', days: 6 },
  ].map((m, i) => ({
    id: `message-${i}`,
    from_user_id: m.from,
    to_user_id: ME_ID,
    org_id: ORG_ID,
    body: m.body,
    created_at: daysAgo(m.days, 14),
  }));

  return {
    organization: [
      { id: ORG_ID, name: 'Spark Demo Campus', date_created: daysAgo(90) },
      { id: OTHER_ORG_ID, name: 'Second Campus', date_created: daysAgo(60) },
    ],
    admin: [{ id: ADMIN_ID, org_id: ORG_ID, email: 'admin@me2you.example', created_at: daysAgo(90) }],
    user: users,
    gesture_image: gestureImages,
    cropped_image: croppedImages,
    accessories,
    game_score: gameScores,
    drawings,
    drawit_submissions: drawitSubmissions,
    messages,
    claim_tokens: [],
  };
}

/** Fresh copy of the default seed data. */
export const seedTables = (): Tables => buildTables();

export const ACCOUNTS: AuthAccount[] = [
  { id: ADMIN_ID, email: 'admin@me2you.example' },
  { id: KIOSK_ID, email: `kiosk+${ORG_ID}@me2you.example`, app_metadata: { is_kiosk: true, org_id: ORG_ID } },
  { id: NEW_USER_ID, email: 'new@me2you.example' },
  ...PEOPLE.map((p) => ({ id: p.id, email: `${p.id.replace('user-', '')}@me2you.example` })),
];

export const PEOPLE_IDS = PEOPLE.map((p) => p.id);
