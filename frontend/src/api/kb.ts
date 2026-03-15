import { apiClient } from './client';

export interface KbItem {
  id: number;
  userId: number;
  title: string;
  content: string;
  summary: string | null;
  sourceUrl: string | null;
  tags: string | null;
  createdAt: string;
  embedding: null;
}

export function parseTags(tags: string | null): string[] {
  if (!tags) return [];
  try {
    return JSON.parse(tags) as string[];
  } catch {
    return [];
  }
}

export interface SaveKbItemPayload {
  title: string;
  content: string;
  summary?: string;
  sourceUrl?: string;
  tags?: string[];
}

// Save item: POST /kb/save
export async function saveKbItem(data: SaveKbItemPayload): Promise<KbItem> {
  const response = await apiClient.post<KbItem>('/kb/save', data);
  return response.data;
}

// List items: GET /kb/items (backend returns array; we derive hasMore by requesting limit+1)
export async function listKbItems(params?: {
  tag?: string;
  page?: number;
  limit?: number;
}): Promise<{ items: KbItem[]; hasMore: boolean }> {
  const requestedLimit = Math.min(params?.limit ?? 20, 50);
  const paramsForBackend = {
    ...params,
    limit: Math.min(requestedLimit + 1, 50),
  };
  const response = await apiClient.get<KbItem[]>('/kb/items', {
    params: paramsForBackend,
  });
  const data = response.data;
  return {
    items: data.slice(0, requestedLimit),
    hasMore: data.length > requestedLimit,
  };
}

// Search: GET /kb/search?q=
export async function searchKbItems(q: string): Promise<KbItem[]> {
  const response = await apiClient.get<KbItem[]>('/kb/search', { params: { q } });
  return response.data;
}

// Get single: GET /kb/items/:id
export async function getKbItem(id: number): Promise<KbItem> {
  const response = await apiClient.get<KbItem>(`/kb/items/${id}`);
  return response.data;
}

// Delete: DELETE /kb/items/:id
export async function deleteKbItem(id: number): Promise<void> {
  await apiClient.delete(`/kb/items/${id}`);
}
