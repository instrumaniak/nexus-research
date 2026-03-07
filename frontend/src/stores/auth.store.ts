import { create } from 'zustand';
import type { User } from '@/types';
import { API_BASE_URL } from '@/api/client';

interface AccessTokenPayload {
  sub: number;
  email: string;
  role: string;
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  login: (accessToken: string, user: User) => void;
  logout: () => void;
  setAccessToken: (token: string | null) => void;
  initialise: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
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
}));

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
