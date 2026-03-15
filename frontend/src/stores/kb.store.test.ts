// frontend/src/stores/kb.store.test.ts
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useKbStore } from './kb.store';
import type { KbItem } from '@/api/kb';

const mockItem: KbItem = {
  id: 1,
  userId: 1,
  title: 'Test Item',
  content: 'Content',
  summary: 'Summary',
  sourceUrl: null,
  tags: '["ai","research"]',
  createdAt: new Date().toISOString(),
  embedding: null,
};

const mockListKbItems = vi.fn();
const mockSearchKbItems = vi.fn();
const mockSaveKbItem = vi.fn();
const mockDeleteKbItem = vi.fn();

vi.mock('@/api/kb', () => ({
  listKbItems: (...args: unknown[]) => mockListKbItems(...args),
  searchKbItems: (...args: unknown[]) => mockSearchKbItems(...args),
  saveKbItem: (...args: unknown[]) => mockSaveKbItem(...args),
  deleteKbItem: (...args: unknown[]) => mockDeleteKbItem(...args),
  parseTags: (tags: string | null) => {
    if (!tags) return [];
    try {
      return JSON.parse(tags) as string[];
    } catch {
      return [];
    }
  },
}));

describe('kb store', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useKbStore.setState({
      items: [],
      searchResults: null,
      activeTag: null,
      page: 1,
      hasMore: false,
      isLoading: false,
      isSearching: false,
      error: null,
    });
    mockListKbItems.mockResolvedValue({ items: [], hasMore: false });
    mockSearchKbItems.mockResolvedValue([]);
    mockSaveKbItem.mockResolvedValue(mockItem);
    mockDeleteKbItem.mockResolvedValue(undefined);
  });

  describe('fetchItems', () => {
    it('calls listKbItems and sets items and hasMore', async () => {
      mockListKbItems.mockResolvedValue({
        items: [mockItem],
        hasMore: false,
      });

      await useKbStore.getState().fetchItems();

      expect(mockListKbItems).toHaveBeenCalledWith({
        page: 1,
        limit: 12,
      });
      expect(useKbStore.getState().items).toEqual([mockItem]);
      expect(useKbStore.getState().hasMore).toBe(false);
      expect(useKbStore.getState().isLoading).toBe(false);
    });

    it('appends items when page > 1', async () => {
      const item2 = { ...mockItem, id: 2, title: 'Item 2' };
      useKbStore.setState({ items: [mockItem], page: 1 });
      mockListKbItems.mockResolvedValue({
        items: [item2],
        hasMore: false,
      });

      await useKbStore.getState().fetchItems(undefined, 2);

      expect(mockListKbItems).toHaveBeenCalledWith({
        page: 2,
        limit: 12,
      });
      expect(useKbStore.getState().items).toEqual([mockItem, item2]);
      expect(useKbStore.getState().page).toBe(2);
    });

    it('passes tag to listKbItems when provided', async () => {
      await useKbStore.getState().fetchItems('ai', 1);

      expect(mockListKbItems).toHaveBeenCalledWith({
        tag: 'ai',
        page: 1,
        limit: 12,
      });
    });

    it('sets error when listKbItems rejects', async () => {
      mockListKbItems.mockRejectedValue(new Error('Network error'));

      await useKbStore.getState().fetchItems();

      expect(useKbStore.getState().error).toBe('Failed to load items.');
      expect(useKbStore.getState().isLoading).toBe(false);
    });
  });

  describe('searchItems', () => {
    it('calls searchKbItems and sets searchResults', async () => {
      mockSearchKbItems.mockResolvedValue([mockItem]);

      await useKbStore.getState().searchItems('query');

      expect(mockSearchKbItems).toHaveBeenCalledWith('query');
      expect(useKbStore.getState().searchResults).toEqual([mockItem]);
      expect(useKbStore.getState().isSearching).toBe(false);
    });

    it('clears search when query is empty string', async () => {
      useKbStore.setState({ searchResults: [mockItem] });

      await useKbStore.getState().searchItems('   ');

      expect(mockSearchKbItems).not.toHaveBeenCalled();
      expect(useKbStore.getState().searchResults).toBeNull();
    });

    it('sets error when searchKbItems rejects', async () => {
      mockSearchKbItems.mockRejectedValue(new Error('Search failed'));

      await useKbStore.getState().searchItems('q');

      expect(useKbStore.getState().error).toBe('Search failed.');
      expect(useKbStore.getState().isSearching).toBe(false);
    });
  });

  describe('clearSearch', () => {
    it('sets searchResults to null', () => {
      useKbStore.setState({ searchResults: [mockItem] });

      useKbStore.getState().clearSearch();

      expect(useKbStore.getState().searchResults).toBeNull();
    });
  });

  describe('setActiveTag', () => {
    it('sets activeTag and page 1 and calls fetchItems', async () => {
      mockListKbItems.mockResolvedValue({ items: [], hasMore: false });

      useKbStore.getState().setActiveTag('ai');

      expect(useKbStore.getState().activeTag).toBe('ai');
      expect(useKbStore.getState().page).toBe(1);
      await vi.waitFor(() => {
        expect(mockListKbItems).toHaveBeenCalledWith({
          tag: 'ai',
          page: 1,
          limit: 12,
        });
      });
    });

    it('allows clearing tag with null', async () => {
      useKbStore.setState({ activeTag: 'ai' });
      mockListKbItems.mockResolvedValue({ items: [], hasMore: false });

      useKbStore.getState().setActiveTag(null);

      expect(useKbStore.getState().activeTag).toBeNull();
      await vi.waitFor(() => {
        expect(mockListKbItems).toHaveBeenCalledWith({
          page: 1,
          limit: 12,
        });
      });
    });
  });

  describe('saveItem', () => {
    it('calls saveKbItem then fetchItems and refreshes list', async () => {
      mockSaveKbItem.mockResolvedValue(mockItem);
      mockListKbItems.mockResolvedValue({ items: [mockItem], hasMore: false });

      await useKbStore.getState().saveItem({
        title: 'Title',
        content: 'Content',
      });

      expect(mockSaveKbItem).toHaveBeenCalledWith({
        title: 'Title',
        content: 'Content',
      });
      expect(mockListKbItems).toHaveBeenCalled();
      expect(useKbStore.getState().error).toBeNull();
    });

    it('sets error and throws when saveKbItem rejects', async () => {
      mockSaveKbItem.mockRejectedValue(new Error('Save failed'));

      await expect(useKbStore.getState().saveItem({ title: 'T', content: 'C' })).rejects.toThrow(
        'Failed to save item.',
      );
      expect(useKbStore.getState().error).toBe('Failed to save item.');
    });
  });

  describe('deleteItem', () => {
    it('calls deleteKbItem and removes item from items and searchResults', async () => {
      const item2 = { ...mockItem, id: 2 };
      useKbStore.setState({
        items: [mockItem, item2],
        searchResults: [mockItem, item2],
      });

      await useKbStore.getState().deleteItem(1);

      expect(mockDeleteKbItem).toHaveBeenCalledWith(1);
      expect(useKbStore.getState().items).toEqual([item2]);
      expect(useKbStore.getState().searchResults).toEqual([item2]);
    });

    it('removes only from items when searchResults is null', async () => {
      useKbStore.setState({ items: [mockItem], searchResults: null });

      await useKbStore.getState().deleteItem(1);

      expect(useKbStore.getState().items).toEqual([]);
      expect(useKbStore.getState().searchResults).toBeNull();
    });

    it('sets error and throws when deleteKbItem rejects', async () => {
      mockDeleteKbItem.mockRejectedValue(new Error('Delete failed'));
      useKbStore.setState({ items: [mockItem] });

      await expect(useKbStore.getState().deleteItem(1)).rejects.toThrow('Failed to delete item.');
      expect(useKbStore.getState().error).toBe('Failed to delete item.');
      expect(useKbStore.getState().items).toEqual([mockItem]);
    });
  });
});
