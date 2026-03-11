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
  login: (email: string, password: string) => void; // stub: always succeeds
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
  login: (email, password) => {
    // Mock login ignores credentials in F1
    void email;
    void password;
    set({
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
  initialise: async () => {},
  getFreshToken: async () => get().accessToken,
  isTokenExpired: () => false,
  setAccessToken: (token) => set({ accessToken: token }),
}));

export default useAuthStore;
