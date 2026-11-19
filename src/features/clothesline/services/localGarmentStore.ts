/**
 * Local garment store (IndexedDB)
 * Keeps cutouts on this device only. Used until migration 034 is applied.
 */

import type { CapturedGarment, Garment, GarmentWithUrl } from "../types";
import { lineChanges, type GarmentStore } from "./garmentStore";

const DB_NAME = "me2you-clothesline";
const STORE = "garments";
/** Oldest garments are dropped past this many. */
const MAX_GARMENTS = 60;
/** Garments leave the line after a day, like unclaimed ones do on Supabase. */
const MAX_AGE_MS = 24 * 60 * 60 * 1000;

interface StoredGarment extends Garment {
  blob: Blob;
}

const urls = new Map<string, string>();

const openDb = (): Promise<IDBDatabase> =>
  new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB is unavailable"));
      return;
    }
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore(STORE, { keyPath: "id" });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Could not open IndexedDB"));
  });

async function run<T>(
  mode: IDBTransactionMode,
  work: (store: IDBObjectStore) => IDBRequest<T> | void,
): Promise<T | undefined> {
  const db = await openDb();
  try {
    return await new Promise<T | undefined>((resolve, reject) => {
      const tx = db.transaction(STORE, mode);
      const request = work(tx.objectStore(STORE));
      tx.oncomplete = () => resolve(request ? request.result : undefined);
      tx.onerror = () => reject(tx.error ?? new Error("IndexedDB transaction failed"));
      tx.onabort = () => reject(tx.error ?? new Error("IndexedDB transaction aborted"));
    });
  } finally {
    db.close();
  }
}

const urlFor = (row: StoredGarment): string => {
  let url = urls.get(row.id);
  if (!url) {
    url = URL.createObjectURL(row.blob);
    urls.set(row.id, url);
  }
  return url;
};

const forget = (id: string) => {
  const url = urls.get(id);
  if (url) URL.revokeObjectURL(url);
  urls.delete(id);
};

const toGarment = (row: StoredGarment): GarmentWithUrl => ({
  id: row.id,
  orgId: row.orgId,
  ownerId: row.ownerId,
  kind: row.kind,
  imagePath: row.imagePath,
  width: row.width,
  height: row.height,
  createdAt: row.createdAt,
  url: urlFor(row),
});

/** All rows newest first, deleting any that are too old or over the cap. */
async function readAndPrune(): Promise<StoredGarment[]> {
  const rows = ((await run<StoredGarment[]>("readonly", (store) => store.getAll())) ?? []).sort(
    (a, b) => b.createdAt.localeCompare(a.createdAt),
  );
  const cutoff = Date.now() - MAX_AGE_MS;
  const keep = rows.filter((row, index) => index < MAX_GARMENTS && Date.parse(row.createdAt) >= cutoff);
  const drop = rows.filter((row) => !keep.includes(row));
  if (drop.length) {
    await run("readwrite", (store) => {
      drop.forEach((row) => store.delete(row.id));
    });
    drop.forEach((row) => forget(row.id));
  }
  return keep;
}

export const localGarmentStore: GarmentStore = {
  canClaim: false,

  async listLine(orgId, limit) {
    if (typeof indexedDB === "undefined") return [];
    try {
      const rows = await readAndPrune();
      return rows.filter((row) => row.orgId === orgId).slice(0, limit).map(toGarment);
    } catch (error) {
      console.error("[clothesline] local list failed:", error);
      return [];
    }
  },

  async hang(orgId, pieces: CapturedGarment[]) {
    const createdAt = new Date().toISOString();
    const rows: StoredGarment[] = pieces.map((piece) => {
      const id = crypto.randomUUID();
      return {
        id,
        orgId,
        ownerId: null,
        kind: piece.kind,
        imagePath: id,
        width: piece.width,
        height: piece.height,
        createdAt,
        blob: piece.blob,
      };
    });
    await run("readwrite", (store) => {
      rows.forEach((row) => store.put(row));
    });
    lineChanges.notify();
    return rows.map(({ blob: _blob, ...garment }) => garment);
  },

  async listMine() {
    return [];
  },

  async remove(garment) {
    await run("readwrite", (store) => {
      store.delete(garment.id);
    });
    forget(garment.id);
    lineChanges.notify();
  },

  async getEquipped() {
    return {};
  },

  async setEquipped() {
    throw new Error("Wearing clothes needs the Supabase clothesline backend");
  },

  subscribe: lineChanges.subscribe,
};
