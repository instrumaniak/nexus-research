# Nexus — Frontend Design Specification

> **For the AI coding agent:** This document is the single source of truth for all frontend UI implementation. Follow every section exactly. Do not deviate from the component structure, file paths, CSS variable names, or page layouts described here. All visual decisions have been reviewed and approved.

---

## 1. Overview & Design Principles

**Design language:** Minimal, dark-first, information-dense without feeling crowded. Inspired by the shadcn/ui dashboard example. Violet accent on a zinc/neutral base.

**Core rules:**
- Every colour, radius, and spacing value comes from a CSS variable — never hardcode hex values in components
- All interactive states (hover, focus, active, disabled) must be implemented — no bare buttons
- Dark mode is the default; light mode is a user-toggled opt-in persisted in `localStorage`
- No gradients, no decorative illustrations — functional clarity only
- Font: `Outfit` from Google Fonts (weights 400, 500, 600, 700)

---

## 2. Package Installation

Before writing any component code, install the following. The Radix primitives, CVA, and utility packages are already in `package.json`. Add the missing ones:

```bash
# Inside frontend/
npm install @radix-ui/react-label @radix-ui/react-separator @radix-ui/react-tooltip \
  @radix-ui/react-avatar @radix-ui/react-badge @radix-ui/react-scroll-area \
  @radix-ui/react-tabs next-themes
```

Add the Google Fonts import to `frontend/index.html` inside `<head>`:

```html
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700&display=swap" rel="stylesheet" />
```

---

## 3. Design Tokens — CSS Variables

Replace the contents of `frontend/src/index.css` with the following exactly. The violet accent palette replaces the default shadcn neutral primary.

```css
@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700&display=swap');

@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    /* Base surfaces */
    --background:         0 0% 100%;
    --foreground:         240 10% 4%;

    /* Card / panel surfaces */
    --card:               0 0% 98%;
    --card-foreground:    240 10% 4%;

    /* Popover */
    --popover:            0 0% 100%;
    --popover-foreground: 240 10% 4%;

    /* Primary — Violet */
    --primary:            263 70% 50%;
    --primary-foreground: 0 0% 100%;

    /* Secondary */
    --secondary:          240 5% 94%;
    --secondary-foreground: 240 6% 10%;

    /* Muted */
    --muted:              240 5% 95%;
    --muted-foreground:   240 4% 46%;

    /* Accent */
    --accent:             263 70% 97%;
    --accent-foreground:  263 70% 40%;

    /* Destructive */
    --destructive:        0 84% 60%;
    --destructive-foreground: 0 0% 100%;

    /* Status colours */
    --success:            158 64% 42%;
    --success-foreground: 0 0% 100%;
    --warning:            38 92% 50%;
    --warning-foreground: 0 0% 100%;

    /* Chrome */
    --border:             240 6% 90%;
    --input:              240 6% 90%;
    --ring:               263 70% 50%;

    /* Geometry */
    --radius:             0.5rem;

    /* Sidebar */
    --sidebar-background: 240 5% 98%;
    --sidebar-border:     240 6% 90%;
    --sidebar-width:      14rem;
    --sidebar-width-icon: 3.25rem;
  }

  .dark {
    --background:         240 10% 4%;
    --foreground:         0 0% 98%;

    --card:               240 8% 7%;
    --card-foreground:    0 0% 98%;

    --popover:            240 8% 7%;
    --popover-foreground: 0 0% 98%;

    /* Primary — Violet (lighter in dark for contrast) */
    --primary:            263 80% 70%;
    --primary-foreground: 263 80% 10%;

    --secondary:          240 4% 16%;
    --secondary-foreground: 0 0% 98%;

    --muted:              240 4% 12%;
    --muted-foreground:   240 5% 60%;

    --accent:             263 40% 16%;
    --accent-foreground:  263 80% 75%;

    --destructive:        0 63% 38%;
    --destructive-foreground: 0 0% 98%;

    --success:            158 55% 45%;
    --success-foreground: 0 0% 100%;
    --warning:            38 80% 52%;
    --warning-foreground: 0 0% 100%;

    --border:             240 4% 18%;
    --input:              240 4% 18%;
    --ring:               263 80% 70%;

    --sidebar-background: 240 10% 5%;
    --sidebar-border:     240 4% 13%;
  }
}

@layer base {
  * {
    @apply border-border;
  }
  html {
    font-family: 'Outfit', sans-serif;
  }
  body {
    @apply bg-background text-foreground;
    font-family: 'Outfit', sans-serif;
    -webkit-font-smoothing: antialiased;
  }

  /* Thin scrollbar everywhere */
  ::-webkit-scrollbar         { width: 4px; height: 4px; }
  ::-webkit-scrollbar-track   { background: transparent; }
  ::-webkit-scrollbar-thumb   { background: hsl(var(--border)); border-radius: 2px; }
  ::-webkit-scrollbar-thumb:hover { background: hsl(var(--muted-foreground)); }
}
```

---

## 4. Tailwind Configuration

Replace `frontend/tailwind.config.ts` with the following:

```typescript
import type { Config } from 'tailwindcss';

export default {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Outfit', 'sans-serif'],
      },
      colors: {
        border:      'hsl(var(--border))',
        input:       'hsl(var(--input))',
        ring:        'hsl(var(--ring))',
        background:  'hsl(var(--background))',
        foreground:  'hsl(var(--foreground))',
        primary: {
          DEFAULT:    'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT:    'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT:    'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT:    'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT:    'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        popover: {
          DEFAULT:    'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT:    'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        success: {
          DEFAULT:    'hsl(var(--success))',
          foreground: 'hsl(var(--success-foreground))',
        },
        warning: {
          DEFAULT:    'hsl(var(--warning))',
          foreground: 'hsl(var(--warning-foreground))',
        },
        sidebar: {
          DEFAULT: 'hsl(var(--sidebar-background))',
          border:  'hsl(var(--sidebar-border))',
        },
      },
      borderRadius: {
        lg:  'var(--radius)',
        md:  'calc(var(--radius) - 2px)',
        sm:  'calc(var(--radius) - 4px)',
      },
    },
  },
  plugins: [],
} satisfies Config;
```

---

## 5. Theme Provider

Create `frontend/src/components/theme-provider.tsx`:

```typescript
import { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'dark' | 'light' | 'system';

interface ThemeProviderProps {
  children: React.ReactNode;
  defaultTheme?: Theme;
  storageKey?: string;
}

interface ThemeContextValue {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export function ThemeProvider({
  children,
  defaultTheme = 'dark',
  storageKey = 'nexus-theme',
}: ThemeProviderProps) {
  const [theme, setThemeState] = useState<Theme>(
    () => (localStorage.getItem(storageKey) as Theme) ?? defaultTheme
  );

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');
    const resolved =
      theme === 'system'
        ? window.matchMedia('(prefers-color-scheme: dark)').matches
          ? 'dark'
          : 'light'
        : theme;
    root.classList.add(resolved);
  }, [theme]);

  const setTheme = (t: Theme) => {
    localStorage.setItem(storageKey, t);
    setThemeState(t);
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used inside ThemeProvider');
  return ctx;
}
```

Wrap the app in `frontend/src/main.tsx`:

```typescript
import React from 'react';
import ReactDOM from 'react-dom/client';
import { ThemeProvider } from '@/components/theme-provider';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider defaultTheme="dark" storageKey="nexus-theme">
      <App />
    </ThemeProvider>
  </React.StrictMode>
);
```

---

## 6. Shared UI Components (`frontend/src/components/ui/`)

Create each file below. These are the shadcn-style components used across all pages.

### `cn.ts` (utility — place in `src/lib/`)

```typescript
// frontend/src/lib/cn.ts
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

### `button.tsx`

```typescript
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/cn';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 disabled:pointer-events-none disabled:opacity-40',
  {
    variants: {
      variant: {
        default:     'bg-primary text-primary-foreground hover:bg-primary/90',
        destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
        outline:     'border border-input bg-transparent hover:bg-muted hover:text-foreground',
        secondary:   'bg-secondary text-secondary-foreground hover:bg-secondary/80',
        ghost:       'hover:bg-muted hover:text-foreground text-muted-foreground',
        link:        'text-primary underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-9 px-4 py-2',
        sm:      'h-7 px-3 text-xs',
        lg:      'h-11 px-6 text-base',
        icon:    'h-9 w-9',
        'icon-sm': 'h-7 w-7',
      },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  }
);

interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export function Button({ className, variant, size, asChild = false, ...props }: ButtonProps) {
  const Comp = asChild ? Slot : 'button';
  return <Comp className={cn(buttonVariants({ variant, size, className }))} {...props} />;
}

export { buttonVariants };
```

### `input.tsx`

```typescript
import { cn } from '@/lib/cn';

export function Input({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        'flex h-9 w-full rounded-md border border-input bg-muted px-3 py-1 text-sm shadow-none',
        'placeholder:text-muted-foreground',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1',
        'disabled:cursor-not-allowed disabled:opacity-50',
        className
      )}
      {...props}
    />
  );
}
```

### `label.tsx`

```typescript
import * as LabelPrimitive from '@radix-ui/react-label';
import { cn } from '@/lib/cn';

export function Label({ className, ...props }: React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root>) {
  return (
    <LabelPrimitive.Root
      className={cn('text-xs font-medium text-muted-foreground', className)}
      {...props}
    />
  );
}
```

### `card.tsx`

```typescript
import { cn } from '@/lib/cn';

export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('rounded-lg border bg-card text-card-foreground', className)} {...props} />;
}

export function CardHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('flex flex-col gap-1 p-5', className)} {...props} />;
}

export function CardTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h3 className={cn('text-base font-semibold leading-tight', className)} {...props} />;
}

export function CardDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn('text-xs text-muted-foreground', className)} {...props} />;
}

export function CardContent({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('p-5 pt-0', className)} {...props} />;
}
```

### `badge.tsx`

```typescript
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/cn';

const badgeVariants = cva(
  'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors',
  {
    variants: {
      variant: {
        default:     'bg-primary/10 text-primary',
        secondary:   'bg-secondary text-secondary-foreground',
        success:     'bg-success/10 text-success',
        warning:     'bg-warning/10 text-warning',
        destructive: 'bg-destructive/10 text-destructive',
        outline:     'border border-border text-foreground',
      },
    },
    defaultVariants: { variant: 'default' },
  }
);

interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}
```

### `separator.tsx`

```typescript
import * as SeparatorPrimitive from '@radix-ui/react-separator';
import { cn } from '@/lib/cn';

export function Separator({ className, orientation = 'horizontal', ...props }: React.ComponentPropsWithoutRef<typeof SeparatorPrimitive.Root>) {
  return (
    <SeparatorPrimitive.Root
      orientation={orientation}
      className={cn(
        'shrink-0 bg-border',
        orientation === 'horizontal' ? 'h-px w-full' : 'h-full w-px',
        className
      )}
      {...props}
    />
  );
}
```

### `textarea.tsx`

```typescript
import { cn } from '@/lib/cn';

export function Textarea({ className, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        'flex min-h-[60px] w-full rounded-md border border-input bg-muted px-3 py-2 text-sm',
        'placeholder:text-muted-foreground resize-none',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1',
        'disabled:cursor-not-allowed disabled:opacity-50',
        className
      )}
      {...props}
    />
  );
}
```

### `theme-toggle.tsx`

```typescript
import { Sun, Moon } from 'lucide-react';
import { Button } from './ui/button';
import { useTheme } from './theme-provider';

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  return (
    <Button
      variant="ghost"
      size="icon-sm"
      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
      aria-label="Toggle theme"
    >
      {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
    </Button>
  );
}
```

---

## 7. App Router (`frontend/src/App.tsx`)

```typescript
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { LoginPage }    from '@/pages/Login';
import { RegisterPage } from '@/pages/Register';
import { ChatPage }     from '@/pages/Chat';
import { HistoryPage }  from '@/pages/History';
import { AdminUsersPage } from '@/pages/admin/Users';
import { AppLayout }    from '@/components/layout/AppLayout';

// Phase 1: auth check is a stub — always authenticated after login
// Phase 3: replace with real useAuthStore().isAuthenticated check
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public */}
        <Route path="/login"    element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        {/* Protected — wrapped in sidebar shell */}
        <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
          <Route index element={<Navigate to="/chat" replace />} />
          <Route path="/chat"       element={<ChatPage />} />
          <Route path="/chat/:id"   element={<ChatPage />} />
          <Route path="/history"    element={<HistoryPage />} />
          <Route path="/admin/users" element={<AdminUsersPage />} />
        </Route>

        <Route path="*" element={<Navigate to="/chat" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
```

---

## 8. App Layout & Sidebar (`frontend/src/components/layout/`)

### `AppLayout.tsx`

```typescript
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { useState } from 'react';

export function AppLayout() {
  const [collapsed, setCollapsed] = useState(true); // default: icon rail

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

### `Sidebar.tsx`

The sidebar has two visual states controlled by the `collapsed` prop:

- **Collapsed (icon rail):** `w-[var(--sidebar-width-icon)]` = `52px`. Shows only icons, no labels.
- **Expanded:** `w-[var(--sidebar-width)]` = `224px`. Shows icons + labels + session list.

```typescript
// Sidebar structure — implement in frontend/src/components/layout/Sidebar.tsx
//
// Layout (top to bottom):
//
// ┌──────────────────────────────────┐
// │ [≡ / ←]  "Nexus" (expanded only)│  ← Toggle button row (h-[52px], border-b)
// ├──────────────────────────────────┤
// │ [+]  "New Chat"                  │  ← New chat button (p-2.5)
// ├──────────────────────────────────┤
// │ RECENT (expanded only)           │  ← Section label, text-[10px] uppercase tracking-widest
// │  · Session title 1               │  ← Session list, font-size 12.5px, truncated
// │  · Session title 2               │
// │  · ...                           │
// │  (scrollable, flex-1)            │
// ├──────────────────────────────────┤
// │ [💬] Chat                        │  ← Nav items
// │ [⏱] History                     │
// │ [📚] Knowledge Base  [Phase 2]   │  ← disabled, opacity-40
// │ [🛡] Admin                       │
// ├──────────────────────────────────┤
// │ [☀/🌙] Light/Dark mode           │  ← ThemeToggle
// │ [avatar] Name / email  [logout]  │  ← User row (expanded) or logout icon (collapsed)
// └──────────────────────────────────┘
//
// Transition: `transition-[width] duration-200 ease-in-out` on the outer div.
// Active nav item: bg-accent text-accent-foreground
// Session list item: text-muted-foreground hover:bg-muted hover:text-foreground
//                    active: text-foreground bg-muted
```

Key implementation details:
- The toggle button uses `ChevronLeft` when expanded, `Menu` when collapsed
- All `title` attributes must be set on collapsed icon buttons for tooltip accessibility
- Session list items use `NavLink` from react-router-dom for auto active state detection
- The "Knowledge Base" nav item must have `disabled` prop and `pointer-events-none`
- User avatar is a 28px circle with `bg-primary/20 text-primary` initial letter

---

## 9. Pages

### 9.1 Login (`frontend/src/pages/Login.tsx`)

**Layout:** Full-screen centered, single column, max-w-[370px].

```
┌────────────────────────┐
│    [N logo mark]       │
│    Nexus               │
│    AI Research Assist. │
├────────────────────────┤
│  Sign in               │
│  No account? Request..│
│                        │
│  Email          [____] │
│  Password  Forgot? [_] │
│                        │
│  [    Sign in    ]     │
└────────────────────────┘
   [☀ Light mode toggle]
```

- Logo mark: 40×40px, `rounded-xl bg-primary/10 border border-primary/20`, violet "N" text
- Card: `bg-card border border-border rounded-xl p-6`
- "Request access" link: `text-primary cursor-pointer hover:underline`
- Submit button: full-width, `variant="default"`, `size="lg"`
- Theme toggle below card: ghost small button

**Error states to implement as static variants (API integration Phase F3):**
- Invalid credentials: red helper text below password field
- Account pending: amber banner inside card above submit
- Account banned: red banner inside card

### 9.2 Register (`frontend/src/pages/Register.tsx`)

Same layout as Login. Two visual states:

**State 1 — Form:**
```
  Name            [____]
  Email           [____]
  Password        [____]
  [ Request access ]
```

**State 2 — Success (shown after submit):**
```
  ✓ (green circle icon, 44px)
  Request submitted
  Your account is pending approval.
  An administrator will review your
  request. You'll receive an email
  once approved.
  [ Back to Sign in ]
```

- Success icon circle: `bg-success/10` with `text-success` Check icon (20px)
- "pending approval" text in the body: `font-medium text-warning`

### 9.3 Chat (`frontend/src/pages/Chat.tsx`)

**Layout:** Three-zone vertical flex column inside the main area.

```
┌─────────────────────────────────────────────────────────┐
│ TOP BAR (h-[52px], border-b, flex, items-center, px-5)  │
│  [Session title — truncated]    [🌐 Web] [📚 KB·P2] [🔬 DR·P2] │
└─────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────┐
│ MESSAGE AREA (flex-1, overflow-y-auto, py-7)            │
│   max-w-[700px] mx-auto px-6                            │
│                                                         │
│  [User message — right-aligned bubble]                  │
│                                                         │
│  [N] [Assistant message — left, with source chips]      │
│                                                         │
│  [Empty state — centred, shown when no session]         │
└─────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────┐
│ INPUT BAR (border-t, px-6, py-3, pb-5, bg-background)  │
│   max-w-[700px] mx-auto                                 │
│   [textarea + send button in a rounded border box]      │
│   disclaimer text below                                 │
└─────────────────────────────────────────────────────────┘
```

**Mode pills (top bar, right side):**
- Rendered as `<button>` elements, not tabs
- Active: `border-primary bg-primary/10 text-primary`
- Inactive: `border-border text-muted-foreground hover:border-muted-foreground`
- Disabled (KB, Deep Research): `opacity-40 cursor-not-allowed pointer-events-none`
- Disabled label: append `· P2` in smaller text inside the pill
- Icons: `Globe` (Web Search), `Database` (KB), `FlaskConical` (Deep Research) — all 11px

**User message bubble:**
- `bg-muted border border-border rounded-[14px_14px_4px_14px]` (sharp bottom-right)
- `max-w-[72%] ml-auto px-4 py-2.5 text-sm`

**Assistant message:**
- Left-aligned, preceded by 28px avatar circle (`bg-primary/10 border border-primary/20`, violet "N")
- Response text renders inline markdown: bold (`**text**`), bullet lists, numbered lists
- Sources section below response (if present):
  - Label: `SOURCES` — `text-[10px] uppercase tracking-widest text-muted-foreground`
  - Each source: chip with `ExternalLink` (10px icon) + title, `bg-muted border border-border rounded-md px-2 py-1 text-[11.5px] hover:text-foreground`

**Empty state (no active session):**
```
  "Nexus"           — text-4xl font-semibold text-muted/50
  "Ask a research question to get started."  — text-muted-foreground text-sm
  "Web Search active · KB Search and Deep Research available in Phase 2" — text-[12px] text-muted-foreground/60
```

**Input box:**
- Outer: `bg-card border border-border rounded-xl px-4 py-3 flex items-end gap-3`
- Textarea: transparent background, no border, `text-sm`, auto-resize (use `onInput` to set height)
- Send button: `variant="default" size="icon-sm"`, `Send` icon 13px
- `Enter` submits; `Shift+Enter` inserts newline
- Disclaimer: `text-[11px] text-muted-foreground/50 text-center mt-2`
  - Text: "Nexus may make mistakes. Always verify important information from sources."

**SSE progress feed (Phase F3 — stub the UI now):**
- Shown between the last user message and the streaming assistant message
- Small pill row: `text-[11px] text-muted-foreground flex items-center gap-1.5`
- Steps: `Searching the web...` → `Reading sources...` → `Summarising...` → `Done`
- Use animated pulsing dot (`animate-pulse`) on the active step

### 9.4 History (`frontend/src/pages/History.tsx`)

```
┌──────────────────────────────────────────────────┐
│ History                                          │
│ Your past research sessions                      │
├──────────────────────────────────────────────────┤
│ ┌────────────────────────────────────────────┐   │
│ │ [🌐] Session title — truncated        [→] │   │
│ │      Web Search · 2 hours ago             │   │
│ └────────────────────────────────────────────┘   │
│ ┌────────────────────────────────────────────┐   │
│ │ ...                                        │   │
│ └────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────┘
```

- Page padding: `p-8`
- Max content width: `max-w-[720px] mx-auto`
- Title: `text-xl font-semibold`
- Subtitle: `text-sm text-muted-foreground mb-5`
- Session card: `bg-card border border-border rounded-lg p-4 flex items-center gap-3 cursor-pointer hover:bg-muted hover:border-primary/30 transition-colors`
- Mode icon: 34×34px `rounded-lg bg-primary/10 flex items-center justify-center`, `Globe` icon in `text-primary`
- Title: `font-medium text-[13.5px]`
- Metadata row: `text-[12px] text-muted-foreground`
- Chevron: `text-muted-foreground/50` — `ChevronRight` 14px, right-aligned

### 9.5 Admin — Users (`frontend/src/pages/admin/Users.tsx`)

```
┌───────────────────────────────────────────────────────────┐
│ User Management              [⚠ N pending approval]       │
│ X total users                                             │
├─────────────────┬─────────────────────────────────────────┤
│ All Users (N)   │ Pending (N)                             │  ← Tabs
├─────────────────┴─────────────────────────────────────────┤
│ ┌───────────────────────────────────────────────────────┐ │
│ │ USER         STATUS    ROLE       JOINED   ACTIONS    │ │
│ ├───────────────────────────────────────────────────────┤ │
│ │ [A] Alice    ● ACTIVE  User   Mar 1     [Ban]         │ │
│ │ [B] Bob      ● PENDING User   Mar 5     [✓ Approve]   │ │
│ │ [E] Eve      ● BANNED  User   Feb 10    [Unban]       │ │
│ └───────────────────────────────────────────────────────┘ │
└───────────────────────────────────────────────────────────┘
```

- Page padding: `p-8`, max-w-[900px] mx-auto
- Header row: flex, justify-between, align items-start
- Pending banner: `bg-warning/10 border border-warning/20 rounded-lg px-4 py-2 flex items-center gap-2 text-warning text-[12.5px] font-medium`

**Tabs:**
- `border-b border-border`, tab buttons flush to bottom
- Active tab: `bg-muted text-foreground font-medium`, bottom border removes (use negative margin trick)
- Inactive: `text-muted-foreground hover:bg-muted hover:text-foreground`

**Table:**
- `bg-card border border-border rounded-lg overflow-hidden`
- `<table>` with `w-full border-collapse`
- `<thead>`: `bg-muted`, cells `text-[11px] font-semibold uppercase tracking-widest text-muted-foreground px-4 py-2.5`
- `<tbody>` rows: `border-b border-border last:border-0`, `hover:bg-muted/40`
- Cell padding: `px-4 py-3`

**Status badge variants:**
- `ACTIVE`  → `variant="success"` with filled 6px circle dot prefix
- `PENDING` → `variant="warning"` with filled 6px circle dot prefix  
- `BANNED`  → `variant="destructive"` with filled 6px circle dot prefix

**User cell:**
- 30px avatar circle: `bg-muted` (regular user) or `bg-primary/10` (superadmin)
- Avatar initial: `text-[12px] font-semibold`
- Name: `font-medium text-[13px]`
- Email: `text-[11.5px] text-muted-foreground`

**Action buttons:**
- Small pill buttons, not the standard `Button` component
- Approve: `bg-success/10 text-success hover:bg-success/20 text-[12px] font-medium rounded-md px-3 py-1.5 flex items-center gap-1.5`
- Ban:     `bg-destructive/10 text-destructive hover:bg-destructive/20 ...`
- Unban:   `bg-muted text-muted-foreground hover:bg-muted/80 ...`
- Superadmin row: no action buttons rendered at all

---

## 10. File Structure (complete)

```
frontend/src/
├── lib/
│   └── cn.ts
├── components/
│   ├── theme-provider.tsx
│   ├── theme-toggle.tsx
│   ├── layout/
│   │   ├── AppLayout.tsx
│   │   └── Sidebar.tsx
│   └── ui/
│       ├── badge.tsx
│       ├── button.tsx
│       ├── card.tsx
│       ├── input.tsx
│       ├── label.tsx
│       ├── separator.tsx
│       └── textarea.tsx
├── pages/
│   ├── Login.tsx
│   ├── Register.tsx
│   ├── Chat.tsx
│   ├── History.tsx
│   └── admin/
│       └── Users.tsx
├── stores/            ← stub files only in Phase F1 — no API calls yet
│   ├── auth.store.ts
│   ├── chat.store.ts
│   └── kb.store.ts
├── api/               ← stub in Phase F1
│   └── client.ts
├── App.tsx
├── main.tsx
└── index.css
```

---

## 11. Zustand Store Stubs (Phase F1 — static data, no API)

Create these as stubs that hold hardcoded mock data. They will be replaced with real API calls in Phase F3.

### `auth.store.ts`

```typescript
import { create } from 'zustand';

interface User {
  id: number;
  name: string;
  email: string;
  role: 'user' | 'superadmin';
}

interface AuthStore {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => void;   // stub: always succeeds
  logout: () => void;
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  accessToken: null,
  isAuthenticated: false,
  login: (_email, _password) =>
    set({
      isAuthenticated: true,
      accessToken: 'stub-token',
      user: { id: 1, name: 'admin', email: 'admin@nexus.local', role: 'superadmin' },
    }),
  logout: () => set({ user: null, accessToken: null, isAuthenticated: false }),
}));
```

### `chat.store.ts`

```typescript
import { create } from 'zustand';

export type ChatMode = 'web' | 'kb' | 'deep';

export interface ChatSource { title: string; url: string; }
export interface Message {
  id: number;
  role: 'user' | 'assistant';
  content: string;
  sources?: ChatSource[];
}
export interface Session { id: number; title: string; mode: ChatMode; updatedAt: string; }

interface ChatStore {
  sessions: Session[];
  activeSessionId: number | null;
  messages: Message[];
  mode: ChatMode;
  isStreaming: boolean;
  streamingContent: string;
  setMode: (mode: ChatMode) => void;
  setActiveSession: (id: number | null) => void;
}

export const useChatStore = create<ChatStore>((set) => ({
  sessions: [
    { id: 1, title: "Quantum computing's threat to RSA encryption", mode: 'web', updatedAt: '2h ago' },
    { id: 2, title: 'React Server Components vs traditional SSR',   mode: 'web', updatedAt: 'Yesterday' },
    { id: 3, title: 'SQLite in production best practices',          mode: 'web', updatedAt: '2d ago' },
    { id: 4, title: 'TypeScript strict mode gotchas explained',     mode: 'web', updatedAt: '3d ago' },
    { id: 5, title: 'NestJS dependency injection deep dive',        mode: 'web', updatedAt: '5d ago' },
  ],
  activeSessionId: null,
  messages: [],
  mode: 'web',
  isStreaming: false,
  streamingContent: '',
  setMode: (mode) => set({ mode }),
  setActiveSession: (id) => set({ activeSessionId: id }),
}));
```

### `kb.store.ts`

```typescript
import { create } from 'zustand';

// Stub — full implementation in Phase 2
interface KbStore {
  items: unknown[];
  searchResults: unknown[];
  isLoading: boolean;
}

export const useKbStore = create<KbStore>(() => ({
  items: [],
  searchResults: [],
  isLoading: false,
}));
```

---

## 12. Implementation Order for the Agent

Follow this exact order. Do not skip ahead or combine steps.

1. **CSS & Tailwind** — Replace `index.css` and `tailwind.config.ts` (Section 3 & 4)
2. **Packages** — Run the `npm install` command from Section 2
3. **`src/lib/cn.ts`** — Utility function
4. **`src/components/theme-provider.tsx`** — Theme context
5. **`src/main.tsx`** — Wrap with ThemeProvider
6. **`src/components/ui/*`** — All 7 UI components (button, input, label, card, badge, separator, textarea)
7. **`src/components/theme-toggle.tsx`** — Theme toggle button
8. **Zustand stores** — All 3 stub files
9. **`src/App.tsx`** — Router setup
10. **`src/components/layout/AppLayout.tsx`** + **`Sidebar.tsx`** — Shell
11. **`src/pages/Login.tsx`** — Auth page
12. **`src/pages/Register.tsx`** — Auth page
13. **`src/pages/Chat.tsx`** — Main chat UI (static mock messages)
14. **`src/pages/History.tsx`** — History list
15. **`src/pages/admin/Users.tsx`** — Admin table with live approve/ban actions
16. **Smoke test** — Run `npm run dev`, navigate all routes, check dark/light toggle

---

## 13. What NOT to Do

These rules apply during Phase F1 (static UI). The agent must not violate any of them.

- ❌ Do not make any API calls — everything is mock/stub data
- ❌ Do not install any packages not listed in this spec or `package.json`
- ❌ Do not inline `style={}` props — use Tailwind classes exclusively
- ❌ Do not hardcode colour hex values anywhere in components
- ❌ Do not use `any` type in TypeScript
- ❌ Do not put business logic inside page components — it belongs in stores
- ❌ Do not create a single mega-component — one file per page, one file per UI component
- ❌ Do not add animations beyond simple `transition-colors` and `transition-[width]` — no keyframe animations in Phase F1
- ❌ Do not build the KB page — it is out of scope until Phase 2
- ❌ Do not build the Admin Logs or Stats pages — Phase 2

---

## 14. Acceptance Checklist

Before marking Phase F1 complete, verify every item:

- [ ] `npm run dev` starts without errors
- [ ] `npm run build` produces a clean TypeScript build with no type errors
- [ ] `npm run lint` passes with no errors
- [ ] Dark mode is the default on first load
- [ ] Theme toggle persists across page refresh (localStorage)
- [ ] Sidebar collapses to icon rail (52px), expands to 224px with smooth transition
- [ ] All 5 routes render without a blank screen: `/login`, `/register`, `/chat`, `/history`, `/admin/users`
- [ ] Login form navigates to `/chat`
- [ ] Register form shows the pending-approval success state
- [ ] Chat page shows mode pills; KB and Deep Research are visually disabled
- [ ] Chat page shows empty state when no session is active
- [ ] Chat page shows mock messages when a session is selected from sidebar
- [ ] History page lists sessions; clicking one navigates to `/chat/:id`
- [ ] Admin Users table renders all mock users with correct status badges
- [ ] Approve button changes PENDING → ACTIVE in the UI
- [ ] Ban button changes ACTIVE → BANNED in the UI
- [ ] Unban button changes BANNED → ACTIVE in the UI
- [ ] Superadmin row has no action buttons
- [ ] No `console.error` or React key warnings in browser console
