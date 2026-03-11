import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App';
import { useAuthStore } from '@/stores/auth.store';

vi.mock('@/api/chat.api', () => ({
  getSessions: vi.fn().mockResolvedValue([]),
  getSession: vi.fn().mockResolvedValue({
    session: {
      id: 1,
      title: 'Session',
      mode: 'web',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    messages: [],
  }),
  streamChat: vi.fn(),
}));

describe('App routing', () => {
  beforeEach(() => {
    useAuthStore.setState({
      user: null,
      accessToken: null,
      isAuthenticated: false,
      initialise: vi.fn().mockResolvedValue(undefined),
    });
  });

  it('unauthenticated visit to /chat redirects to /login', async () => {
    render(
      <MemoryRouter
        initialEntries={['/chat']}
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      >
        <App />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /log in/i })).toBeInTheDocument();
    });
  });

  it('non-superadmin visit to /admin/users redirects to /chat', async () => {
    useAuthStore.setState({
      user: {
        id: 1,
        username: 'member',
        email: 'member@example.com',
        role: 'USER',
      },
      accessToken: 'token',
      isAuthenticated: true,
      initialise: vi.fn().mockResolvedValue(undefined),
    });

    render(
      <MemoryRouter
        initialEntries={['/admin/users']}
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      >
        <App />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText('Ask a research question')).toBeInTheDocument();
    });
  });
});
