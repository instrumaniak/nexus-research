import axios, { AxiosError, AxiosHeaders, type InternalAxiosRequestConfig } from 'axios';
import { useAuthStore } from '@/stores/auth.store';

export const API_BASE_URL = import.meta.env.VITE_API_URL ?? '/api';

interface RetriableAxiosRequestConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
  skipAuthRefresh?: boolean;
}

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
});

apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as RetriableAxiosRequestConfig | undefined;
    const status = error.response?.status;

    if (
      status !== 401 ||
      !originalRequest ||
      originalRequest._retry ||
      originalRequest.skipAuthRefresh
    ) {
      throw error;
    }

    originalRequest._retry = true;

    try {
      const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
      });

      if (!response.ok) {
        // Only logout if it's a 401/403 or if the token is already expired
        if (
          response.status === 401 ||
          response.status === 403 ||
          useAuthStore.getState().isTokenExpired()
        ) {
          useAuthStore.getState().logout();
          if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
            window.location.assign('/login');
          }
        }
        throw error;
      }

      const data = (await response.json()) as { accessToken: string };
      useAuthStore.getState().setAccessToken(data.accessToken);

      const headers = AxiosHeaders.from(originalRequest.headers);
      headers.set('Authorization', `Bearer ${data.accessToken}`);
      originalRequest.headers = headers;

      return apiClient(originalRequest);
    } catch (e) {
      // If it's a network error/timeout, only logout if the token is dead
      if (useAuthStore.getState().isTokenExpired()) {
        useAuthStore.getState().logout();
        if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
          window.location.assign('/login');
        }
      }

      throw error;
    }
  },
);
