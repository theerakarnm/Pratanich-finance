import { create } from 'zustand';
import liff from '@line/liff';

interface LiffProfile {
  userId: string;
  displayName: string;
  pictureUrl?: string;
  statusMessage?: string;
}

interface LiffState {
  liffId: string;
  isInitializing: boolean;
  isLoggedIn: boolean;
  profile: LiffProfile | null;
  error: string | null;

  initLiff: () => Promise<void>;
  login: () => void;
  logout: () => void;
}

export const useLiffStore = create<LiffState>((set, get) => ({
  liffId: import.meta.env.VITE_LIFF_ID || '',
  isInitializing: true,
  isLoggedIn: false,
  profile: null,
  error: null,

  initLiff: async () => {
    const { liffId, isInitializing, profile } = get();

    // If already initialized and has profile, stop
    if (!isInitializing && profile) return;

    // If liffId is missing
    if (!liffId) {
      set({ error: 'LIFF_ID is missing in environment variables', isInitializing: false });
      return;
    }

    try {
      // Initialize LIFF
      // Check if already initialized to avoid error
      // Note: liff.init can be called multiple times safely in recent versions, but verifying is good
      await liff.init({ liffId });

      if (liff.isLoggedIn()) {
        const profile = await liff.getProfile();
        set({
          isLoggedIn: true,
          profile: {
            userId: profile.userId,
            displayName: profile.displayName,
            pictureUrl: profile.pictureUrl,
            statusMessage: profile.statusMessage
          },
          isInitializing: false,
          error: null
        });
      } else {
        set({ isLoggedIn: false, profile: null, isInitializing: false, error: null });
      }
    } catch (err) {
      console.error('LIFF initialization error:', err);
      set({
        error: err instanceof Error ? err.message : 'Failed to initialize LIFF',
        isInitializing: false
      });
    }
  },

  login: () => {
    if (!liff.isLoggedIn()) {
      liff.login();
    }
  },

  logout: () => {
    if (liff.isLoggedIn()) {
      liff.logout();
    }
    set({ isLoggedIn: false, profile: null });
  }
}));
