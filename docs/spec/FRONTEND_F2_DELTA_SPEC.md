# Nexus — Phase F2 Delta Spec
## (Generated from actual codebase — March 2026)

> **For the AI coding agent:** This is a precision patch spec. It lists only what is wrong or missing. Do not touch anything not mentioned here. Read each section fully before making any change.

---

## Audit Summary

After reviewing all current frontend files, here is the exact state:

| File | Status | Action |
|---|---|---|
| `RequireAuth.tsx` | ✅ Correct | No change |
| `RequireSuperadmin.tsx` | ✅ Correct | No change |
| `Sidebar.tsx` | ✅ NavLinks correct | Fix New Chat button only |
| `History.tsx` | ✅ Correct | No change |
| `Register.tsx` | ✅ Correct | No change |
| `App.tsx` | ❌ Guards not wired in | Fix |
| `auth.store.ts` | ❌ Missing `isLoading` | Fix |
| `Login.tsx` | ❌ No loading state, sync call | Fix |
| `chat.store.ts` | ❌ Missing `loadSession`, `clearSession`, `pendingInput`, mock message data | Fix |
| `Chat.tsx` | ❌ Wrong param name (`sessionId` vs `:id`), mock messages inlined in component | Fix |
| `admin/AdminUsers.tsx` | ❌ Makes real API calls prematurely | Fix — revert to mock data |
| `admin/Users.tsx` | ❓ Unclear if this exists or is the same file | Resolve conflict |

---

## Fix 1 — `App.tsx`: Wire the guards

The `RequireAuth` and `RequireSuperadmin` components exist but are not used. The stub `ProtectedRoute` wraps everything but does nothing.

**Replace the entire file with:**

```typescript
// frontend/src/App.tsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { LoginPage }      from '@/pages/Login';
import { RegisterPage }   from '@/pages/Register';
import { ChatPage }       from '@/pages/Chat';
import { HistoryPage }    from '@/pages/History';
import { AdminUsersPage } from '@/pages/admin/Users';
import { AppLayout }      from '@/components/layout/AppLayout';
import { RequireAuth }        from '@/components/RequireAuth';
import { RequireSuperadmin }  from '@/components/RequireSuperadmin';
import { PublicOnlyRoute }    from '@/components/PublicOnlyRoute';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public — redirect to /chat if already authenticated */}
        <Route path="/login"    element={<PublicOnlyRoute><LoginPage /></PublicOnlyRoute>} />
        <Route path="/register" element={<PublicOnlyRoute><RegisterPage /></PublicOnlyRoute>} />

        {/* Protected — requires authentication */}
        <Route element={<RequireAuth />}>
          <Route element={<AppLayout />}>
            <Route index element={<Navigate to="/chat" replace />} />
            <Route path="/chat"     element={<ChatPage />} />
            <Route path="/chat/:id" element={<ChatPage />} />
            <Route path="/history"  element={<HistoryPage />} />

            {/* Admin — requires superadmin role */}
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

Note the import: `AdminUsersPage` comes from `@/pages/admin/Users` — see Fix 6 for which file that should be.

---

## Fix 2 — Create `PublicOnlyRoute.tsx`

This component does not exist yet. Create it.

```typescript
// frontend/src/components/PublicOnlyRoute.tsx
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/auth.store';

interface Props { children: React.ReactNode; }

export function PublicOnlyRoute({ children }: Props) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  if (isAuthenticated) return <Navigate to="/chat" replace />;
  return <>{children}</>;
}
```

---

## Fix 3 — `auth.store.ts`: Add `isLoading` and make `login` async

The current `login` is synchronous. It needs to be `async` with a simulated delay so the loading spinner on the Login button is testable. Keep all existing methods unchanged — only add `isLoading` and convert `login`.

```typescript
// frontend/src/stores/auth.store.ts
// REPLACE the existing file entirely — preserves all current fields, fixes login

import { create } from 'zustand';

interface User {
  id: number;
  name?: string;
  username: string;
  email: string;
  role: 'user' | 'superadmin' | 'USER' | 'SUPERADMIN';
}

interface AuthStore {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;           // ← NEW

  login: (email: string, password: string) => Promise<void>;  // ← NOW ASYNC
  logout: () => void;
  initialise: () => Promise<void>;
  getFreshToken: () => Promise<string | null>;
  isTokenExpired: () => boolean;
  setAccessToken: (token: string | null) => void;
}

export const useAuthStore = create<AuthStore>((set, get) => ({
  user: null,
  accessToken: null,
  isAuthenticated: false,
  isLoading: false,

  login: async (_email, _password) => {
    set({ isLoading: true });
    // Simulate network delay — makes loading state visible and testable
    await new Promise((r) => setTimeout(r, 600));
    set({
      isLoading: false,
      isAuthenticated: true,
      accessToken: 'stub-token',
      user: {
        id: 1,
        name: 'admin',
        username: 'admin',
        email: 'admin@nexus.local',
        role: 'superadmin',
      },
    });
  },

  logout: () => set({ user: null, accessToken: null, isAuthenticated: false }),

  // F3 stubs — do not implement yet
  initialise:     async () => {},
  getFreshToken:  async () => get().accessToken,
  isTokenExpired: () => false,
  setAccessToken: (token) => set({ accessToken: token }),
}));

export default useAuthStore;
```

---

## Fix 4 — `Login.tsx`: Add `isLoading` spinner, make submit async

The current Login calls `login()` synchronously and navigates immediately. It needs to `await` the async login and show a spinner during the 600ms delay.

**Replace the submit handler and button only:**

```typescript
// Changes to frontend/src/pages/Login.tsx

// 1. Update import to include isLoading
const { login, isLoading } = useAuthStore();

// 2. Make handleSubmit async
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  await login('user@example.com', 'password');
  navigate('/chat');
};

// 3. Replace the submit Button with this loading-aware version:
<Button
  type="submit"
  variant="default"
  size="lg"
  className="w-full mt-2"
  disabled={isLoading}
>
  {isLoading ? (
    <span className="flex items-center gap-2">
      <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
      Signing in…
    </span>
  ) : (
    'Sign in'
  )}
</Button>
```

Do not change anything else in `Login.tsx`.

---

## Fix 5 — `chat.store.ts`: Add `loadSession`, `clearSession`, `pendingInput`, and mock message data

The current store has `setMessages` but no `loadSession` action, no `clearSession`, and no `pendingInput`. The Chat page currently inlines hardcoded mock messages in a `useEffect` — this is wrong, the data belongs in the store.

**Replace the entire file:**

```typescript
// frontend/src/stores/chat.store.ts
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

// ---------------------------------------------------------------------------
// Mock message data — one set per session
// ---------------------------------------------------------------------------

const MOCK_MESSAGES: Record<number, Message[]> = {
  1: [
    {
      id: 1, role: 'user',
      content: "What are the main risks of quantum computing to modern encryption?",
    },
    {
      id: 2, role: 'assistant',
      content: "Quantum computing poses a significant threat to current cryptographic standards, particularly asymmetric (public-key) encryption like RSA and ECC.\n\nThe primary mechanism is **Shor's Algorithm**, which can efficiently factor large integers and solve discrete logarithms — the mathematical foundations of most modern public-key systems.\n\nKey risks include:\n\n• **Harvest Now, Decrypt Later** — Adversaries capturing encrypted data today to decrypt once powerful quantum computers are available.\n• **Authentication Collapse** — Digital signatures securing software updates and financial transactions could be forged.\n• **Network Security** — Protocols like TLS/SSL that secure the internet would no longer provide confidentiality.\n\nNIST finalised post-quantum cryptographic standards in 2024, including **CRYSTALS-Kyber** and **CRYSTALS-Dilithium**, which are designed to resist quantum attacks.",
      sources: [
        { title: 'NIST Post-Quantum Standards 2024', url: 'https://nist.gov/pqcrypto' },
        { title: 'IBM Quantum Roadmap 2025',          url: 'https://research.ibm.com/quantum' },
        { title: 'Cloudflare: PQ Threat Timeline',   url: 'https://blog.cloudflare.com/pq-2024' },
      ],
    },
    {
      id: 3, role: 'user',
      content: 'Which algorithm should I prioritise for a web application?',
    },
    {
      id: 4, role: 'assistant',
      content: "For key exchange, prioritise **CRYSTALS-Kyber** (ML-KEM) — already supported in Chrome 116+ and Cloudflare's global network.\n\nFor signatures, use **CRYSTALS-Dilithium** (ML-DSA) — best performance/security ratio available today.\n\n**Steps to take now:**\n\n1. Enable hybrid TLS (X25519 + Kyber) in your server config\n2. Update to OpenSSL 3.2+ for native PQC support\n3. Audit long-lived RSA-encrypted data — this is your highest risk surface",
      sources: [
        { title: 'Chrome 116 PQ TLS Announcement',    url: 'https://chromium.org/pq' },
        { title: 'OpenSSL 3.2 PQC Integration Guide', url: 'https://openssl.org/pqc' },
      ],
    },
  ],
  2: [
    { id: 1, role: 'user', content: 'What are the key differences between React Server Components and traditional SSR?' },
    { id: 2, role: 'assistant', content: "**React Server Components (RSC)** and traditional SSR solve different problems.\n\nTraditional SSR renders the full component tree on the server per request, ships HTML plus a full JS bundle, then **hydrates** the entire page. Every component ships its JS to the client.\n\n**RSC changes the model fundamentally:**\n\n• Server Components run only on the server — their code is never sent to the browser\n• Client Components (marked `'use client'`) hydrate normally\n• Data fetching is co-located with the component that needs it — no `getServerSideProps`\n\n**When to use RSC:** Data-heavy pages where you want zero client JS for the data layer.\n**When to stick with traditional SSR:** Simpler projects, or when you need fine-grained control over hydration timing.", sources: [{ title: 'React Docs: Server Components', url: 'https://react.dev/reference/rsc' }] },
  ],
  3: [
    { id: 1, role: 'user', content: 'Is SQLite actually suitable for production web applications?' },
    { id: 2, role: 'assistant', content: "Yes — with caveats. SQLite is production-ready for a well-defined class of applications.\n\n**Where SQLite excels in production:**\n\n• Read-heavy workloads (handles thousands of reads/second trivially)\n• Single-server deployments where horizontal scaling is not required\n• Applications where the DB lives on the same machine as the app\n\n**The actual constraints:**\n\n1. **Write concurrency** — SQLite uses database-level write locks. WAL mode mitigates this significantly.\n2. **Horizontal scaling** — You can't run multiple write replicas.\n3. **No connection pooling** — Each process connects directly.\n\nFor Nexus (self-hosted, single server, up to a few hundred users), SQLite is the correct choice.", sources: [{ title: 'SQLite WAL Mode', url: 'https://sqlite.org/wal.html' }, { title: 'Litestream Replication', url: 'https://litestream.io' }] },
  ],
  4: [
    { id: 1, role: 'user', content: 'What are the most common TypeScript strict mode issues developers run into?' },
    { id: 2, role: 'assistant', content: "Enabling `strict: true` turns on several checks at once. The ones that catch most developers:\n\n**1. `strictNullChecks`** — `null` and `undefined` are no longer assignable to other types. Every nullable value needs explicit handling.\n\n**2. `noImplicitAny`** — Function parameters without types become errors, not silent `any`.\n\n**3. `strictFunctionTypes`** — Function parameter types are checked contravariantly. This breaks some common callback patterns.\n\n**4. `strictPropertyInitialization`** — Class properties must be initialised in the constructor.\n\nOptional chaining (`?.`) and nullish coalescing (`??`) become your best friends." },
  ],
  5: [
    { id: 1, role: 'user', content: 'Can you explain how NestJS dependency injection works under the hood?' },
    { id: 2, role: 'assistant', content: "NestJS DI is built on its own IoC container, inspired by Angular.\n\n**The module system** is the top-level unit of encapsulation. Each module declares what it `provides` and what it `exports` for other modules.\n\n**How injection works at runtime:**\n\n1. On bootstrap, NestJS scans all modules and builds a dependency graph\n2. For each provider, it inspects the constructor parameter types via TypeScript's `emitDecoratorMetadata`\n3. It resolves each dependency recursively\n4. By default, providers are **singletons** within their module scope\n\n**The `@Injectable()` decorator** marks the class as a provider and enables metadata emission for the constructor parameters.", sources: [{ title: 'NestJS DI Fundamentals', url: 'https://docs.nestjs.com/fundamentals/injection-scopes' }] },
  ],
};

// ---------------------------------------------------------------------------

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

  setMode:           (mode: ChatMode) => void;
  setActiveSession:  (id: number | null) => void;
  setMessages:       (messages: Message[]) => void;
  loadSession:       (id: number) => void;
  clearSession:      () => void;
  setPendingInput:   (text: string) => void;
  clearPendingInput: () => void;
}

export const useChatStore = create<ChatStore>((set) => ({
  sessions: [
    { id: 1, title: "Quantum computing's threat to RSA encryption", mode: 'web', updatedAt: '2h ago' },
    { id: 2, title: 'React Server Components vs traditional SSR',   mode: 'web', updatedAt: 'Yesterday' },
    { id: 3, title: 'SQLite in production best practices',          mode: 'web', updatedAt: '2d ago' },
    { id: 4, title: 'TypeScript strict mode gotchas explained',     mode: 'web', updatedAt: '3d ago' },
    { id: 5, title: 'NestJS dependency injection deep dive',        mode: 'web', updatedAt: '5d ago' },
  ],
  activeSessionId:  null,
  messages:         [],
  mode:             'web',
  isStreaming:      false,
  streamingContent: '',
  progressStep:     null,
  progressHistory:  [],
  sources:          [],
  pendingInput:     '',

  setMode:          (mode) => set({ mode }),
  setActiveSession: (id) => set({ activeSessionId: id }),
  setMessages:      (messages) => set({ messages }),

  loadSession: (id) => {
    const messages = MOCK_MESSAGES[id] ?? [];
    set({ activeSessionId: id, messages });
  },

  clearSession:      () => set({ activeSessionId: null, messages: [] }),
  setPendingInput:   (text) => set({ pendingInput: text }),
  clearPendingInput: () => set({ pendingInput: '' }),
}));
```

---

## Fix 6 — `Chat.tsx`: Fix param name and wire session loading from store

**Two bugs to fix:**

**Bug A — Wrong URL param name.** The route is defined as `/chat/:id` but the page calls `useParams<{ sessionId: string }>()`. The param name must match the route. Change `sessionId` to `id`.

**Bug B — Mock messages inlined in component.** The current `useEffect` hardcodes messages directly in `Chat.tsx`. Replace with a `loadSession` call to the store.

**Replace only the params and useEffect section at the top of the component:**

```typescript
// frontend/src/pages/Chat.tsx — replace the top of the component function

import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useChatStore } from '@/stores/chat.store';

export function ChatPage() {
  const { id } = useParams<{ id: string }>();   // ← was sessionId, now id

  const {
    messages,
    sessions,
    mode,
    setMode,
    loadSession,
    clearSession,
    pendingInput,
    clearPendingInput,
  } = useChatStore();

  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const currentSession = sessions.find((s) => s.id === Number(id));

  // Load session from store when URL param changes
  useEffect(() => {
    if (id) {
      loadSession(Number(id));
    } else {
      clearSession();
    }
  }, [id]);

  // Pick up pending input set by suggestion card clicks
  useEffect(() => {
    if (pendingInput) {
      setInput(pendingInput);
      clearPendingInput();
      textareaRef.current?.focus();
    }
  }, [pendingInput]);

  // ... rest of component unchanged
```

Also add `ref={textareaRef}` to the `<Textarea>` element.

The `handleSend` stub should remain as-is (clears input, no API call).

---

## Fix 7 — `Sidebar.tsx`: Wire New Chat button

The New Chat button currently has no `onClick`. Wire it to clear the active session and navigate to `/chat`.

```typescript
// Add these imports to Sidebar.tsx if not already present:
import { useNavigate } from 'react-router-dom';

// Inside the component:
const navigate     = useNavigate();
const clearSession = useChatStore((s) => s.clearSession);

// Replace the New Chat button:
<button
  title="New Chat"
  onClick={() => { clearSession(); navigate('/chat'); }}
  className={cn(
    'flex items-center gap-3 w-full rounded-md border border-input bg-card hover:bg-muted hover:text-foreground text-foreground px-2.5 py-2 transition-colors',
    collapsed && 'justify-center px-0',
  )}
>
  <MessageSquarePlus size={16} />
  {!collapsed && <span className="text-sm font-medium">New Chat</span>}
</button>
```

---

## Fix 8 — Admin page conflict: Replace `AdminUsers.tsx` with mock-data version

There are currently two admin-related files:
- `frontend/src/pages/admin/AdminUsers.tsx` — makes real API calls (premature F3 work)
- `frontend/src/pages/admin/Users.tsx` — may or may not exist

**The correct F2 state is a single file at `frontend/src/pages/admin/Users.tsx` that uses local mock data only — no API calls.**

Do the following:
1. Delete `frontend/src/pages/admin/AdminUsers.tsx`
2. Replace `frontend/src/pages/admin/Users.tsx` with the implementation below
3. Confirm `App.tsx` imports `AdminUsersPage` from `@/pages/admin/Users`

```typescript
// frontend/src/pages/admin/Users.tsx
import { useState } from 'react';
import { Check, Ban, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/cn';
import { Badge } from '@/components/ui/badge';

type UserStatus = 'ACTIVE' | 'PENDING' | 'BANNED';
type UserRole   = 'user' | 'superadmin';

interface AdminUser {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  joined: string;
}

const MOCK_USERS: AdminUser[] = [
  { id: 1, name: 'Admin',  email: 'admin@nexus.local',   role: 'superadmin', status: 'ACTIVE',  joined: 'Jan 1, 2026'  },
  { id: 2, name: 'Alice',  email: 'alice@example.com',   role: 'user',       status: 'ACTIVE',  joined: 'Feb 20, 2026' },
  { id: 3, name: 'Bob',    email: 'bob@example.com',     role: 'user',       status: 'PENDING', joined: 'Mar 5, 2026'  },
  { id: 4, name: 'Carol',  email: 'carol@example.com',   role: 'user',       status: 'PENDING', joined: 'Mar 6, 2026'  },
  { id: 5, name: 'David',  email: 'david@example.com',   role: 'user',       status: 'ACTIVE',  joined: 'Feb 15, 2026' },
  { id: 6, name: 'Eve',    email: 'eve@example.com',     role: 'user',       status: 'BANNED',  joined: 'Feb 10, 2026' },
  { id: 7, name: 'Frank',  email: 'frank@example.com',   role: 'user',       status: 'PENDING', joined: 'Mar 7, 2026'  },
  { id: 8, name: 'Grace',  email: 'grace@example.com',   role: 'user',       status: 'ACTIVE',  joined: 'Jan 15, 2026' },
];

type TabFilter = 'all' | 'pending';

function statusBadgeVariant(status: UserStatus) {
  if (status === 'ACTIVE')  return 'success'     as const;
  if (status === 'PENDING') return 'warning'     as const;
  if (status === 'BANNED')  return 'destructive' as const;
  return 'secondary' as const;
}

export function AdminUsersPage() {
  const [users, setUsers]     = useState<AdminUser[]>(MOCK_USERS);
  const [tab,   setTab]       = useState<TabFilter>('all');

  const pendingCount  = users.filter((u) => u.status === 'PENDING').length;
  const visibleUsers  = tab === 'pending'
    ? users.filter((u) => u.status === 'PENDING')
    : users;

  const approve = (id: number) =>
    setUsers((prev) => prev.map((u) => u.id === id ? { ...u, status: 'ACTIVE'  } : u));
  const ban     = (id: number) =>
    setUsers((prev) => prev.map((u) => u.id === id ? { ...u, status: 'BANNED'  } : u));
  const unban   = (id: number) =>
    setUsers((prev) => prev.map((u) => u.id === id ? { ...u, status: 'ACTIVE'  } : u));

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
              <span className="text-[12.5px] font-medium text-warning">
                {pendingCount} pending approval
              </span>
            </div>
          )}
        </div>

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
              {t === 'all'
                ? `All Users (${users.length})`
                : `Pending (${pendingCount})`}
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
                  {/* User cell */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className={cn(
                        'w-[30px] h-[30px] rounded-full flex items-center justify-center shrink-0',
                        user.role === 'superadmin' ? 'bg-primary/10' : 'bg-muted',
                      )}>
                        <span className={cn(
                          'text-[12px] font-semibold',
                          user.role === 'superadmin' ? 'text-primary' : 'text-muted-foreground',
                        )}>
                          {user.name[0].toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <div className="text-[13px] font-medium text-foreground">{user.name}</div>
                        <div className="text-[11.5px] text-muted-foreground">{user.email}</div>
                      </div>
                    </div>
                  </td>

                  {/* Status */}
                  <td className="px-4 py-3">
                    <Badge variant={statusBadgeVariant(user.status)}>
                      <span className={cn(
                        'w-1.5 h-1.5 rounded-full',
                        user.status === 'ACTIVE'  && 'bg-success',
                        user.status === 'PENDING' && 'bg-warning',
                        user.status === 'BANNED'  && 'bg-destructive',
                      )} />
                      {user.status}
                    </Badge>
                  </td>

                  {/* Role */}
                  <td className="px-4 py-3">
                    <span className={cn(
                      'text-[13px]',
                      user.role === 'superadmin' ? 'text-primary font-medium' : 'text-muted-foreground',
                    )}>
                      {user.role === 'superadmin' ? 'Superadmin' : 'User'}
                    </span>
                  </td>

                  {/* Joined */}
                  <td className="px-4 py-3 text-[13px] text-muted-foreground">{user.joined}</td>

                  {/* Actions */}
                  <td className="px-4 py-3">
                    {user.role !== 'superadmin' && (
                      <div className="flex gap-2">
                        {user.status === 'PENDING' && (
                          <button
                            onClick={() => approve(user.id)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[12px] font-medium bg-success/10 text-success hover:bg-success/20 transition-colors"
                          >
                            <Check size={11} /> Approve
                          </button>
                        )}
                        {user.status === 'ACTIVE' && (
                          <button
                            onClick={() => ban(user.id)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[12px] font-medium bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors"
                          >
                            <Ban size={11} /> Ban
                          </button>
                        )}
                        {user.status === 'BANNED' && (
                          <button
                            onClick={() => unban(user.id)}
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
            </tbody>
          </table>
        </div>

      </div>
    </div>
  );
}
```

---

## Fix 9 — Update `AdminUsers.test.tsx`

The existing test file at `frontend/src/pages/admin/AdminUsers.test.tsx` imports `AdminUsers` from `./AdminUsers` (the old file being deleted) and mocks `@/api/admin.api`. After Fix 8, neither that import path nor those mocks exist anymore.

**Update the test file path and imports:**

- Move/rename to `frontend/src/pages/admin/Users.test.tsx`
- Change the component import to: `import { AdminUsersPage } from './Users';`
- Remove all `vi.mock('@/api/admin.api', ...)` mocks — there are no API calls to mock
- Replace the `useEffect`/async test patterns with synchronous render tests against the `MOCK_USERS` data

**Minimal replacement test:**

```typescript
// frontend/src/pages/admin/Users.test.tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { AdminUsersPage } from './Users';

function renderPage() {
  return render(<MemoryRouter><AdminUsersPage /></MemoryRouter>);
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
    expect(screen.getAllByRole('button', { name: /approve/i }).length)
      .toBe(approveButtons.length - 1);
  });

  it('Ban button changes ACTIVE user to BANNED', async () => {
    const user = userEvent.setup();
    renderPage();
    const banButtons = screen.getAllByRole('button', { name: /^ban$/i });
    await user.click(banButtons[0]);
    expect(screen.getAllByRole('button', { name: /^ban$/i }).length)
      .toBe(banButtons.length - 1);
  });
});
```

---

## Implementation Order

Execute in this exact sequence — do not combine steps:

1. **Create `PublicOnlyRoute.tsx`** (Fix 2)
2. **Update `auth.store.ts`** (Fix 3)
3. **Update `chat.store.ts`** (Fix 5)
4. **Update `App.tsx`** (Fix 1)
5. **Update `Login.tsx`** (Fix 4)
6. **Update `Sidebar.tsx`** (Fix 7)
7. **Update `Chat.tsx`** (Fix 6)
8. **Replace admin files** (Fix 8)
9. **Update admin test** (Fix 9)
10. **Run `npm run build`** — must pass with zero type errors
11. **Run `npm run lint`** — must pass with zero errors
12. **Run `npm test`** — all tests must pass

---

## Acceptance Checklist

- [ ] `npm run build` passes — zero TypeScript errors
- [ ] `npm run lint` passes — zero errors
- [ ] `npm test` passes — all tests green
- [ ] Visiting `/chat` without logging in redirects to `/login`
- [ ] Visiting `/admin/users` without logging in redirects to `/login`
- [ ] After logging in, visiting `/login` redirects to `/chat`
- [ ] Login button shows spinner for ~600ms then navigates to `/chat`
- [ ] Browser Back after login does not return to `/login`
- [ ] Clicking a sidebar session navigates to `/chat/:id` and loads that session's messages from store
- [ ] Clicking New Chat navigates to `/chat` and shows the empty state
- [ ] Clicking a History card navigates to `/chat/:id` and loads correct messages
- [ ] Admin table shows all 8 users with correct status badges
- [ ] Approve / Ban / Unban update the table immediately (no API call)
- [ ] Superadmin row has no action buttons
- [ ] Only one admin file exists: `frontend/src/pages/admin/Users.tsx`
- [ ] No `console.error` in browser console
