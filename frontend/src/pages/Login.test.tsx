import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Login from './Login';
import * as authApi from '@/api/auth.api';
import { useAuthStore } from '@/stores/auth.store';

vi.mock('@/api/auth.api', () => ({
  login: vi.fn(),
}));

describe('Login page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({
      user: null,
      accessToken: null,
      isAuthenticated: false,
    });
  });

  it('empty form shows validation errors', async () => {
    const user = userEvent.setup();

    renderWithRouter();

    await user.click(screen.getByRole('button', { name: /log in/i }));

    expect(screen.getByText('Email is required')).toBeInTheDocument();
    expect(screen.getByText('Password is required')).toBeInTheDocument();
  });

  it('wrong credentials shows "Invalid email or password"', async () => {
    const user = userEvent.setup();
    vi.mocked(authApi.login).mockRejectedValue({
      isAxiosError: true,
      response: { status: 401 },
    });

    renderWithRouter();

    await user.type(screen.getByLabelText('Email'), 'user@example.com');
    await user.type(screen.getByLabelText('Password'), 'wrongpass');
    await user.click(screen.getByRole('button', { name: /log in/i }));

    await waitFor(() => {
      expect(screen.getByText('Invalid email or password')).toBeInTheDocument();
    });
  });

  it('pending account shows pending message', async () => {
    const user = userEvent.setup();
    vi.mocked(authApi.login).mockRejectedValue({
      isAxiosError: true,
      response: {
        status: 403,
        data: { message: 'Account pending approval' },
      },
    });

    renderWithRouter();

    await user.type(screen.getByLabelText('Email'), 'pending@example.com');
    await user.type(screen.getByLabelText('Password'), 'password123');
    await user.click(screen.getByRole('button', { name: /log in/i }));

    await waitFor(() => {
      expect(screen.getByText('Your account is pending approval')).toBeInTheDocument();
    });
  });

  it('successful login redirects to /chat', async () => {
    const user = userEvent.setup();
    vi.mocked(authApi.login).mockResolvedValue({
      accessToken: 'token',
      user: {
        id: 1,
        username: 'raziur',
        email: 'raziur@example.com',
        role: 'USER',
      },
    });

    renderWithRouter();

    await user.type(screen.getByLabelText('Email'), 'raziur@example.com');
    await user.type(screen.getByLabelText('Password'), 'password123');
    await user.click(screen.getByRole('button', { name: /log in/i }));

    await waitFor(() => {
      expect(screen.getByText('Chat page')).toBeInTheDocument();
    });
  });
});

function renderWithRouter() {
  return render(
    <MemoryRouter
      initialEntries={['/login']}
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
    >
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/chat" element={<div>Chat page</div>} />
      </Routes>
    </MemoryRouter>,
  );
}
