import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import AdminUsers from './AdminUsers';
import * as adminApi from '@/api/admin.api';
import { useAuthStore } from '@/stores/auth.store';

vi.mock('@/api/admin.api', () => ({
  getUsers: vi.fn(),
  approveUser: vi.fn(),
  banUser: vi.fn(),
  unbanUser: vi.fn(),
}));

const users = [
  {
    id: 1,
    username: 'pending-user',
    email: 'pending@example.com',
    role: 'USER',
    status: 'PENDING' as const,
    createdAt: new Date().toISOString(),
    lastLoginAt: null,
  },
  {
    id: 2,
    username: 'active-user',
    email: 'active@example.com',
    role: 'USER',
    status: 'ACTIVE' as const,
    createdAt: new Date().toISOString(),
    lastLoginAt: new Date().toISOString(),
  },
];

describe('AdminUsers page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({
      user: {
        id: 99,
        username: 'admin',
        email: 'admin@example.com',
        role: 'SUPERADMIN',
      },
      accessToken: 'token',
      isAuthenticated: true,
    });
    vi.mocked(adminApi.getUsers).mockResolvedValue(users);
    vi.mocked(adminApi.approveUser).mockResolvedValue({
      ...users[0],
      status: 'ACTIVE',
    });
    vi.mocked(adminApi.banUser).mockResolvedValue({
      ...users[1],
      status: 'BANNED',
    });
  });

  it('pending users render in Pending Approvals section', async () => {
    renderAdminUsers();

    await waitFor(() => {
      expect(screen.getAllByText('pending-user')).toHaveLength(2);
      expect(screen.getByText('Review new registrations')).toBeInTheDocument();
    });
  });

  it('Approve button calls correct endpoint', async () => {
    const user = userEvent.setup();
    renderAdminUsers();

    await waitFor(() => {
      expect(screen.getAllByRole('button', { name: 'Approve' }).length).toBeGreaterThan(0);
    });

    await user.click(screen.getAllByRole('button', { name: 'Approve' })[0]);

    await waitFor(() => {
      expect(adminApi.approveUser).toHaveBeenCalledWith(1);
    });
  });

  it('Ban button shows confirmation dialog before calling endpoint', async () => {
    const user = userEvent.setup();
    renderAdminUsers();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Ban' })).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: 'Ban' }));

    expect(screen.getByRole('button', { name: 'Confirm ban' })).toBeInTheDocument();
    expect(adminApi.banUser).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'Confirm ban' }));

    await waitFor(() => {
      expect(adminApi.banUser).toHaveBeenCalledWith(2);
    });
  });
});

function renderAdminUsers() {
  return render(
    <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AdminUsers />
    </MemoryRouter>,
  );
}
