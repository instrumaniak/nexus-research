import { create } from 'zustand';
import { ChatMode } from '@/types';

export interface ChatSource {
  title: string;
  url: string;
}
export interface Message {
  id: number;
  role: 'user' | 'assistant';
  content: string;
  sources?: ChatSource[];
}
export interface Session {
  id: number;
  title: string;
  mode: ChatMode;
  updatedAt: string;
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
  setMode: (mode: ChatMode) => void;
  setActiveSession: (id: number | null) => void;
  setMessages: (messages: Message[]) => void;
}

export const useChatStore = create<ChatStore>((set) => ({
  sessions: [
    {
      id: 1,
      title: "Quantum computing's threat to RSA encryption",
      mode: 'web',
      updatedAt: '2h ago',
    },
    {
      id: 2,
      title: 'React Server Components vs traditional SSR',
      mode: 'web',
      updatedAt: 'Yesterday',
    },
    { id: 3, title: 'SQLite in production best practices', mode: 'web', updatedAt: '2d ago' },
    { id: 4, title: 'TypeScript strict mode gotchas explained', mode: 'web', updatedAt: '3d ago' },
    { id: 5, title: 'NestJS dependency injection deep dive', mode: 'web', updatedAt: '5d ago' },
  ],
  activeSessionId: null,
  messages: [],
  mode: 'web',
  isStreaming: false,
  streamingContent: '',
  progressStep: null,
  progressHistory: [],
  sources: [],
  setMode: (mode) => set({ mode }),
  setActiveSession: (id) => set({ activeSessionId: id }),
  setMessages: (messages: Message[]) => set({ messages }),
}));
