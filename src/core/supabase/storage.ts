/**
 * Storage Service
 * TODO: Implement photo upload and storage helpers
 */

export const storageService = {
  /**
   * Upload photo to storage
   * TODO: Implement photo upload with compression
   */
  uploadPhoto: async (_file: File, _userId: string) => {
    // TODO: Implement photo upload to Supabase storage
    return null;
  },

  /**
   * Get public URL for photo
   * TODO: Implement public URL retrieval
   */
  getPhotoUrl: (_path: string) => {
    // TODO: Implement public URL generation
    return '';
  },

  /**
   * Delete photo from storage
   * TODO: Implement photo deletion
   */
  deletePhoto: async (_path: string) => {
    // TODO: Implement photo deletion
  },
};
