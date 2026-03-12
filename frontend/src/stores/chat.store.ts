import { create } from 'zustand';
import { getSession, getSessions, streamChat } from '@/api/chat.api';
import type { ChatMode, Source } from '@/types';

export interface ChatSource {
  title: string;
  url: string;
}

export interface Message {
  id: number | string;
  role: 'user' | 'assistant';
  content: string;
  sources: ChatSource[];
}

export interface Session {
  id: number;
  title: string;
  mode: ChatMode;
  updatedAt: string;
}

// Backend returns 'WEB_SEARCH' etc. — map to frontend 'web' | 'kb' | 'deep'
const API_TO_MODE: Record<string, ChatMode> = {
  WEB_SEARCH: 'web',
  KB_SEARCH: 'kb',
  DEEP_RESEARCH: 'deep',
};

// frontend → backend mapping. We implement this in the store layer (not the api layer)
// because `frontend/src/api/*` is off-limits.
const MODE_TO_API: Record<ChatMode, string> = {
  web: 'WEB_SEARCH',
  kb: 'KB_SEARCH',
  deep: 'DEEP_RESEARCH',
};

function formatRelative(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days = Math.floor(diff / 86_400_000);
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days === 1) return 'Yesterday';
  return `${days}d ago`;
}

interface ChatStore {
  sessions: Session[];
  activeSessionId: number | null;
  messages: Message[];
  mode: ChatMode;
  isStreaming: boolean;
  streamingContent: string;
  progressStep: string | null;
  progressHistory: string[];
  sources: ChatSource[];
  pendingInput: string;
  error: string | null;

  // Actions
  setMode: (mode: ChatMode) => void;
  setActiveSession: (id: number | null) => void;
  clearSession: () => void;
  setPendingInput: (text: string) => void;
  clearPendingInput: () => void;

  // Async actions
  fetchSessions: () => Promise<void>;
  loadSession: (id: number) => Promise<void>;
  submitQuery: (query: string, mode: ChatMode, sessionId: number | null) => Promise<void>;
}

export const useChatStore = create<ChatStore>((set, get) => ({
  sessions: [],
  activeSessionId: null,
  messages: [],
  mode: 'web',
  isStreaming: false,
  streamingContent: '',
  progressStep: null,
  progressHistory: [],
  sources: [],
  pendingInput: '',
  error: null,

  setMode: (mode) => set({ mode }),
  setActiveSession: (id) => set({ activeSessionId: id }),
  clearSession: () =>
    set({ activeSessionId: null, messages: [], progressStep: null, sources: [], error: null }),
  setPendingInput: (text) => set({ pendingInput: text }),
  clearPendingInput: () => set({ pendingInput: '' }),

  // ── Fetch session list from API ──────────────────────────────────────────
  fetchSessions: async () => {
    try {
      const data = await getSessions();
      set({
        sessions: data.map((s) => ({
          id: s.id,
          title: s.title,
          mode: API_TO_MODE[s.mode] ?? 'web',
          updatedAt: formatRelative(s.updatedAt),
        })),
      });
    } catch {
      // Non-fatal — session list stays empty or stale
    }
  },

  // ── Load a single session's messages from API ───────────────────────────
  loadSession: async (id) => {
    set({ activeSessionId: id, messages: [], progressStep: null, sources: [], error: null });
    try {
      const detail = await getSession(id);
      set({
        messages: detail.messages.map((m) => ({
          id: m.id,
          role: m.role as 'user' | 'assistant',
          content: m.content,
          sources: m.sources ?? [],
        })),
      });
    } catch {
      set({ error: 'Failed to load session.' });
    }
  },

  // ── Submit a query and stream the response ──────────────────────────────
  submitQuery: async (query, mode, sessionId) => {
    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: query,
      sources: [],
    };

    set((s) => ({
      messages: [...s.messages, userMessage],
      isStreaming: true,
      streamingContent: '',
      progressStep: null,
      progressHistory: [],
      sources: [],
      error: null,
    }));

    let streamError: string | null = null;

    try {
      await streamChat(
        {
          query,
          mode: MODE_TO_API[mode] as unknown as ChatMode,
          sessionId,
        },
        {
          onStep: (message) =>
            set((s) => ({
              progressStep: message,
              progressHistory: [...s.progressHistory, message],
            })),

          onToken: (token) => set((s) => ({ streamingContent: s.streamingContent + token })),

          onDone: (sources: Source[]) => {
            const content = get().streamingContent;
            const assistantMessage: Message = {
              id: `assistant-${Date.now()}`,
              role: 'assistant',
              content,
              sources,
            };
            set((s) => ({
              messages: [...s.messages, assistantMessage],
              isStreaming: false,
              streamingContent: '',
              progressStep: 'Done',
              sources,
            }));
          },

          onError: (message) => {
            streamError = message;
          },
        },
      );
    } catch (err) {
      streamError = err instanceof Error ? err.message : 'Request failed';
    }

    if (streamError) {
      set({ isStreaming: false, streamingContent: '', error: streamError, progressStep: null });
      return;
    }

    await get().fetchSessions();
  },
}));
