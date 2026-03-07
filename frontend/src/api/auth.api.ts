import { isAxiosError } from 'axios';
import { apiClient, API_BASE_URL } from './client';
import type { AuthResponse } from '@/types';

export interface RegisterPayload {
  username: string;
  email: string;
  password: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export async function register(payload: RegisterPayload): Promise<{ message: string }> {
  const response = await apiClient.post<{ message: string }>('/auth/register', payload, {
    skipAuthRefresh: true,
  });

  return response.data;
}

export async function login(payload: LoginPayload): Promise<AuthResponse> {
  const response = await apiClient.post<AuthResponse>('/auth/login', payload, {
    skipAuthRefresh: true,
  });

  return response.data;
}

export async function logout(): Promise<void> {
  await apiClient.post('/auth/logout');
}

export async function refresh(): Promise<{ accessToken: string }> {
  const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
    method: 'POST',
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error('Refresh failed');
  }

  return (await response.json()) as { accessToken: string };
}

export function getErrorMessage(error: unknown): string {
  if (isAxiosError(error) && typeof error.response?.data === 'object' && error.response?.data) {
    const data = error.response.data as { message?: string };
    if (typeof data.message === 'string') {
      return data.message;
    }
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'Something went wrong';
}
