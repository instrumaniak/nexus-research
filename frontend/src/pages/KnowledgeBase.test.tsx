// frontend/src/pages/KnowledgeBase.test.tsx
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { KnowledgeBasePage } from './KnowledgeBase';
import { useKbStore } from '@/stores/kb.store';
import { ThemeProvider } from '@/components/theme-provider';

const mockListKbItems = vi.fn();
const mockSearchKbItems = vi.fn();

vi.mock('@/api/kb', () => ({
  listKbItems: (...args: unknown[]) => mockListKbItems(...args),
  searchKbItems: (...args: unknown[]) => mockSearchKbItems(...args),
  saveKbItem: vi.fn(),
  deleteKbItem: vi.fn(),
  getKbItem: vi.fn(),
  parseTags: (tags: string | null) => {
    if (!tags) return [];
    try {
      return JSON.parse(tags) as string[];
    } catch {
      return [];
    }
  },
}));

function renderPage() {
  return render(
    <ThemeProvider defaultTheme="light" storageKey="nexus-theme">
      <KnowledgeBasePage />
    </ThemeProvider>,
  );
}

const mockItem = {
  id: 1,
  userId: 1,
  title: 'Saved Item',
  content: 'Content',
  summary: 'Summary',
  sourceUrl: null,
  tags: '["ai","research"]',
  createdAt: new Date().toISOString(),
  embedding: null,
};

describe('KnowledgeBase page', () => {
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
  });

  it('renders title and subtitle', async () => {
    renderPage();
    await waitFor(() => {
      expect(mockListKbItems).toHaveBeenCalled();
    });
    expect(screen.getByRole('heading', { name: /knowledge base/i })).toBeInTheDocument();
    expect(screen.getByText(/your saved research items/i)).toBeInTheDocument();
  });

  it('renders search input with placeholder', async () => {
    renderPage();
    await waitFor(() => {
      expect(mockListKbItems).toHaveBeenCalled();
    });
    expect(screen.getByPlaceholderText(/search your knowledge base/i)).toBeInTheDocument();
  });

  it('fetches items on mount', async () => {
    mockListKbItems.mockResolvedValue({ items: [mockItem], hasMore: false });
    renderPage();

    await waitFor(() => {
      expect(mockListKbItems).toHaveBeenCalledWith(expect.objectContaining({ page: 1, limit: 12 }));
    });
  });

  it('shows empty state when no items', async () => {
    renderPage();

    await waitFor(() => {
      expect(mockListKbItems).toHaveBeenCalled();
    });

    expect(screen.getByText(/no items saved yet/i)).toBeInTheDocument();
    expect(screen.getByText(/save responses from the chat/i)).toBeInTheDocument();
  });

  it('shows item cards when items are returned', async () => {
    mockListKbItems.mockResolvedValue({ items: [mockItem], hasMore: false });
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Saved Item')).toBeInTheDocument();
    });
    expect(screen.getByText(/Summary/)).toBeInTheDocument();
  });

  it('shows tag pills when items have tags and All is first', async () => {
    mockListKbItems.mockResolvedValue({ items: [mockItem], hasMore: false });
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Saved Item')).toBeInTheDocument();
    });

    expect(screen.getByRole('button', { name: /^all$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'ai' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'research' })).toBeInTheDocument();
  });

  it('clicking tag calls setActiveTag and refetches with tag', async () => {
    const user = userEvent.setup();
    mockListKbItems
      .mockResolvedValueOnce({ items: [mockItem], hasMore: false })
      .mockResolvedValueOnce({ items: [], hasMore: false });

    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Saved Item')).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: 'ai' }));

    await waitFor(() => {
      expect(mockListKbItems).toHaveBeenLastCalledWith(
        expect.objectContaining({ tag: 'ai', page: 1, limit: 12 }),
      );
    });
  });

  it('clear search button clears input and restores full item list', async () => {
    const user = userEvent.setup();
    mockListKbItems.mockResolvedValue({ items: [mockItem], hasMore: false });
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Saved Item')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(/search your knowledge base/i);
    await user.type(searchInput, 'test');
    expect(searchInput).toHaveValue('test');

    await user.click(screen.getByRole('button', { name: /clear search/i }));
    expect(searchInput).toHaveValue('');
    expect(screen.getByText('Saved Item')).toBeInTheDocument();
  });

  it('shows Load more when hasMore is true', async () => {
    mockListKbItems.mockResolvedValue({ items: [mockItem], hasMore: true });
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Saved Item')).toBeInTheDocument();
    });

    expect(screen.getByRole('button', { name: /load more/i })).toBeInTheDocument();
  });

  it('Load more fetches next page', async () => {
    const user = userEvent.setup();
    mockListKbItems
      .mockResolvedValueOnce({ items: [mockItem], hasMore: true })
      .mockResolvedValueOnce({
        items: [{ ...mockItem, id: 2, title: 'Item 2' }],
        hasMore: false,
      });

    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Saved Item')).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /load more/i }));

    await waitFor(() => {
      expect(mockListKbItems).toHaveBeenLastCalledWith(
        expect.objectContaining({ page: 2, limit: 12 }),
      );
    });

    await waitFor(() => {
      expect(screen.getByText('Item 2')).toBeInTheDocument();
    });
  });

  it('shows no results when search returns empty', async () => {
    mockListKbItems.mockResolvedValue({ items: [mockItem], hasMore: false });
    mockSearchKbItems.mockResolvedValue([]);
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Saved Item')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(/search your knowledge base/i);
    await userEvent.setup().type(searchInput, 'nonexistent');

    await waitFor(
      () => {
        expect(screen.getByText(/no results found/i)).toBeInTheDocument();
      },
      { timeout: 3000 },
    );
  });
});
