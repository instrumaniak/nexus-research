import { create } from 'zustand';
import * as authApi from '@/api/auth.api';
import { refresh } from '@/api/auth.api';

interface User {
  id: number;
  name?: string;
  username: string;
  email: string;
  role: 'user' | 'superadmin' | 'USER' | 'SUPERADMIN';
}

interface JwtPayload {
  sub: number;
  email: string;
  role: string;
  exp: number;
}

function decodeJwt(token: string): JwtPayload | null {
  try {
    return JSON.parse(atob(token.split('.')[1])) as JwtPayload;
  } catch {
    return null;
  }
}

interface AuthStore {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isInitialising: boolean; // true during startup session restore

  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
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
  isInitialising: true, // starts true — resolved in App.tsx on mount

  // ── Login ───────────────────────────────────────────────────────────────
  login: async (email, password) => {
    set({ isLoading: true });
    try {
      const result = await authApi.login({ email, password });
      set({
        isLoading: false,
        isAuthenticated: true,
        accessToken: result.accessToken,
        user: {
          id: result.user.id,
          username: result.user.username,
          email: result.user.email,
          role: result.user.role as User['role'],
        },
      });
    } catch (err) {
      set({ isLoading: false });
      throw err; // re-throw so Login.tsx can display the error
    }
  },

  // ── Logout ──────────────────────────────────────────────────────────────
  logout: async () => {
    try {
      await authApi.logout();
    } catch {
      // ignore — clear local state regardless
    }
    set({ user: null, accessToken: null, isAuthenticated: false });
  },

  // ── Initialise (called once on app mount) ────────────────────────────────
  // Tries to restore the session using the httpOnly refresh cookie.
  // If the cookie is valid, we get a new access token and decode user info.
  // If not, we stay logged out. Either way, isInitialising → false.
  initialise: async () => {
    try {
      const { accessToken } = await refresh();
      const payload = decodeJwt(accessToken);
      if (!payload) throw new Error('Invalid token');

      set({
        isAuthenticated: true,
        accessToken,
        isInitialising: false,
        user: {
          id: payload.sub,
          username: payload.email.split('@')[0], // best we can do without /auth/me
          email: payload.email,
          role: payload.role as User['role'],
        },
      });
    } catch {
      set({ isAuthenticated: false, user: null, accessToken: null, isInitialising: false });
    }
  },

  // ── Token helpers ────────────────────────────────────────────────────────
  isTokenExpired: () => {
    const token = get().accessToken;
    if (!token) return true;
    const payload = decodeJwt(token);
    if (!payload) return true;
    return payload.exp * 1000 < Date.now() + 30_000; // 30s buffer
  },

  getFreshToken: async () => {
    if (!get().isTokenExpired()) return get().accessToken;
    try {
      const { accessToken } = await refresh();
      get().setAccessToken(accessToken);
      return accessToken;
    } catch {
      await get().logout();
      return null;
    }
  },

  setAccessToken: (token) => set({ accessToken: token }),
}));

export default useAuthStore;
