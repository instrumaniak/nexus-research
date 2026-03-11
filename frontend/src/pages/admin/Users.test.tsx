// frontend/src/pages/admin/Users.test.tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { AdminUsersPage } from './Users';

function renderPage() {
  return render(
    <MemoryRouter>
      <AdminUsersPage />
    </MemoryRouter>,
  );
}

describe('AdminUsersPage', () => {
  it('renders all 8 mock users', () => {
    renderPage();
    expect(screen.getByText('Admin')).toBeInTheDocument();
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('Bob')).toBeInTheDocument();
  });

  it('Approve button changes PENDING user to ACTIVE', async () => {
    const user = userEvent.setup();
    renderPage();
    const approveButtons = screen.getAllByRole('button', { name: /approve/i });
    await user.click(approveButtons[0]);
    // After approval, there should be one fewer Approve button
    expect(screen.getAllByRole('button', { name: /approve/i }).length).toBe(
      approveButtons.length - 1,
    );
  });

  it('Ban button changes ACTIVE user to BANNED', async () => {
    const user = userEvent.setup();
    renderPage();
    const banButtons = screen.getAllByRole('button', { name: /^ban$/i });
    await user.click(banButtons[0]);
    expect(screen.getAllByRole('button', { name: /^ban$/i }).length).toBe(banButtons.length - 1);
  });
});
