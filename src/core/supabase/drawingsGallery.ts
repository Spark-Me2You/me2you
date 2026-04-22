import { supabase } from './client';

export interface DrawingEntry {
  id: string;
  prompt: string | null;
  imageUrl: string;
  createdAt: string;
  ownerId: string;
  ownerName: string | null;
}

interface DrawingRow {
  id: string;
  owner_id: string;
  image_path: string;
  prompt: string | null;
  created_at: string;
  owner: { name: string | null } | null;
}

async function signDrawings(rows: DrawingRow[]): Promise<DrawingEntry[]> {
  const signed = await Promise.all(
    rows.map(async (row) => {
      const { data: s } = await supabase.storage
        .from('drawings')
        .createSignedUrl(row.image_path, 3600);
      return {
        id: row.id,
        prompt: row.prompt,
        imageUrl: s?.signedUrl ?? '',
        createdAt: row.created_at,
        ownerId: row.owner_id,
        ownerName: row.owner?.name ?? null,
      };
    }),
  );
  return signed.filter((e) => e.imageUrl);
}

/**
 * Fetch every claimed drawing in the given org, newest first.
 * RLS ensures the caller can only see their own org — the org_id filter here
 * is a defense-in-depth, not the security boundary.
 */
export async function fetchOrgDrawings(orgId: string): Promise<DrawingEntry[]> {
  const { data, error } = await supabase
    .from('drawings')
    .select('id, owner_id, image_path, prompt, created_at, owner:user!drawings_owner_id_fkey(name)')
    .eq('org_id', orgId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[drawingsGallery] fetchOrgDrawings failed:', error);
    throw new Error(error.message);
  }
  return signDrawings((data ?? []) as DrawingRow[]);
}

/**
 * Fetch the signed-in user's own claimed drawings, newest first.
 */
export async function fetchMyDrawings(userId: string): Promise<DrawingEntry[]> {
  const { data, error } = await supabase
    .from('drawings')
    .select('id, owner_id, image_path, prompt, created_at, owner:user!drawings_owner_id_fkey(name)')
    .eq('owner_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[drawingsGallery] fetchMyDrawings failed:', error);
    throw new Error(error.message);
  }
  return signDrawings((data ?? []) as DrawingRow[]);
}

/**
 * Delete a drawing the user owns. Removes the storage file first (owner RLS on
 * storage.objects) then the DB row (owner RLS on drawings). If the file delete
 * fails we still attempt the row delete — a DB row without a file is less bad
 * than a row pointing to a deleted file being orphaned in storage on retry.
 */
export async function deleteMyDrawing(drawing: Pick<DrawingEntry, 'id'> & { imagePath: string }): Promise<void> {
  const { error: storageError } = await supabase.storage
    .from('drawings')
    .remove([drawing.imagePath]);
  if (storageError) {
    console.warn('[drawingsGallery] file delete failed (continuing to row delete):', storageError);
  }

  const { error: rowError } = await supabase
    .from('drawings')
    .delete()
    .eq('id', drawing.id);
  if (rowError) {
    console.error('[drawingsGallery] row delete failed:', rowError);
    throw new Error(rowError.message);
  }
}
