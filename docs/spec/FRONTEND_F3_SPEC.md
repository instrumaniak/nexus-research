# Nexus — Phase F3 Spec: API Integration
## (Written from actual codebase — March 2026)

> **For the AI coding agent:** Replace every stub with a real API call. The entire `frontend/src/api/` layer is already written and correct — do not touch those files. Your job is to wire the stores and pages to that layer. Read every section in full before writing a single line of code.

---

## What the agent already built (do NOT touch these files)

| File | Status |
|---|---|
| `frontend/src/api/client.ts` | ✅ Complete — Axios instance + token refresh interceptor |
| `frontend/src/api/auth.api.ts` | ✅ Complete — `login`, `register`, `logout`, `refresh`, `getErrorMessage` |
| `frontend/src/api/chat.api.ts` | ✅ Complete — `streamChat`, `getSessions`, `getSession` |
| `frontend/src/api/admin.api.ts` | ✅ Complete — `getUsers`, `approveUser`, `banUser`, `unbanUser` |
| `frontend/src/types.ts` | ✅ Complete |

---

## Pre-flight: install missing package

Before making any code changes, verify `eventsource-parser` is installed (used by `chat.api.ts`):

```bash
cd frontend
npm ls eventsource-parser
```

If not listed, install it:

```bash
npm install eventsource-parser
```

---

## Critical: mode value mismatch

The frontend `ChatMode` type (`'web' | 'kb' | 'deep'`) does not match the backend's accepted values (`'WEB_SEARCH' | 'KB_SEARCH' | 'DEEP_RESEARCH'`). This would cause a 400 error on every chat submission.

**Fix required in `frontend/src/api/chat.api.ts`** — add a mode mapping before the fetch call:

```typescript
// Add this map at the top of the file (after imports)
const MODE_TO_API: Record<string, string> = {
  web:  'WEB_SEARCH',
  kb:   'KB_SEARCH',
  deep: 'DEEP_RESEARCH',
};

// Then in streamChat(), replace mode: payload.mode with:
mode: MODE_TO_API[payload.mode] ?? payload.mode,
```

Also add a reverse map for reading sessions back from the API — used in the chat store:

```typescript
// Add to chat.store.ts (see Fix 3)
const API_TO_MODE: Record<string, ChatMode> = {
  WEB_SEARCH:    'web',
  KB_SEARCH:     'kb',
  DEEP_RESEARCH: 'deep',
};
```

---

## Fix 1 — Install package + patch `chat.api.ts`

Only two changes to this file:
1. Add `MODE_TO_API` map (shown above)
2. Replace `mode: payload.mode` with `mode: MODE_TO_API[payload.mode] ?? payload.mode`

Everything else in `chat.api.ts` stays exactly as-is.

---

## Fix 2 — `auth.store.ts`: Replace all stubs with real implementations

**Replace the entire file:**

```typescript
// frontend/src/stores/auth.store.ts
import { create } from 'zustand';
import * as authApi from '@/api/auth.api';
import { refresh } from '@/api/auth.api';

interface User {
  id: number;
  name?: string;
  username: string;
  email: string;
  role: 'user' | 'superadmin' | 'USER' | 'SUPERADMIN';
}

interface JwtPayload {
  sub: number;
  email: string;
  role: string;
  exp: number;
}

function decodeJwt(token: string): JwtPayload | null {
  try {
    return JSON.parse(atob(token.split('.')[1])) as JwtPayload;
  } catch {
    return null;
  }
}

interface AuthStore {
  user:             User | null;
  accessToken:      string | null;
  isAuthenticated:  boolean;
  isLoading:        boolean;
  isInitialising:   boolean;   // true during startup session restore

  login:          (email: string, password: string) => Promise<void>;
  logout:         () => Promise<void>;
  initialise:     () => Promise<void>;
  getFreshToken:  () => Promise<string | null>;
  isTokenExpired: () => boolean;
  setAccessToken: (token: string | null) => void;
}

export const useAuthStore = create<AuthStore>((set, get) => ({
  user:            null,
  accessToken:     null,
  isAuthenticated: false,
  isLoading:       false,
  isInitialising:  true,   // starts true — resolved in App.tsx on mount

  // ── Login ───────────────────────────────────────────────────────────────
  login: async (email, password) => {
    set({ isLoading: true });
    try {
      const result = await authApi.login({ email, password });
      set({
        isLoading:       false,
        isAuthenticated: true,
        accessToken:     result.accessToken,
        user: {
          id:       result.user.id,
          username: result.user.username,
          email:    result.user.email,
          role:     result.user.role as User['role'],
        },
      });
    } catch (err) {
      set({ isLoading: false });
      throw err; // re-throw so Login.tsx can display the error
    }
  },

  // ── Logout ──────────────────────────────────────────────────────────────
  logout: async () => {
    try {
      await authApi.logout();
    } catch {
      // ignore — clear local state regardless
    }
    set({ user: null, accessToken: null, isAuthenticated: false });
  },

  // ── Initialise (called once on app mount) ────────────────────────────────
  // Tries to restore the session using the httpOnly refresh cookie.
  // If the cookie is valid, we get a new access token and decode user info.
  // If not, we stay logged out. Either way, isInitialising → false.
  initialise: async () => {
    try {
      const { accessToken } = await refresh();
      const payload = decodeJwt(accessToken);
      if (!payload) throw new Error('Invalid token');

      set({
        isAuthenticated: true,
        accessToken,
        isInitialising:  false,
        user: {
          id:       payload.sub,
          username: payload.email.split('@')[0], // best we can do without /auth/me
          email:    payload.email,
          role:     payload.role as User['role'],
        },
      });
    } catch {
      set({ isAuthenticated: false, user: null, accessToken: null, isInitialising: false });
    }
  },

  // ── Token helpers ────────────────────────────────────────────────────────
  isTokenExpired: () => {
    const token = get().accessToken;
    if (!token) return true;
    const payload = decodeJwt(token);
    if (!payload) return true;
    return payload.exp * 1000 < Date.now() + 30_000; // 30s buffer
  },

  getFreshToken: async () => {
    if (!get().isTokenExpired()) return get().accessToken;
    try {
      const { accessToken } = await refresh();
      get().setAccessToken(accessToken);
      return accessToken;
    } catch {
      await get().logout();
      return null;
    }
  },

  setAccessToken: (token) => set({ accessToken: token }),
}));

export default useAuthStore;
```

---

## Fix 3 — `App.tsx`: Call `initialise()` on mount + show loading state

Add a `useEffect` that calls `initialise()` once on app boot. While initialising, show a full-screen spinner so routes don't flash.

**Replace `App.tsx` entirely:**

```typescript
// frontend/src/App.tsx
import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { LoginPage }      from '@/pages/Login';
import { RegisterPage }   from '@/pages/Register';
import { ChatPage }       from '@/pages/Chat';
import { HistoryPage }    from '@/pages/History';
import { AdminUsersPage } from '@/pages/admin/Users';
import { AppLayout }      from '@/components/layout/AppLayout';
import { RequireAuth }       from '@/components/RequireAuth';
import { RequireSuperadmin } from '@/components/RequireSuperadmin';
import { PublicOnlyRoute }   from '@/components/PublicOnlyRoute';
import { useAuthStore }      from '@/stores/auth.store';

export default function App() {
  const { initialise, isInitialising } = useAuthStore();

  useEffect(() => {
    void initialise();
  }, []);

  // Block all routing until session restore is resolved.
  // Without this, RequireAuth would redirect to /login on a page refresh
  // before the refresh cookie has been checked.
  if (isInitialising) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <span className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login"    element={<PublicOnlyRoute><LoginPage /></PublicOnlyRoute>} />
        <Route path="/register" element={<PublicOnlyRoute><RegisterPage /></PublicOnlyRoute>} />

        <Route element={<RequireAuth />}>
          <Route element={<AppLayout />}>
            <Route index element={<Navigate to="/chat" replace />} />
            <Route path="/chat"     element={<ChatPage />} />
            <Route path="/chat/:id" element={<ChatPage />} />
            <Route path="/history"  element={<HistoryPage />} />
            <Route element={<RequireSuperadmin />}>
              <Route path="/admin/users" element={<AdminUsersPage />} />
            </Route>
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/chat" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
```

---

## Fix 4 — `Login.tsx`: Read real form values, show API errors

The current Login hardcodes `'user@example.com'` and `'password'`. It needs to read the actual form inputs and display errors from the API (pending, banned, wrong credentials).

**Replace the entire file:**

```typescript
// frontend/src/pages/Login.tsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button }      from '@/components/ui/button';
import { Input }       from '@/components/ui/input';
import { Label }       from '@/components/ui/label';
import { ThemeToggle } from '@/components/theme-toggle';
import { useAuthStore } from '@/stores/auth.store';
import { getErrorMessage } from '@/api/auth.api';

export function LoginPage() {
  const navigate = useNavigate();
  const { login, isLoading } = useAuthStore();

  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [error,    setError]    = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await login(email, password);
      navigate('/chat');
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background">
      <div className="w-full max-w-[370px] flex flex-col items-center mb-8">
        <div className="w-10 h-10 mb-4 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
          <span className="text-xl font-bold text-primary">N</span>
        </div>
        <h1 className="text-2xl font-bold text-foreground">Nexus</h1>
        <p className="text-muted-foreground text-sm">AI Research Assistant</p>
      </div>

      <div className="w-full max-w-[370px] bg-card border border-border rounded-xl p-6 shadow-sm">
        <div className="flex flex-col gap-1 mb-6">
          <h2 className="text-xl font-semibold">Sign in</h2>
          <p className="text-sm text-muted-foreground">
            No account?{' '}
            <button
              type="button"
              onClick={() => navigate('/register')}
              className="text-primary cursor-pointer hover:underline font-medium bg-transparent border-0 p-0"
            >
              Request access
            </button>
          </p>
        </div>

        {error && (
          <div className="mb-4 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-[13px] text-destructive">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="name@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Password</Label>
              <span className="text-xs text-muted-foreground">Forgot?</span>
            </div>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <Button type="submit" variant="default" size="lg" className="w-full mt-2" disabled={isLoading}>
            {isLoading ? (
              <span className="flex items-center gap-2">
                <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                Signing in…
              </span>
            ) : (
              'Sign in'
            )}
          </Button>
        </form>
      </div>

      <div className="mt-8">
        <ThemeToggle />
      </div>
    </div>
  );
}

export default LoginPage;
```

---

## Fix 5 — `Register.tsx`: Read real form values, call register API, show errors

The current Register ignores all field values. Wire it to the real API.

**Replace the entire file:**

```typescript
// frontend/src/pages/Register.tsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check }       from 'lucide-react';
import { Button }      from '@/components/ui/button';
import { Input }       from '@/components/ui/input';
import { Label }       from '@/components/ui/label';
import { ThemeToggle } from '@/components/theme-toggle';
import { register, getErrorMessage } from '@/api/auth.api';

export function RegisterPage() {
  const navigate = useNavigate();

  const [username, setUsername] = useState('');
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [error,    setError]    = useState('');
  const [loading,  setLoading]  = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await register({ username, email, password });
      setSubmitted(true);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background">
      <div className="w-full max-w-[370px] flex flex-col items-center mb-8">
        <div className="w-10 h-10 mb-4 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
          <span className="text-xl font-bold text-primary">N</span>
        </div>
        <h1 className="text-2xl font-bold text-foreground">Nexus</h1>
        <p className="text-muted-foreground text-sm">AI Research Assistant</p>
      </div>

      <div className="w-full max-w-[370px] bg-card border border-border rounded-xl p-6 shadow-sm">
        {submitted ? (
          <div className="flex flex-col items-center text-center py-4">
            <div className="w-[44px] h-[44px] rounded-full bg-success/10 flex items-center justify-center mb-5">
              <Check className="text-success" size={20} />
            </div>
            <h2 className="text-xl font-semibold mb-2">Request submitted</h2>
            <p className="text-sm text-foreground/80 leading-relaxed mb-6">
              Your account is <span className="font-medium text-warning">pending approval</span>. An
              administrator will review your request. You'll receive an email once approved.
            </p>
            <Button variant="outline" className="w-full" onClick={() => navigate('/login')}>
              Back to Sign in
            </Button>
          </div>
        ) : (
          <>
            <div className="flex flex-col gap-1 mb-6">
              <h2 className="text-xl font-semibold">Create an account</h2>
              <p className="text-sm text-muted-foreground">
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => navigate('/login')}
                  className="text-primary cursor-pointer hover:underline font-medium bg-transparent border-0 p-0"
                >
                  Sign in
                </button>
              </p>
            </div>

            {error && (
              <div className="mb-4 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-[13px] text-destructive">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  placeholder="alice"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>

              <Button type="submit" variant="default" size="lg" className="w-full mt-2" disabled={loading}>
                {loading ? (
                  <span className="flex items-center gap-2">
                    <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    Requesting…
                  </span>
                ) : (
                  'Request access'
                )}
              </Button>
            </form>
          </>
        )}
      </div>

      <div className="mt-8">
        <ThemeToggle />
      </div>
    </div>
  );
}

export default RegisterPage;
```

---

## Fix 6 — `chat.store.ts`: Replace all stubs with real API calls

This is the most significant change. Remove all mock data. Wire `fetchSessions`, `loadSession`, and `submitQuery` to the real API.

**Replace the entire file:**

```typescript
// frontend/src/stores/chat.store.ts
import { create } from 'zustand';
import { getSessions, getSession, streamChat } from '@/api/chat.api';
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
  WEB_SEARCH:    'web',
  KB_SEARCH:     'kb',
  DEEP_RESEARCH: 'deep',
};

function formatRelative(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins  = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days  = Math.floor(diff / 86_400_000);
  if (mins  < 60)  return `${mins}m ago`;
  if (hours < 24)  return `${hours}h ago`;
  if (days  === 1) return 'Yesterday';
  return `${days}d ago`;
}

interface ChatStore {
  sessions:         Session[];
  activeSessionId:  number | null;
  messages:         Message[];
  mode:             ChatMode;
  isStreaming:      boolean;
  streamingContent: string;
  progressStep:     string | null;
  progressHistory:  string[];
  sources:          ChatSource[];
  pendingInput:     string;
  error:            string | null;

  // Actions
  setMode:            (mode: ChatMode) => void;
  setActiveSession:   (id: number | null) => void;
  clearSession:       () => void;
  setPendingInput:    (text: string) => void;
  clearPendingInput:  () => void;

  // Async actions
  fetchSessions:  () => Promise<void>;
  loadSession:    (id: number) => Promise<void>;
  submitQuery:    (query: string, mode: ChatMode, sessionId: number | null) => Promise<void>;
}

export const useChatStore = create<ChatStore>((set, get) => ({
  sessions:         [],
  activeSessionId:  null,
  messages:         [],
  mode:             'web',
  isStreaming:      false,
  streamingContent: '',
  progressStep:     null,
  progressHistory:  [],
  sources:          [],
  pendingInput:     '',
  error:            null,

  setMode:           (mode) => set({ mode }),
  setActiveSession:  (id) => set({ activeSessionId: id }),
  clearSession:      () => set({ activeSessionId: null, messages: [], progressStep: null, sources: [], error: null }),
  setPendingInput:   (text) => set({ pendingInput: text }),
  clearPendingInput: () => set({ pendingInput: '' }),

  // ── Fetch session list from API ──────────────────────────────────────────
  fetchSessions: async () => {
    try {
      const data = await getSessions();
      set({
        sessions: data.map((s) => ({
          id:        s.id,
          title:     s.title,
          mode:      API_TO_MODE[s.mode] ?? 'web',
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
          id:      m.id,
          role:    m.role as 'user' | 'assistant',
          content: m.content,
          sources: m.sources ?? [],
        })),
      });
    } catch {
      set({ error: 'Failed to load session.' });
    }
  },

  // ── Submit a query and stream the response ──────────────────────────────
  //
  // Flow:
  // 1. Append user message immediately (optimistic)
  // 2. Set isStreaming = true, reset streaming state
  // 3. Call streamChat — accumulate tokens in streamingContent
  // 4. On onDone: commit assistant message, refresh session list
  // 5. On error: show error message
  //
  // The CALLER (Chat.tsx) is responsible for post-submit navigation
  // (e.g., navigating to /chat/:id after a new session is created).
  // submitQuery resolves after the stream completes and sessions are refreshed.
  submitQuery: async (query, mode, sessionId) => {
    // Immediately show user message
    const userMessage: Message = {
      id:      `user-${Date.now()}`,
      role:    'user',
      content: query,
      sources: [],
    };

    set((s) => ({
      messages:         [...s.messages, userMessage],
      isStreaming:      true,
      streamingContent: '',
      progressStep:     null,
      progressHistory:  [],
      sources:          [],
      error:            null,
    }));

    let streamError: string | null = null;

    try {
      await streamChat(
        { query, mode, sessionId },
        {
          onStep: (message) =>
            set((s) => ({
              progressStep:    message,
              progressHistory: [...s.progressHistory, message],
            })),

          onToken: (token) =>
            set((s) => ({ streamingContent: s.streamingContent + token })),

          onDone: (sources: Source[]) => {
            // Commit the streamed content as an assistant message
            const content = get().streamingContent;
            const assistantMessage: Message = {
              id:      `assistant-${Date.now()}`,
              role:    'assistant',
              content,
              sources,
            };
            set((s) => ({
              messages:         [...s.messages, assistantMessage],
              isStreaming:      false,
              streamingContent: '',
              progressStep:     'Done',
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

    // Handle error state
    if (streamError) {
      set({ isStreaming: false, streamingContent: '', error: streamError, progressStep: null });
      return;
    }

    // Refresh session list so sidebar shows the new/updated session
    await get().fetchSessions();
  },
}));
```

---

## Fix 7 — `AppLayout.tsx`: Fetch sessions on mount

The AppLayout is the shell that wraps all authenticated pages. Fetch the session list here so the sidebar populates immediately after login and on every page refresh.

**Add a `useEffect` to the existing `AppLayout.tsx`:**

```typescript
// frontend/src/components/layout/AppLayout.tsx
import { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { useState } from 'react';
import { useChatStore } from '@/stores/chat.store';

export function AppLayout() {
  const [collapsed, setCollapsed] = useState(true);
  const fetchSessions = useChatStore((s) => s.fetchSessions);

  useEffect(() => {
    void fetchSessions();
  }, [fetchSessions]);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} />
      <main className="flex flex-1 flex-col overflow-hidden">
        <Outlet />
      </main>
    </div>
  );
}
```

---

## Fix 8 — `Sidebar.tsx`: Wire logout to call async store action

The current sidebar calls `logout()` directly. Since `logout` is now `async` (it calls the API), the button handler needs to `void` it. Also replace the user display to show `user.email` as fallback when `user.name` is missing (which happens after page refresh, since the refresh token response doesn't include the username).

**Only two changes — do not rewrite the whole file:**

```typescript
// Change 1: logout button handler
// Find the logout button and change the onClick to:
onClick={() => { void logout(); }}

// Change 2: user display in the footer — update userInitial to fallback to email
const userInitial = user?.name
  ? user.name.charAt(0).toUpperCase()
  : user?.username
    ? user.username.charAt(0).toUpperCase()
    : user?.email
      ? user.email.charAt(0).toUpperCase()
      : 'U';
```

---

## Fix 9 — `Chat.tsx`: Wire `handleSend` to `submitQuery`, render streaming UI

This is the most visual change. The component needs to:

1. Call `submitQuery` on submit
2. Show the streaming content as a growing assistant bubble
3. Show the SSE progress steps during the stream
4. Navigate to the new session URL after a new session is created

**Replace the entire file:**

```typescript
// frontend/src/pages/Chat.tsx
import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Globe, Database, FlaskConical, Send, ExternalLink, Loader2 } from 'lucide-react';
import { cn } from '@/lib/cn';
import { useChatStore } from '@/stores/chat.store';
import { Textarea } from '@/components/ui/textarea';

export function ChatPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const {
    sessions,
    messages,
    mode,
    setMode,
    isStreaming,
    streamingContent,
    progressStep,
    sources,
    error,
    loadSession,
    clearSession,
    submitQuery,
    pendingInput,
    clearPendingInput,
  } = useChatStore();

  const [input, setInput]   = useState('');
  const scrollRef           = useRef<HTMLDivElement>(null);
  const textareaRef         = useRef<HTMLTextAreaElement>(null);

  const currentSession = sessions.find((s) => s.id === Number(id));

  // Load or clear session when URL param changes
  useEffect(() => {
    if (id) {
      void loadSession(Number(id));
    } else {
      clearSession();
    }
  }, [id, loadSession, clearSession]);

  // Pick up pending input from suggestion cards
  useEffect(() => {
    if (pendingInput) {
      setInput(pendingInput);
      clearPendingInput();
      textareaRef.current?.focus();
    }
  }, [pendingInput, clearPendingInput]);

  // Auto-scroll to bottom as messages/stream update
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, streamingContent, isStreaming]);

  // Auto-resize textarea
  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    const el = e.target;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 144)}px`; // capped at 6 lines
  };

  const handleSend = async () => {
    const query = input.trim();
    if (!query || isStreaming) return;
    setInput('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';

    const sessionId = id ? Number(id) : null;

    await submitQuery(query, mode, sessionId);

    // After stream completes, navigate to the new session if we were on /chat
    if (!id) {
      const { sessions } = useChatStore.getState();
      if (sessions[0]) {
        navigate(`/chat/${sessions[0].id}`, { replace: true });
      }
    }
  };

  const isEmptyState = !id && messages.length === 0 && !isStreaming;

  return (
    <div className="flex flex-col h-full bg-background relative overflow-hidden">

      {/* ── Top Bar ─────────────────────────────────────────────────────── */}
      <div className="h-[52px] border-b border-border flex items-center justify-between px-5 shrink-0 bg-background/80 backdrop-blur-sm z-10">
        <div className="flex items-center gap-3 overflow-hidden">
          {currentSession && (
            <h2 className="text-sm font-medium text-foreground truncate max-w-[300px] md:max-w-[500px]">
              {currentSession.title}
            </h2>
          )}
        </div>
        <div className="flex items-center gap-2">
          {/* Web Search pill — active */}
          <button
            onClick={() => setMode('web')}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-medium border transition-all',
              mode === 'web'
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-border text-muted-foreground hover:border-muted-foreground',
            )}
          >
            <Globe size={11} /> Web Search
          </button>
          {/* KB Search — disabled in Phase 1 */}
          <button
            disabled
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-medium border border-border text-muted-foreground opacity-40 cursor-not-allowed"
          >
            <Database size={11} /> KB Search <span className="text-[9px] opacity-60">· P2</span>
          </button>
          {/* Deep Research — disabled in Phase 1 */}
          <button
            disabled
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-medium border border-border text-muted-foreground opacity-40 cursor-not-allowed"
          >
            <FlaskConical size={11} /> Deep Research <span className="text-[9px] opacity-60">· P2</span>
          </button>
        </div>
      </div>

      {/* ── Message Area ─────────────────────────────────────────────────── */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto py-7">
        <div className="max-w-[700px] mx-auto px-6 flex flex-col gap-6">

          {/* Empty state */}
          {isEmptyState && (
            <div className="flex flex-col items-center justify-center h-full min-h-[400px] gap-3 text-center">
              <p className="text-4xl font-semibold text-muted-foreground/30 select-none">Nexus</p>
              <p className="text-sm text-muted-foreground">Ask a research question to get started.</p>
            </div>
          )}

          {/* API error */}
          {error && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-[13px] text-destructive">
              {error}
            </div>
          )}

          {/* Messages */}
          {messages.map((m) => (
            <div
              key={m.id}
              className={cn('flex gap-4', m.role === 'user' ? 'justify-end' : 'justify-start')}
            >
              {m.role === 'assistant' && (
                <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0 mt-1">
                  <span className="text-xs font-bold text-primary">N</span>
                </div>
              )}
              <div className={cn('flex flex-col gap-2 max-w-[85%]', m.role === 'user' ? 'items-end' : 'items-start')}>
                <div
                  className={cn(
                    'px-4 py-3 rounded-2xl text-[14.5px] leading-relaxed whitespace-pre-wrap',
                    m.role === 'user'
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'bg-card border border-border text-foreground shadow-sm',
                  )}
                >
                  {m.content}
                </div>
                {m.role === 'assistant' && m.sources && m.sources.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-1">
                    <span className="w-full text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Sources</span>
                    {m.sources.map((s, i) => (
                      <a
                        key={i}
                        href={s.url}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1.5 px-2 py-1 bg-muted/50 border border-border rounded-md text-[11px] text-muted-foreground hover:text-primary hover:border-primary/30 transition-colors"
                      >
                        <ExternalLink size={10} />
                        {s.title}
                      </a>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}

          {/* Streaming assistant bubble */}
          {isStreaming && (
            <div className="flex gap-4 justify-start">
              <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0 mt-1">
                <span className="text-xs font-bold text-primary">N</span>
              </div>
              <div className="flex flex-col gap-2 max-w-[85%]">
                {/* Progress steps */}
                {progressStep && !streamingContent && (
                  <div className="flex items-center gap-2 text-[11px] text-muted-foreground px-1">
                    <Loader2 size={11} className="animate-spin shrink-0" />
                    <span>{progressStep}</span>
                  </div>
                )}
                {/* Streaming content */}
                {streamingContent && (
                  <div className="bg-card border border-border px-4 py-3 rounded-2xl text-[14.5px] leading-relaxed text-foreground shadow-sm whitespace-pre-wrap">
                    {streamingContent}
                    <span className="inline-block w-[2px] h-[1em] bg-primary/60 ml-0.5 animate-pulse align-middle" />
                  </div>
                )}
                {/* Typing dots when no content yet */}
                {!streamingContent && !progressStep && (
                  <div className="bg-card border border-border px-4 py-3 rounded-2xl">
                    <div className="flex gap-1">
                      <span className="w-1.5 h-1.5 bg-primary/40 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-1.5 h-1.5 bg-primary/40 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-1.5 h-1.5 bg-primary/40 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

        </div>
      </div>

      {/* ── Input Bar ────────────────────────────────────────────────────── */}
      <div className="shrink-0 p-4 md:px-8 md:pb-8 bg-gradient-to-t from-background via-background to-transparent pt-6">
        <div className="max-w-[700px] mx-auto flex flex-col gap-3">
          <div className="relative">
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={handleTextareaChange}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  void handleSend();
                }
              }}
              placeholder="Type your research question…"
              className="pr-12 min-h-[56px] py-4 bg-card shadow-lg border-border focus-visible:border-primary/40 transition-all resize-none overflow-hidden"
              rows={1}
              disabled={isStreaming}
            />
            <button
              onClick={() => void handleSend()}
              disabled={!input.trim() || isStreaming}
              className="absolute right-3 bottom-3 w-8 h-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primary/90 transition-colors shadow-sm"
            >
              {isStreaming ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
            </button>
          </div>
          <p className="text-[11px] text-center text-muted-foreground/50">
            Nexus may make mistakes. Always verify important information from sources.
          </p>
        </div>
      </div>
    </div>
  );
}

export default ChatPage;
```

---

## Fix 10 — `admin/Users.tsx`: Replace mock data with real API

Keep the existing visual design (the tabbed card layout). Replace the local `useState(MOCK_USERS)` with real API calls using the existing `admin.api.ts`.

**Replace the entire file:**

```typescript
// frontend/src/pages/admin/Users.tsx
import { useEffect, useState, useMemo } from 'react';
import { Check, Ban, RotateCcw, Loader2 } from 'lucide-react';
import { cn } from '@/lib/cn';
import { Badge } from '@/components/ui/badge';
import { getUsers, approveUser, banUser, unbanUser } from '@/api/admin.api';
import type { AdminUser } from '@/types';

type TabFilter = 'all' | 'pending';

function statusBadgeVariant(status: AdminUser['status']) {
  if (status === 'ACTIVE')  return 'success'     as const;
  if (status === 'PENDING') return 'warning'     as const;
  return 'destructive' as const;
}

export function AdminUsersPage() {
  const [users,     setUsers]     = useState<AdminUser[]>([]);
  const [tab,       setTab]       = useState<TabFilter>('all');
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const data = await getUsers();
        if (active) setUsers(data);
      } catch {
        if (active) setError('Failed to load users.');
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, []);

  const pendingCount  = useMemo(() => users.filter((u) => u.status === 'PENDING').length, [users]);
  const visibleUsers  = useMemo(
    () => tab === 'pending' ? users.filter((u) => u.status === 'PENDING') : users,
    [users, tab],
  );

  // Optimistic update helper
  const optimisticUpdate = async (
    id: number,
    optimistic: (u: AdminUser) => AdminUser,
    request: () => Promise<AdminUser>,
  ) => {
    const prev = users;
    setUsers((cur) => cur.map((u) => (u.id === id ? optimistic(u) : u)));
    try {
      const updated = await request();
      setUsers((cur) => cur.map((u) => (u.id === id ? updated : u)));
    } catch {
      setUsers(prev);
      setError('Failed to update user. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center bg-background">
        <Loader2 className="text-muted-foreground animate-spin" size={24} />
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto bg-background p-8">
      <div className="max-w-[900px] mx-auto">

        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-xl font-semibold text-foreground">User Management</h1>
            <p className="text-sm text-muted-foreground mt-0.5">{users.length} total users</p>
          </div>
          {pendingCount > 0 && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-warning/10 border border-warning/20">
              <span className="w-2 h-2 rounded-full bg-warning shrink-0" />
              <span className="text-[12.5px] font-medium text-warning">{pendingCount} pending approval</span>
            </div>
          )}
        </div>

        {error && (
          <div className="mb-4 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-[13px] text-destructive">
            {error}
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 border-b border-border mb-4">
          {(['all', 'pending'] as TabFilter[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                'px-4 py-2 text-[13px] rounded-t-md border-b-2 -mb-px transition-colors',
                tab === t
                  ? 'border-primary text-foreground font-medium'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted',
              )}
            >
              {t === 'all' ? `All Users (${users.length})` : `Pending (${pendingCount})`}
            </button>
          ))}
        </div>

        {/* Table */}
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-muted border-b border-border">
                {['User', 'Status', 'Role', 'Joined', 'Actions'].map((h) => (
                  <th key={h} className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visibleUsers.map((user, i) => (
                <tr
                  key={user.id}
                  className={cn(
                    'hover:bg-muted/40 transition-colors',
                    i < visibleUsers.length - 1 && 'border-b border-border',
                  )}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className={cn(
                        'w-[30px] h-[30px] rounded-full flex items-center justify-center shrink-0',
                        user.role.toUpperCase() === 'SUPERADMIN' ? 'bg-primary/10' : 'bg-muted',
                      )}>
                        <span className={cn(
                          'text-[12px] font-semibold',
                          user.role.toUpperCase() === 'SUPERADMIN' ? 'text-primary' : 'text-muted-foreground',
                        )}>
                          {user.username.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <div className="text-[13px] font-medium text-foreground">{user.username}</div>
                        <div className="text-[11.5px] text-muted-foreground">{user.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={statusBadgeVariant(user.status)}>
                      <span className={cn(
                        'w-1.5 h-1.5 rounded-full mr-1.5',
                        user.status === 'ACTIVE'  && 'bg-success',
                        user.status === 'PENDING' && 'bg-warning',
                        user.status === 'BANNED'  && 'bg-destructive',
                      )} />
                      {user.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn('text-[13px]', user.role.toUpperCase() === 'SUPERADMIN' ? 'text-primary font-medium' : 'text-muted-foreground')}>
                      {user.role.toUpperCase() === 'SUPERADMIN' ? 'Superadmin' : 'User'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-[13px] text-muted-foreground">
                    {new Date(user.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    {user.role.toUpperCase() !== 'SUPERADMIN' && (
                      <div className="flex gap-2">
                        {user.status === 'PENDING' && (
                          <button
                            onClick={() => optimisticUpdate(user.id, (u) => ({ ...u, status: 'ACTIVE' }), () => approveUser(user.id))}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[12px] font-medium bg-success/10 text-success hover:bg-success/20 transition-colors"
                          >
                            <Check size={11} /> Approve
                          </button>
                        )}
                        {user.status === 'ACTIVE' && (
                          <button
                            onClick={() => optimisticUpdate(user.id, (u) => ({ ...u, status: 'BANNED' }), () => banUser(user.id))}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[12px] font-medium bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors"
                          >
                            <Ban size={11} /> Ban
                          </button>
                        )}
                        {user.status === 'BANNED' && (
                          <button
                            onClick={() => optimisticUpdate(user.id, (u) => ({ ...u, status: 'ACTIVE' }), () => unbanUser(user.id))}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[12px] font-medium bg-muted text-muted-foreground hover:bg-muted/80 transition-colors"
                          >
                            <RotateCcw size={11} /> Unban
                          </button>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              ))}

              {visibleUsers.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-sm text-muted-foreground">
                    {tab === 'pending' ? 'No pending approvals.' : 'No users found.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

      </div>
    </div>
  );
}
```

---

## Implementation Order

Execute strictly in this sequence:

1. **Install package** — `npm ls eventsource-parser` → install if missing
2. **Fix `chat.api.ts`** (Fix 1 — mode mapping only, 3 lines)
3. **Replace `auth.store.ts`** (Fix 2)
4. **Replace `App.tsx`** (Fix 3)
5. **Replace `Login.tsx`** (Fix 4)
6. **Replace `Register.tsx`** (Fix 5)
7. **Replace `chat.store.ts`** (Fix 6)
8. **Update `AppLayout.tsx`** (Fix 7)
9. **Update `Sidebar.tsx`** (Fix 8 — two small changes only)
10. **Replace `Chat.tsx`** (Fix 9)
11. **Replace `admin/Users.tsx`** (Fix 10)
12. **Run `npm run build`** — must pass with zero type errors
13. **Run `npm run lint`** — must pass with zero errors

---

## Acceptance Checklist

### Auth
- [ ] Login with wrong credentials shows error message under the form
- [ ] Login with correct credentials navigates to `/chat` and the sidebar shows sessions
- [ ] Register with an already-taken email shows the error from the API
- [ ] Register with valid details shows the pending-approval success screen
- [ ] Page refresh restores auth state — no redirect to `/login` for active sessions
- [ ] Page refresh on `/admin/users` stays on admin page (session restored correctly)
- [ ] Logout button calls the API and redirects to `/login`
- [ ] After logout, visiting `/chat` redirects to `/login`

### Chat
- [ ] Submitting a query shows the user message immediately
- [ ] Progress steps appear while the backend is working (Searching... Reading... Summarising...)
- [ ] Tokens stream in character by character into the assistant bubble
- [ ] After streaming completes, sources chips appear below the assistant message
- [ ] After a new session is created, the URL updates to `/chat/:id`
- [ ] The sidebar session list updates after each new query
- [ ] Opening a session from the sidebar loads real messages from the API
- [ ] Submitting in an existing session appends to it (URL stays at `/chat/:id`)
- [ ] Textarea auto-resizes up to 6 lines; Enter submits, Shift+Enter inserts newline

### Admin
- [ ] Admin page loads real users from the API
- [ ] Approve button calls the real API endpoint and updates the row
- [ ] Ban button calls the real API endpoint and updates the row
- [ ] Unban button calls the real API endpoint and updates the row
- [ ] A failed API call rolls back the optimistic update and shows an error

### Build
- [ ] `npm run build` — zero TypeScript errors
- [ ] `npm run lint` — zero errors
- [ ] No `console.error` in browser console during normal usage
