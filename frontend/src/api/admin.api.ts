import { apiClient } from './client';
import type { AdminUser } from '@/types';

export async function getUsers(): Promise<AdminUser[]> {
  const response = await apiClient.get<AdminUser[]>('/admin/users');
  return response.data;
}

export async function approveUser(id: number): Promise<AdminUser> {
  const response = await apiClient.patch<AdminUser>(`/admin/users/${id}/approve`);
  return response.data;
}

export async function banUser(id: number): Promise<AdminUser> {
  const response = await apiClient.patch<AdminUser>(`/admin/users/${id}/ban`);
  return response.data;
}

export async function unbanUser(id: number): Promise<AdminUser> {
  const response = await apiClient.patch<AdminUser>(`/admin/users/${id}/unban`);
  return response.data;
}
