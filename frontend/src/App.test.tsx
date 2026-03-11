// frontend/src/App.test.tsx
import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App';
import { useAuthStore } from '@/stores/auth.store';
import { ThemeProvider } from '@/components/theme-provider';

describe('App routing', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({
      user: null,
      accessToken: null,
      isAuthenticated: false,
      isLoading: false,
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
});
