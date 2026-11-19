/**
 * The garment store the clothesline UI, the hub and the mobile wardrobe use
 * (interface in garmentStore.ts). Backed by Supabase: migration 034 plus the
 * claim-garment edge function.
 */

export { supabaseGarmentStore as clotheslineStore } from "./supabaseGarmentStore";
