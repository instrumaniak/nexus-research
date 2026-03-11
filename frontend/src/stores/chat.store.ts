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
      id: 1,
      role: 'user',
      content: 'What are the main risks of quantum computing to modern encryption?',
    },
    {
      id: 2,
      role: 'assistant',
      content:
        "Quantum computing poses a significant threat to current cryptographic standards, particularly asymmetric (public-key) encryption like RSA and ECC.\n\nThe primary mechanism is **Shor's Algorithm**, which can efficiently factor large integers and solve discrete logarithms — the mathematical foundations of most modern public-key systems.\n\nKey risks include:\n\n• **Harvest Now, Decrypt Later** — Adversaries capturing encrypted data today to decrypt once powerful quantum computers are available.\n• **Authentication Collapse** — Digital signatures securing software updates and financial transactions could be forged.\n• **Network Security** — Protocols like TLS/SSL that secure the internet would no longer provide confidentiality.\n\nNIST finalised post-quantum cryptographic standards in 2024, including **CRYSTALS-Kyber** and **CRYSTALS-Dilithium**, which are designed to resist quantum attacks.",
      sources: [
        { title: 'NIST Post-Quantum Standards 2024', url: 'https://nist.gov/pqcrypto' },
        { title: 'IBM Quantum Roadmap 2025', url: 'https://research.ibm.com/quantum' },
        { title: 'Cloudflare: PQ Threat Timeline', url: 'https://blog.cloudflare.com/pq-2024' },
      ],
    },
    {
      id: 3,
      role: 'user',
      content: 'Which algorithm should I prioritise for a web application?',
    },
    {
      id: 4,
      role: 'assistant',
      content:
        "For key exchange, prioritise **CRYSTALS-Kyber** (ML-KEM) — already supported in Chrome 116+ and Cloudflare's global network.\n\nFor signatures, use **CRYSTALS-Dilithium** (ML-DSA) — best performance/security ratio available today.\n\n**Steps to take now:**\n\n1. Enable hybrid TLS (X25519 + Kyber) in your server config\n2. Update to OpenSSL 3.2+ for native PQC support\n3. Audit long-lived RSA-encrypted data — this is your highest risk surface",
      sources: [
        { title: 'Chrome 116 PQ TLS Announcement', url: 'https://chromium.org/pq' },
        { title: 'OpenSSL 3.2 PQC Integration Guide', url: 'https://openssl.org/pqc' },
      ],
    },
  ],
  2: [
    {
      id: 1,
      role: 'user',
      content: 'What are the key differences between React Server Components and traditional SSR?',
    },
    {
      id: 2,
      role: 'assistant',
      content:
        "**React Server Components (RSC)** and traditional SSR solve different problems.\n\nTraditional SSR renders the full component tree on the server per request, ships HTML plus a full JS bundle, then **hydrates** the entire page. Every component ships its JS to the client.\n\n**RSC changes the model fundamentally:**\n\n• Server Components run only on the server — their code is never sent to the browser\n• Client Components (marked `'use client'`) hydrate normally\n• Data fetching is co-located with the component that needs it — no `getServerSideProps`\n\n**When to use RSC:** Data-heavy pages where you want zero client JS for the data layer.\n**When to stick with traditional SSR:** Simpler projects, or when you need fine-grained control over hydration timing.",
      sources: [{ title: 'React Docs: Server Components', url: 'https://react.dev/reference/rsc' }],
    },
  ],
  3: [
    {
      id: 1,
      role: 'user',
      content: 'Is SQLite actually suitable for production web applications?',
    },
    {
      id: 2,
      role: 'assistant',
      content:
        "Yes — with caveats. SQLite is production-ready for a well-defined class of applications.\n\n**Where SQLite excels in production:**\n\n• Read-heavy workloads (handles thousands of reads/second trivially)\n• Single-server deployments where horizontal scaling is not required\n• Applications where the DB lives on the same machine as the app\n\n**The actual constraints:**\n\n1. **Write concurrency** — SQLite uses database-level write locks. WAL mode mitigates this significantly.\n2. **Horizontal scaling** — You can't run multiple write replicas.\n3. **No connection pooling** — Each process connects directly.\n\nFor Nexus (self-hosted, single server, up to a few hundred users), SQLite is the correct choice.",
      sources: [
        { title: 'SQLite WAL Mode', url: 'https://sqlite.org/wal.html' },
        { title: 'Litestream Replication', url: 'https://litestream.io' },
      ],
    },
  ],
  4: [
    {
      id: 1,
      role: 'user',
      content: 'What are the most common TypeScript strict mode issues developers run into?',
    },
    {
      id: 2,
      role: 'assistant',
      content:
        'Enabling `strict: true` turns on several checks at once. The ones that catch most developers:\n\n**1. `strictNullChecks`** — `null` and `undefined` are no longer assignable to other types. Every nullable value needs explicit handling.\n\n**2. `noImplicitAny`** — Function parameters without types become errors, not silent `any`.\n\n**3. `strictFunctionTypes`** — Function parameter types are checked contravariantly. This breaks some common callback patterns.\n\n**4. `strictPropertyInitialization`** — Class properties must be initialised in the constructor.\n\nOptional chaining (`?.`) and nullish coalescing (`??`) become your best friends.',
    },
  ],
  5: [
    {
      id: 1,
      role: 'user',
      content: 'Can you explain how NestJS dependency injection works under the hood?',
    },
    {
      id: 2,
      role: 'assistant',
      content:
        "NestJS DI is built on its own IoC container, inspired by Angular.\n\n**The module system** is the top-level unit of encapsulation. Each module declares what it `provides` and what it `exports` for other modules.\n\n**How injection works at runtime:**\n\n1. On bootstrap, NestJS scans all modules and builds a dependency graph\n2. For each provider, it inspects the constructor parameter types via TypeScript's `emitDecoratorMetadata`\n3. It resolves each dependency recursively\n4. By default, providers are **singletons** within their module scope\n\n**The `@Injectable()` decorator** marks the class as a provider and enables metadata emission for the constructor parameters.",
      sources: [
        {
          title: 'NestJS DI Fundamentals',
          url: 'https://docs.nestjs.com/fundamentals/injection-scopes',
        },
      ],
    },
  ],
};

// ---------------------------------------------------------------------------

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

  setMode: (mode: ChatMode) => void;
  setActiveSession: (id: number | null) => void;
  setMessages: (messages: Message[]) => void;
  loadSession: (id: number) => void;
  clearSession: () => void;
  setPendingInput: (text: string) => void;
  clearPendingInput: () => void;
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
  pendingInput: '',

  setMode: (mode) => set({ mode }),
  setActiveSession: (id) => set({ activeSessionId: id }),
  setMessages: (messages) => set({ messages }),

  loadSession: (id) => {
    const messages = MOCK_MESSAGES[id] ?? [];
    set({ activeSessionId: id, messages });
  },

  clearSession: () => set({ activeSessionId: null, messages: [] }),
  setPendingInput: (text) => set({ pendingInput: text }),
  clearPendingInput: () => set({ pendingInput: '' }),
}));
