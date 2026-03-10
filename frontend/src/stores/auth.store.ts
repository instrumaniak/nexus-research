import { create } from 'zustand';
import type { User } from '@/types';
import { API_BASE_URL } from '@/api/client';

interface AccessTokenPayload {
  sub: number;
  email: string;
  role: string;
  exp: number;
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  login: (accessToken: string, user: User) => void;
  logout: () => void;
  setAccessToken: (token: string | null) => void;
  initialise: () => Promise<void>;
  getFreshToken: () => Promise<string | null>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  accessToken: null,
  isAuthenticated: false,
  login: (accessToken, user) =>
    set({
      accessToken,
      user,
      isAuthenticated: true,
    }),
  logout: () =>
    set({
      accessToken: null,
      user: null,
      isAuthenticated: false,
    }),
  setAccessToken: (token) =>
    set((state) => ({
      accessToken: token,
      user: token ? hydrateUserFromToken(token, state.user) : null,
      isAuthenticated: !!token,
    })),
  initialise: async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
      });

      if (!response.ok) {
        set({
          accessToken: null,
          user: null,
          isAuthenticated: false,
        });
        return;
      }

      const data = (await response.json()) as { accessToken: string };

      set((state) => ({
        accessToken: data.accessToken,
        user: hydrateUserFromToken(data.accessToken, state.user),
        isAuthenticated: !!data.accessToken,
      }));
    } catch {
      set({
        accessToken: null,
        user: null,
        isAuthenticated: false,
      });
    }
  },
  getFreshToken: async () => {
    const { accessToken, initialise } = get();

    if (!accessToken || isTokenExpired(accessToken)) {
      await initialise();
      return get().accessToken;
    }

    return accessToken;
  },
}));

function isTokenExpired(token: string): boolean {
  const payload = decodeAccessToken(token);

  if (!payload) {
    return true;
  }

  // Check if token expires in the next 30 seconds
  const now = Math.floor(Date.now() / 1000);
  return payload.exp < now + 30;
}

function hydrateUserFromToken(token: string, previousUser: User | null): User | null {
  const payload = decodeAccessToken(token);

  if (!payload) {
    return previousUser;
  }

  return {
    id: payload.sub,
    email: payload.email,
    role: payload.role,
    username: previousUser?.username ?? payload.email.split('@')[0] ?? 'user',
  };
}

function decodeAccessToken(token: string): AccessTokenPayload | null {
  try {
    const [, payload] = token.split('.');

    if (!payload) {
      return null;
    }

    return JSON.parse(atob(payload)) as AccessTokenPayload;
  } catch {
    return null;
  }
}
