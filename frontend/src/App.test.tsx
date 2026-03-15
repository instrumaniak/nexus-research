// frontend/src/App.test.tsx
import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App';
import { useAuthStore } from '@/stores/auth.store';
import { ThemeProvider } from '@/components/theme-provider';

vi.mock('@/api/chat.api', () => ({
  getSessions: vi.fn(async () => []),
  getSession: vi.fn(),
  streamChat: vi.fn(),
}));

vi.mock('@/api/admin.api', () => ({
  getUsers: vi.fn(async () => []),
  approveUser: vi.fn(),
  banUser: vi.fn(),
  unbanUser: vi.fn(),
}));

vi.mock('@/api/kb', () => ({
  listKbItems: vi.fn(async () => ({ items: [], hasMore: false })),
  searchKbItems: vi.fn(async () => []),
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

describe('App routing', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({
      user: null,
      accessToken: null,
      isAuthenticated: false,
      isLoading: false,
      isInitialising: false,
      initialise: vi.fn().mockResolvedValue(undefined),
    });
  });

  it('unauthenticated visit to /chat redirects to /login', async () => {
    window.history.pushState({}, '', '/chat');

    render(
      <ThemeProvider defaultTheme="light" storageKey="nexus-theme">
        <App />
      </ThemeProvider>,
    );

    await waitFor(() => {
      expect(screen.getByText(/sign in/i, { selector: 'h2' })).toBeInTheDocument();
    });
  });

  it('superadmin visit to /admin/users renders user management', async () => {
    useAuthStore.setState({
      user: {
        id: 1,
        name: 'admin',
        username: 'admin',
        email: 'admin@nexus.local',
        role: 'superadmin',
      },
      accessToken: 'token',
      isAuthenticated: true,
      isLoading: false,
      isInitialising: false,
      initialise: vi.fn().mockResolvedValue(undefined),
    });

    // Navigate to admin before render
    window.history.pushState({}, '', '/admin/users');

    render(
      <ThemeProvider defaultTheme="light" storageKey="nexus-theme">
        <App />
      </ThemeProvider>,
    );

    await waitFor(() => {
      expect(screen.getByText(/user management/i)).toBeInTheDocument();
    });
  });

  it('authenticated visit to /kb renders Knowledge Base page', async () => {
    useAuthStore.setState({
      user: {
        id: 1,
        name: 'user',
        username: 'user',
        email: 'user@nexus.local',
        role: 'USER',
      },
      accessToken: 'token',
      isAuthenticated: true,
      isLoading: false,
      isInitialising: false,
      initialise: vi.fn().mockResolvedValue(undefined),
    });

    window.history.pushState({}, '', '/kb');

    render(
      <ThemeProvider defaultTheme="light" storageKey="nexus-theme">
        <App />
      </ThemeProvider>,
    );

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /knowledge base/i })).toBeInTheDocument();
    });
  });

  it('Knowledge Base nav link is visible and points to /kb', async () => {
    useAuthStore.setState({
      user: {
        id: 1,
        name: 'user',
        username: 'user',
        email: 'user@nexus.local',
        role: 'USER',
      },
      accessToken: 'token',
      isAuthenticated: true,
      isLoading: false,
      isInitialising: false,
      initialise: vi.fn().mockResolvedValue(undefined),
    });

    window.history.pushState({}, '', '/chat');

    render(
      <ThemeProvider defaultTheme="light" storageKey="nexus-theme">
        <App />
      </ThemeProvider>,
    );

    await waitFor(() => {
      expect(screen.getByRole('link', { name: /knowledge base/i })).toBeInTheDocument();
    });

    const kbLink = screen.getByRole('link', { name: /knowledge base/i });
    expect(kbLink).toHaveAttribute('href', '/kb');
  });
});
