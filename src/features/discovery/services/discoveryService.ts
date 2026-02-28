/**
 * Discovery Service
 * TODO: Implement API for matching gestures and fetching profiles
 */

export const discoveryService = {
  /**
   * Match gesture to profile
   * TODO: Implement gesture matching API call
   */
  matchGesture: async (_gestureEmbedding: number[]) => {
    // TODO: Send gesture embedding to backend for matching
    return null;
  },

  /**
   * Fetch random profile
   * TODO: Implement random profile fetching
   */
  fetchRandomProfile: async (_excludeIds: string[] = []) => {
    // TODO: Fetch random profile excluding already seen IDs
    return null;
  },
};
