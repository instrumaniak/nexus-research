import { create } from 'zustand';
import type { ChatMode, Message, SessionSummary, Source } from '@/types';

interface ChatState {
  sessions: SessionSummary[];
  activeSessionId: number | null;
  messages: Message[];
  streamingContent: string;
  isStreaming: boolean;
  mode: ChatMode;
  progressStep: string | null;
  progressHistory: string[];
  sources: Source[];
  setMode: (mode: ChatMode) => void;
  startStream: (query: string) => void;
  appendToken: (token: string) => void;
  finaliseStream: (sources: Source[]) => void;
  setProgressStep: (message: string) => void;
  setSessions: (sessions: SessionSummary[]) => void;
  setActiveSession: (id: number | null, messages: Message[]) => void;
  addSession: (session: SessionSummary) => void;
  setActiveSessionId: (id: number | null) => void;
  setMessages: (messages: Message[]) => void;
  resetConversation: () => void;
}

export const useChatStore = create<ChatState>((set) => ({
  sessions: [],
  activeSessionId: null,
  messages: [],
  streamingContent: '',
  isStreaming: false,
  mode: 'WEB_SEARCH',
  progressStep: null,
  progressHistory: [],
  sources: [],
  setMode: (mode) => set({ mode }),
  startStream: (query) =>
    set((state) => ({
      messages: [
        ...state.messages,
        {
          id: `user-${Date.now()}`,
          role: 'user',
          content: query,
          sources: [],
          createdAt: new Date().toISOString(),
        },
      ],
      streamingContent: '',
      isStreaming: true,
      progressStep: null,
      progressHistory: [],
      sources: [],
    })),
  appendToken: (token) =>
    set((state) => ({
      streamingContent: `${state.streamingContent}${token}`,
    })),
  finaliseStream: (sources) =>
    set((state) => ({
      messages: [
        ...state.messages,
        {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content: state.streamingContent,
          sources,
          createdAt: new Date().toISOString(),
        },
      ],
      streamingContent: '',
      isStreaming: false,
      progressStep: null,
      sources,
    })),
  setProgressStep: (message) =>
    set((state) => ({
      progressStep: message,
      progressHistory: [...state.progressHistory, message],
    })),
  setSessions: (sessions) => set({ sessions }),
  setActiveSession: (id, messages) =>
    set({
      activeSessionId: id,
      messages,
      streamingContent: '',
      isStreaming: false,
      progressStep: null,
      progressHistory: [],
      sources: [],
    }),
  addSession: (session) =>
    set((state) => ({
      sessions: [session, ...state.sessions.filter((item) => item.id !== session.id)],
    })),
  setActiveSessionId: (id) => set({ activeSessionId: id }),
  setMessages: (messages) => set({ messages }),
  resetConversation: () =>
    set({
      activeSessionId: null,
      messages: [],
      streamingContent: '',
      isStreaming: false,
      progressStep: null,
      progressHistory: [],
      sources: [],
    }),
}));
