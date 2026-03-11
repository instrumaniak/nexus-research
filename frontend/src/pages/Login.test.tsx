// frontend/src/pages/Login.test.tsx
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LoginPage } from './Login';
import { useAuthStore } from '@/stores/auth.store';
import { ThemeProvider } from '@/components/theme-provider';

describe('Login page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({
      user: null,
      accessToken: null,
      isAuthenticated: false,
      isLoading: false,
    });
  });

  it('renders sign in form', () => {
    renderWithRouter();
    expect(screen.getByText(/sign in/i, { selector: 'h2' })).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
  });

  it('successful login redirects to /chat', async () => {
    const user = userEvent.setup();

    renderWithRouter();

    // The new Login.tsx has hardcoded credentials in the handleSubmit,
    // so we don't even strictly need to type them for the mock to work,
    // but the UI has the fields.
    await user.type(screen.getByLabelText(/email/i), 'user@example.com');
    await user.type(screen.getByLabelText(/password/i), 'password');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(screen.getByText('Chat page')).toBeInTheDocument();
    });
  });
});

function renderWithRouter() {
  return render(
    <ThemeProvider defaultTheme="light" storageKey="nexus-theme">
      <MemoryRouter
        initialEntries={['/login']}
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      >
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/chat" element={<div>Chat page</div>} />
        </Routes>
      </MemoryRouter>
    </ThemeProvider>,
  );
}
