import { create } from 'zustand';
import {
  listKbItems,
  searchKbItems,
  saveKbItem,
  deleteKbItem,
  type KbItem,
  type SaveKbItemPayload,
} from '@/api/kb';

interface KbStore {
  items: KbItem[];
  isLoading: boolean;
  isSearching: boolean;
  searchResults: KbItem[] | null;
  activeTag: string | null;
  page: number;
  hasMore: boolean;
  error: string | null;

  // Actions
  fetchItems: (tag?: string, page?: number) => Promise<void>;
  searchItems: (q: string) => Promise<void>;
  clearSearch: () => void;
  saveItem: (data: SaveKbItemPayload) => Promise<void>;
  deleteItem: (id: number) => Promise<void>;
  setActiveTag: (tag: string | null) => void;
}

export const useKbStore = create<KbStore>((set, get) => ({
  items: [],
  isLoading: false,
  isSearching: false,
  searchResults: null,
  activeTag: null,
  page: 1,
  hasMore: false,
  error: null,

  setActiveTag: (tag) => {
    set({ activeTag: tag, page: 1 });
    void get().fetchItems(tag ?? undefined, 1);
  },

  fetchItems: async (tag?: string, page?: number) => {
    const currentPage = page ?? get().page;
    const currentTag = tag ?? get().activeTag;

    set({ isLoading: true, error: null });

    try {
      const result = await listKbItems({
        tag: currentTag ?? undefined,
        page: currentPage,
        limit: 12,
      });

      set((state) => ({
        items: currentPage === 1 ? result.items : [...state.items, ...result.items],
        hasMore: result.hasMore,
        page: currentPage,
        isLoading: false,
      }));
    } catch {
      set({ isLoading: false, error: 'Failed to load items.' });
    }
  },

  searchItems: async (q: string) => {
    if (!q.trim()) {
      get().clearSearch();
      return;
    }

    set({ isSearching: true, error: null });

    try {
      const results = await searchKbItems(q);
      set({ searchResults: results, isSearching: false });
    } catch {
      set({ isSearching: false, error: 'Search failed.' });
    }
  },

  clearSearch: () => {
    set({ searchResults: null, isSearching: false });
  },

  saveItem: async (data: SaveKbItemPayload) => {
    set({ error: null });

    try {
      await saveKbItem(data);
      // Refresh the list after saving
      const { activeTag } = get();
      await get().fetchItems(activeTag ?? undefined, 1);
    } catch {
      set({ error: 'Failed to save item.' });
      throw new Error('Failed to save item.');
    }
  },

  deleteItem: async (id: number) => {
    set({ error: null });

    try {
      await deleteKbItem(id);
      // Remove from local state
      set((state) => ({
        items: state.items.filter((item) => item.id !== id),
        searchResults: state.searchResults
          ? state.searchResults.filter((item) => item.id !== id)
          : null,
      }));
    } catch {
      set({ error: 'Failed to delete item.' });
      throw new Error('Failed to delete item.');
    }
  },
}));
