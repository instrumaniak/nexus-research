// frontend/src/pages/Chat.test.tsx
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ChatPage } from './Chat';
import { useAuthStore } from '@/stores/auth.store';
import { useChatStore } from '@/stores/chat.store';
import { ThemeProvider } from '@/components/theme-provider';

describe('Chat page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
    });
    useChatStore.setState({
      sessions: [{ id: 1, title: 'Test Session', mode: 'web', updatedAt: 'now' }],
      activeSessionId: null,
      messages: [],
      streamingContent: '',
      isStreaming: false,
      mode: 'web',
      progressStep: null,
      progressHistory: [],
      sources: [],
      pendingInput: '',
    });
  });

  it('renders empty state prompt', () => {
    renderChat();
    expect(screen.getByText(/ask a research question to get started/i)).toBeInTheDocument();
  });

  it('renders footer disclaimer', () => {
    renderChat();
    expect(
      screen.getByText(/nexus may make mistakes\. always verify important information/i),
    ).toBeInTheDocument();
  });
});

function renderChat(initialEntries = ['/chat']) {
  return render(
    <ThemeProvider defaultTheme="light" storageKey="nexus-theme">
      <MemoryRouter
        initialEntries={initialEntries}
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      >
        <Routes>
          <Route path="/chat" element={<ChatPage />} />
          <Route path="/chat/:id" element={<ChatPage />} />
        </Routes>
      </MemoryRouter>
    </ThemeProvider>,
  );
}
