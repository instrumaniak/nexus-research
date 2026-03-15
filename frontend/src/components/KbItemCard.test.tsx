// frontend/src/components/KbItemCard.test.tsx
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { KbItemCard } from './KbItemCard';
import type { KbItem } from '@/api/kb';
import { ThemeProvider } from '@/components/theme-provider';

const mockDeleteItem = vi.fn();

vi.mock('@/stores/kb.store', () => ({
  useKbStore: () => ({ deleteItem: mockDeleteItem }),
}));

function renderCard(item: KbItem) {
  return render(
    <ThemeProvider defaultTheme="light" storageKey="nexus-theme">
      <KbItemCard item={item} />
    </ThemeProvider>,
  );
}

describe('KbItemCard', () => {
  const baseItem: KbItem = {
    id: 1,
    userId: 1,
    title: 'Test Research Item',
    content: 'Full content of the item goes here and can be long.',
    summary: 'Short summary',
    sourceUrl: null,
    tags: '["ai","research"]',
    createdAt: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
    embedding: null,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders title and content preview', () => {
    renderCard(baseItem);
    expect(screen.getByText('Test Research Item')).toBeInTheDocument();
    expect(screen.getByText(/Short summary/)).toBeInTheDocument();
  });

  it('renders relative date', () => {
    renderCard(baseItem);
    expect(screen.getByText(/1h ago/)).toBeInTheDocument();
  });

  it('renders tags as badges', () => {
    renderCard(baseItem);
    expect(screen.getByText('ai')).toBeInTheDocument();
    expect(screen.getByText('research')).toBeInTheDocument();
  });

  it('renders source URL link when present', () => {
    const itemWithUrl = { ...baseItem, sourceUrl: 'https://example.com/page' };
    renderCard(itemWithUrl);
    const link = screen.getByRole('link', { name: /example\.com/ });
    expect(link).toHaveAttribute('href', 'https://example.com/page');
    expect(link).toHaveAttribute('target', '_blank');
  });

  it('does not render source URL when null', () => {
    renderCard(baseItem);
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  it('View button opens sheet with full content', async () => {
    const user = userEvent.setup();
    renderCard(baseItem);

    await user.click(screen.getByRole('button', { name: /view/i }));

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveTextContent('Test Research Item');
    expect(dialog).toHaveTextContent('Full content of the item goes here and can be long.');
    expect(dialog).toHaveTextContent('Short summary');
  });

  it('Delete button opens confirmation dialog', async () => {
    const user = userEvent.setup();
    renderCard(baseItem);

    await user.click(screen.getByRole('button', { name: /delete item/i }));

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveTextContent(/delete item/i);
    expect(dialog).toHaveTextContent(/are you sure/i);
    expect(dialog).toHaveTextContent('Test Research Item');
  });

  it('Cancel in delete dialog closes without calling deleteItem', async () => {
    const user = userEvent.setup();
    renderCard(baseItem);

    await user.click(screen.getByRole('button', { name: /delete item/i }));
    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /cancel/i }));

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
    expect(mockDeleteItem).not.toHaveBeenCalled();
  });

  it('Delete in dialog calls deleteItem and closes', async () => {
    mockDeleteItem.mockResolvedValue(undefined);
    const user = userEvent.setup();
    renderCard(baseItem);

    await user.click(screen.getByRole('button', { name: /delete item/i }));
    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /^delete$/i }));

    await waitFor(() => {
      expect(mockDeleteItem).toHaveBeenCalledWith(1);
    });
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  it('uses content slice when summary is null', () => {
    const itemNoSummary = { ...baseItem, summary: null };
    renderCard(itemNoSummary);
    expect(screen.getByText(/Full content of the item/)).toBeInTheDocument();
  });
});
