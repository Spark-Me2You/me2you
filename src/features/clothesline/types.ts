/** Which half of an outfit a cutout is. Only tops can be worn by a mii (v1). */
export type GarmentKind = "top" | "bottom";

/** A garment hanging on the community clothesline. */
export interface Garment {
  id: string;
  orgId: string;
  /** Null until someone claims it with the QR. */
  ownerId: string | null;
  kind: GarmentKind;
  /** Storage path (Supabase) or the garment id (local store). */
  imagePath: string;
  width: number;
  height: number;
  createdAt: string;
}

export interface GarmentWithUrl extends Garment {
  /** Signed URL or object URL for the transparent PNG. */
  url: string;
}

/** A cutout fresh from the photo booth, not yet saved anywhere. */
export interface CapturedGarment {
  kind: GarmentKind;
  blob: Blob;
  width: number;
  height: number;
  /** Object URL for the review screen; the booth revokes it. */
  previewUrl: string;
}
