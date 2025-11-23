import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { authClient } from '../lib/auth-client';

interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: string;
}

interface AdminAuthState {
  user: AdminUser | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  isLoading: boolean;
}

export const useAdminAuthStore = create<AdminAuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      isLoading: true,
      login: async (email: string, password: string) => {
        try {
          const { data, error } = await authClient.signIn.email({
            email,
            password,
          });

          if (error) {
            throw new Error(error.message || 'Authentication failed');
          }

          if (!data) {
            throw new Error('Authentication failed: No data returned');
          }

          const session = await authClient.getSession();

          // We need to fetch the session to get the user role because signIn might not return full user details depending on config
          // However, better-auth usually returns session and user on sign in.
          // Let's double check if we need to fetch session or if data contains it.
          // The data object from signIn.email typically contains { user: User, session: Session }

          // Check if user has admin role
          // @ts-ignore - better-auth types might need to be inferred or casted if not fully set up yet
          if (session.data?.user.role !== 'admin') {
            // If not admin, sign out immediately
            await authClient.signOut();
            throw new Error('Unauthorized: Admin access required');
          }

          set({
            user: {
              id: session.data.user.id,
              email: session.data.user.email,
              name: session.data.user.name || 'Admin User',
              role: session.data.user.role,
            },
            isAuthenticated: true,
          });
        } catch (error) {
          set({
            user: null,
            isAuthenticated: false,
          });
          throw error;
        }
      },
      logout: async () => {
        try {
          await authClient.signOut();
        } catch (error) {
          console.error('Logout error:', error);
        } finally {
          set({
            user: null,
            isAuthenticated: false,
          });
        }
      },

      checkAuth: async () => {
        set({ isLoading: true });
        try {
          const { data } = await authClient.getSession();

          if (!data) {
            set({ user: null, isAuthenticated: false, isLoading: false });
            return
          }
          set({
            user: {
              id: data.user.id,
              email: data.user.email,
              name: data.user.name || 'Admin User',
              role: data.user.role || 'user',
            },
            isAuthenticated: true,
            isLoading: false,
          });
        } catch (error) {
          console.error('Auth check error:', error);
          set({ user: null, isAuthenticated: false, isLoading: false });
        }
      },
    }),
    {
      name: 'admin-auth-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
