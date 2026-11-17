/**
 * The garment store for the configured backend (see garmentStore.ts).
 * The Supabase backend is imported on first use, so the default local backend
 * never loads the Supabase client.
 */

import { CLOTHESLINE_BACKEND } from "../config/clotheslineConfig";
import { lineChanges, type GarmentStore } from "./garmentStore";
import { localGarmentStore } from "./localGarmentStore";

let backend: Promise<GarmentStore> | null = null;

const load = (): Promise<GarmentStore> => {
  backend ??=
    CLOTHESLINE_BACKEND === "supabase"
      ? import("./supabaseGarmentStore").then((module) => module.supabaseGarmentStore)
      : Promise.resolve(localGarmentStore);
  return backend;
};

export const clotheslineStore: GarmentStore = {
  canClaim: CLOTHESLINE_BACKEND === "supabase",
  listLine: async (orgId, limit) => (await load()).listLine(orgId, limit),
  hang: async (orgId, pieces) => (await load()).hang(orgId, pieces),
  listMine: async (userId) => (await load()).listMine(userId),
  remove: async (garment) => (await load()).remove(garment),
  getEquipped: async (userIds) => (await load()).getEquipped(userIds),
  setEquipped: async (userId, orgId, garmentId) =>
    (await load()).setEquipped(userId, orgId, garmentId),
  subscribe: lineChanges.subscribe,
};
