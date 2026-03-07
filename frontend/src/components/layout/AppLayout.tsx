import { MessageSquare, Shield, History, LogOut } from 'lucide-react';
import type { PropsWithChildren } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { logout } from '@/api/auth.api';
import { useAuthStore } from '@/stores/auth.store';

export function AppLayout({ children }: PropsWithChildren) {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const clearAuth = useAuthStore((state) => state.logout);

  const handleLogout = async () => {
    try {
      await logout();
    } finally {
      clearAuth();
      navigate('/login');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50">
      <div className="mx-auto flex min-h-screen max-w-7xl">
        <aside className="hidden w-72 shrink-0 border-r border-slate-800 bg-slate-900/70 p-6 md:flex md:flex-col">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-cyan-300">Nexus</p>
            <h1 className="mt-2 font-serif text-3xl font-semibold">Research Console</h1>
            <p className="mt-2 text-sm text-slate-400">
              Web research for approved users with saved sessions and admin controls.
            </p>
          </div>

          <nav className="mt-8 space-y-2">
            <LayoutLink to="/chat" label="Chat" icon={<MessageSquare className="h-4 w-4" />} />
            <LayoutLink to="/history" label="History" icon={<History className="h-4 w-4" />} />
            {user?.role === 'SUPERADMIN' ? (
              <LayoutLink to="/admin/users" label="Admin" icon={<Shield className="h-4 w-4" />} />
            ) : null}
          </nav>

          <div className="mt-auto rounded-2xl border border-slate-800 bg-slate-950/80 p-4">
            <p className="text-sm font-medium text-slate-200">{user?.username || 'Signed in'}</p>
            <p className="mt-1 text-xs text-slate-400">{user?.email}</p>
            <button
              type="button"
              onClick={handleLogout}
              className="mt-4 inline-flex items-center gap-2 rounded-full border border-slate-700 px-4 py-2 text-sm text-slate-200 transition hover:border-cyan-400 hover:text-white"
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </button>
          </div>
        </aside>

        <div className="flex min-h-screen flex-1 flex-col">
          <header className="border-b border-slate-800 bg-slate-950/80 px-5 py-4 backdrop-blur md:px-8">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Phase 1</p>
                <p className="mt-1 text-sm text-slate-300">Auth, core chat, history, approvals</p>
              </div>
              <p className="text-sm text-slate-400">
                {user?.role === 'SUPERADMIN' ? 'Superadmin' : 'User'}
              </p>
            </div>
          </header>

          <main className="flex-1">{children}</main>
        </div>
      </div>
    </div>
  );
}

function LayoutLink({ to, label, icon }: { to: string; label: string; icon: JSX.Element }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `flex items-center gap-3 rounded-2xl px-4 py-3 text-sm transition ${
          isActive
            ? 'bg-cyan-400/10 text-cyan-200 ring-1 ring-cyan-400/30'
            : 'text-slate-300 hover:bg-slate-800/70 hover:text-white'
        }`
      }
    >
      {icon}
      {label}
    </NavLink>
  );
}
