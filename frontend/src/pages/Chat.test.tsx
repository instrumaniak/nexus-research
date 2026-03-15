// frontend/src/pages/Chat.test.tsx
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ChatPage } from './Chat';
import { useAuthStore } from '@/stores/auth.store';
import { useChatStore } from '@/stores/chat.store';
import { ThemeProvider } from '@/components/theme-provider';

const mockSaveItem = vi.fn().mockResolvedValue(undefined);

vi.mock('@/stores/kb.store', () => ({
  useKbStore: Object.assign(
    vi.fn(() => ({})),
    {
      getState: () => ({ saveItem: mockSaveItem }),
    },
  ),
}));

vi.mock('@/api/chat.api', () => ({
  getSessions: vi.fn(async () => []),
  getSession: vi.fn(),
  streamChat: vi.fn(),
}));

describe('Chat page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSaveItem.mockResolvedValue(undefined);
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

  it('Save to KB button on assistant message calls saveItem with title and content', async () => {
    const content = 'This is the full assistant response content.';
    const { getSession } = await import('@/api/chat.api');
    vi.mocked(getSession).mockResolvedValue({
      session: {
        id: 1,
        title: 'Test Session',
        mode: 'web',
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: 'now',
      },
      messages: [
        { id: 1, role: 'assistant', content, sources: [], createdAt: '2026-01-01T00:00:00Z' },
      ],
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

    renderChat(['/chat/1']);

    await waitFor(() => {
      expect(screen.getByText(content)).toBeInTheDocument();
    });

    const saveButton = screen.getByTitle('Save to Knowledge Base');
    await userEvent.setup().click(saveButton);

    await waitFor(() => {
      expect(mockSaveItem).toHaveBeenCalledWith({
        title: 'This is the full assistant response content.',
        content,
      });
    });
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
