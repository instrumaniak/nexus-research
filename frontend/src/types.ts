export type ChatMode = 'web' | 'kb' | 'deep';

export interface User {
  id: number;
  username: string;
  email: string;
  role: string;
}

export interface AuthResponse {
  accessToken: string;
  user: User;
}

export interface Source {
  title: string;
  url: string;
}

export interface Message {
  id: number | string;
  role: 'user' | 'assistant';
  content: string;
  sources: Source[];
  createdAt: string;
}

export interface SessionSummary {
  id: number;
  title: string;
  mode: string;
  createdAt: string;
  updatedAt: string;
  messageCount: number;
}

export interface SessionDetail {
  session: {
    id: number;
    title: string;
    mode: string;
    createdAt: string;
    updatedAt: string;
  };
  messages: Message[];
}

export interface AdminUser {
  id: number;
  username: string;
  email: string;
  role: string;
  status: 'PENDING' | 'ACTIVE' | 'BANNED';
  createdAt: string;
  lastLoginAt: string | null;
}
