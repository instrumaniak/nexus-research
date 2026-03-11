import { create } from 'zustand';

interface User {
  id: number;
  name?: string;
  username: string;
  email: string;
  role: 'user' | 'superadmin' | 'USER' | 'SUPERADMIN';
}

interface AuthStore {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  initialise: () => Promise<void>;
  getFreshToken: () => Promise<string | null>;
  isTokenExpired: () => boolean;
  setAccessToken: (token: string | null) => void;
}

export const useAuthStore = create<AuthStore>((set, get) => ({
  user: null,
  accessToken: null,
  isAuthenticated: false,
  isLoading: false,

  login: async () => {
    set({ isLoading: true });
    // Simulate network delay — makes loading state visible and testable
    await new Promise((r) => setTimeout(r, 600));
    set({
      isLoading: false,
      isAuthenticated: true,
      accessToken: 'stub-token',
      user: {
        id: 1,
        name: 'admin',
        username: 'admin',
        email: 'admin@nexus.local',
        role: 'superadmin',
      },
    });
  },

  logout: () => set({ user: null, accessToken: null, isAuthenticated: false }),

  // F3 stubs — do not implement yet
  initialise: async () => {},
  getFreshToken: async () => get().accessToken,
  isTokenExpired: () => false,
  setAccessToken: (token) => set({ accessToken: token }),
}));

export default useAuthStore;
