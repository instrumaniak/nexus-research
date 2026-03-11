import { create } from 'zustand';

// Stub — full implementation in Phase 2
interface KbStore {
  items: unknown[];
  searchResults: unknown[];
  isLoading: boolean;
}

export const useKbStore = create<KbStore>(() => ({
  items: [],
  searchResults: [],
  isLoading: false,
}));
