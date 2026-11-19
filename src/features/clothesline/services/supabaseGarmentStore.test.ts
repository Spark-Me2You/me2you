import { beforeEach, describe, expect, it, vi } from "vitest";
import { queryResult, resetSupabaseMock, supabaseMock } from "@/test/supabaseMock";
import { silenceConsole } from "@/test/console";
import type { Garment } from "../types";
import { supabaseGarmentStore } from "./supabaseGarmentStore";

vi.mock("@/core/supabase/client", () => import("@/test/supabaseMockModule"));

const row = (overrides: Record<string, unknown> = {}) => ({
  id: "g1",
  org_id: "org-1",
  owner_id: null,
  kind: "top",
  image_path: "org-1/g1.png",
  width: 300,
  height: 400,
  created_at: "2026-11-16T10:00:00.000Z",
  ...overrides,
});

/** Storage bucket stub that signs every path it is given. */
function bucket(overrides: Record<string, unknown> = {}) {
  const api = {
    upload: vi.fn().mockResolvedValue({ data: {}, error: null }),
    remove: vi.fn().mockResolvedValue({ data: [], error: null }),
    createSignedUrls: vi.fn(async (paths: string[]) => ({
      data: paths.map((path) => ({ path, signedUrl: `https://signed/${path}` })),
      error: null,
    })),
    ...overrides,
  };
  supabaseMock.storage.from.mockReturnValue(api);
  return api;
}

describe("supabaseGarmentStore", () => {
  beforeEach(() => {
    resetSupabaseMock();
    silenceConsole();
  });

  it("lists the line with signed URLs and hides expired unclaimed garments", async () => {
    bucket();
    const query = queryResult({ data: [row()], error: null });
    supabaseMock.from.mockReturnValue(query);

    const line = await supabaseGarmentStore.listLine("org-1", 16);

    expect(supabaseMock.from).toHaveBeenCalledWith("garments");
    expect(query.eq).toHaveBeenCalledWith("org_id", "org-1");
    expect(query.or).toHaveBeenCalledWith(expect.stringContaining("owner_id.not.is.null,expires_at.gt."));
    expect(query.limit).toHaveBeenCalledWith(16);
    expect(line).toEqual([
      expect.objectContaining({ id: "g1", orgId: "org-1", ownerId: null, url: "https://signed/org-1/g1.png" }),
    ]);
  });

  it("returns an empty line when the table is missing", async () => {
    bucket();
    supabaseMock.from.mockReturnValue(queryResult({ data: null, error: { message: "relation does not exist" } }));
    await expect(supabaseGarmentStore.listLine("org-1", 16)).resolves.toEqual([]);
  });

  it("hangs a piece anonymously under the org folder", async () => {
    const storage = bucket();
    const query = queryResult({ data: row(), error: null });
    supabaseMock.from.mockReturnValue(query);
    const blob = new Blob(["png"], { type: "image/png" });

    const hung = await supabaseGarmentStore.hang("org-1", [
      { kind: "top", blob, width: 300, height: 400, previewUrl: "blob:x" },
    ]);

    const [path, uploaded] = storage.upload.mock.calls[0];
    expect(path).toMatch(/^org-1\/[0-9a-f-]{36}\.png$/);
    expect(uploaded).toBe(blob);
    const inserted = query.insert.mock.calls[0][0];
    expect(inserted).toMatchObject({ org_id: "org-1", kind: "top", image_path: path });
    expect(inserted).not.toHaveProperty("owner_id");
    expect(hung).toHaveLength(1);
  });

  it("throws when nothing could be hung", async () => {
    bucket({ upload: vi.fn().mockResolvedValue({ data: null, error: { message: "denied" } }) });
    await expect(
      supabaseGarmentStore.hang("org-1", [
        { kind: "top", blob: new Blob(), width: 1, height: 1, previewUrl: "blob:x" },
      ]),
    ).rejects.toThrow("denied");
    expect(supabaseMock.from).not.toHaveBeenCalled();
  });

  it("only dresses a mii in a top its own user owns", async () => {
    bucket();
    supabaseMock.from.mockImplementation((table: string) =>
      table === "accessories"
        ? queryResult({
            data: [
              { user_id: "u1", equipped_garment_id: "g1" },
              { user_id: "u2", equipped_garment_id: "g2" },
              { user_id: "u3", equipped_garment_id: "g3" },
            ],
            error: null,
          })
        : queryResult({
            data: [
              row({ id: "g1", owner_id: "u1", image_path: "org-1/g1.png" }),
              // Someone else's top, and a pair of bottoms: neither may be worn.
              row({ id: "g2", owner_id: "u9", image_path: "org-1/g2.png" }),
              row({ id: "g3", owner_id: "u3", kind: "bottom", image_path: "org-1/g3.png" }),
            ],
            error: null,
          }),
    );

    const equipped = await supabaseGarmentStore.getEquipped(["u1", "u2", "u3"]);

    expect(Object.keys(equipped)).toEqual(["u1"]);
    expect(equipped.u1.id).toBe("g1");
  });

  it("deletes the file before the row", async () => {
    const order: string[] = [];
    bucket({
      remove: vi.fn(async () => {
        order.push("file");
        return { data: [], error: null };
      }),
    });
    const query = queryResult({ data: null, error: null });
    query.delete.mockImplementation(() => {
      order.push("row");
      return query;
    });
    supabaseMock.from.mockReturnValue(query);

    await supabaseGarmentStore.remove({ id: "g1", imagePath: "org-1/g1.png" } as Garment);

    expect(order).toEqual(["file", "row"]);
  });

  it("saves the equipped top on the user's accessories row", async () => {
    const query = queryResult({ data: null, error: null });
    supabaseMock.from.mockReturnValue(query);

    await supabaseGarmentStore.setEquipped("u1", "org-1", null);

    expect(supabaseMock.from).toHaveBeenCalledWith("accessories");
    expect(query.upsert).toHaveBeenCalledWith(
      { user_id: "u1", org_id: "org-1", equipped_garment_id: null },
      { onConflict: "user_id" },
    );
  });
});
