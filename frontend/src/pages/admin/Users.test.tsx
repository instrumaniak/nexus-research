// frontend/src/pages/admin/Users.test.tsx
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AdminUsersPage } from './Users';

type ApiUser = {
  id: number;
  username: string;
  email: string;
  role: 'USER' | 'SUPERADMIN';
  status: 'PENDING' | 'ACTIVE' | 'BANNED';
  createdAt: string;
};

let usersFixture: ApiUser[] = [];

vi.mock('@/api/admin.api', () => {
  return {
    getUsers: vi.fn(async () => usersFixture),
    approveUser: vi.fn(async (id: number) => {
      const u = usersFixture.find((x) => x.id === id);
      if (!u) throw new Error('not found');
      return { ...u, status: 'ACTIVE' };
    }),
    banUser: vi.fn(async (id: number) => {
      const u = usersFixture.find((x) => x.id === id);
      if (!u) throw new Error('not found');
      return { ...u, status: 'BANNED' };
    }),
    unbanUser: vi.fn(async (id: number) => {
      const u = usersFixture.find((x) => x.id === id);
      if (!u) throw new Error('not found');
      return { ...u, status: 'ACTIVE' };
    }),
  };
});

function renderPage() {
  return render(
    <MemoryRouter>
      <AdminUsersPage />
    </MemoryRouter>,
  );
}

describe('AdminUsersPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    usersFixture = [
      {
        id: 1,
        username: 'admin',
        email: 'admin@nexus.local',
        role: 'SUPERADMIN',
        status: 'ACTIVE',
        createdAt: new Date('2026-01-01T00:00:00.000Z').toISOString(),
      },
      {
        id: 2,
        username: 'alice',
        email: 'alice@nexus.local',
        role: 'USER',
        status: 'PENDING',
        createdAt: new Date('2026-01-02T00:00:00.000Z').toISOString(),
      },
      {
        id: 3,
        username: 'bob',
        email: 'bob@nexus.local',
        role: 'USER',
        status: 'ACTIVE',
        createdAt: new Date('2026-01-03T00:00:00.000Z').toISOString(),
      },
    ];
  });

  it('renders users after loading', async () => {
    renderPage();
    expect(await screen.findByText(/user management/i)).toBeInTheDocument();
    expect(screen.getByText('admin')).toBeInTheDocument();
    expect(screen.getByText('alice')).toBeInTheDocument();
    expect(screen.getByText('bob')).toBeInTheDocument();
  });

  it('Approve button changes PENDING user to ACTIVE', async () => {
    const user = userEvent.setup();
    renderPage();

    // Wait for users to load (spinner disappears)
    await screen.findByText('alice');

    const approveButtons = screen.getAllByRole('button', { name: /approve/i });
    expect(approveButtons.length).toBe(1);
    await user.click(approveButtons[0]);

    await waitFor(() => {
      expect(screen.queryByRole('button', { name: /approve/i })).not.toBeInTheDocument();
    });
  });

  it('Ban button changes ACTIVE user to BANNED', async () => {
    const user = userEvent.setup();
    renderPage();

    // Wait for users to load (spinner disappears)
    await screen.findByText('bob');

    const banButtons = screen.getAllByRole('button', { name: /^ban$/i });
    expect(banButtons.length).toBe(1);
    await user.click(banButtons[0]);

    await waitFor(() => {
      expect(screen.queryByRole('button', { name: /^ban$/i })).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: /unban/i })).toBeInTheDocument();
    });
  });
});
