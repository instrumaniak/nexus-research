import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Chat from './Chat';
import * as chatApi from '@/api/chat.api';
import { useAuthStore } from '@/stores/auth.store';
import { useChatStore } from '@/stores/chat.store';

vi.mock('@/api/chat.api', () => ({
  getSessions: vi.fn(),
  getSession: vi.fn(),
  streamChat: vi.fn(),
}));

describe('Chat page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({
      user: {
        id: 1,
        username: 'raziur',
        email: 'raziur@example.com',
        role: 'USER',
      },
      accessToken: 'token',
      isAuthenticated: true,
    });
    useChatStore.setState({
      sessions: [],
      activeSessionId: null,
      messages: [],
      streamingContent: '',
      isStreaming: false,
      mode: 'web',
      progressStep: null,
      progressHistory: [],
      sources: [],
    });
    vi.mocked(chatApi.getSessions).mockResolvedValue([]);
    vi.mocked(chatApi.getSession).mockResolvedValue({
      session: {
        id: 1,
        title: 'Session',
        mode: 'web',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      messages: [],
    });
  });

  it('mode selector: KB Search shows "Coming soon"', async () => {
    await renderChat();

    expect(screen.getByRole('button', { name: /kb search/i })).toHaveAttribute(
      'title',
      'Coming soon',
    );
  });

  it('submitting query with web mode emits correct mode to API', async () => {
    const user = userEvent.setup();
    vi.mocked(chatApi.streamChat).mockResolvedValue();

    await renderChat();

    await user.type(
      screen.getByPlaceholderText(/ask a question or paste a url/i),
      'what is NestJS',
    );
    await user.click(screen.getByRole('button', { name: /send/i }));

    await waitFor(() => {
      expect(chatApi.streamChat).toHaveBeenCalledWith(
        expect.objectContaining({
          query: 'what is NestJS',
          mode: 'web',
          sessionId: null,
        }),
        expect.any(Object),
      );
    });
  });

  it('SSE progress steps render in correct order', async () => {
    const user = userEvent.setup();
    vi.mocked(chatApi.streamChat).mockImplementation(async (_payload, handlers) => {
      handlers.onStep?.('Searching the web...');
      handlers.onStep?.('Reading top results...');
      handlers.onStep?.('Summarising content...');
      handlers.onDone?.([]);
    });

    await renderChat();

    await user.type(
      screen.getByPlaceholderText(/ask a question or paste a url/i),
      'what is NestJS',
    );
    await user.click(screen.getByRole('button', { name: /send/i }));

    await waitFor(() => {
      expect(screen.getByText('Searching the web...')).toBeInTheDocument();
      expect(screen.getByText('Reading top results...')).toBeInTheDocument();
      expect(screen.getByText('Summarising content...')).toBeInTheDocument();
    });

    const progressItems = screen.getAllByRole('listitem');
    expect(progressItems.map((item) => item.textContent)).toEqual([
      'Searching the web...',
      'Reading top results...',
      'Summarising content...',
    ]);
  });
});

async function renderChat() {
  render(
    <MemoryRouter
      initialEntries={['/chat']}
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
    >
      <Routes>
        <Route path="/chat" element={<Chat />} />
        <Route path="/chat/:sessionId" element={<Chat />} />
      </Routes>
    </MemoryRouter>,
  );

  await waitFor(() => {
    expect(chatApi.getSessions).toHaveBeenCalled();
  });
}
