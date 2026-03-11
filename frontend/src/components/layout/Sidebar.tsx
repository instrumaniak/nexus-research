import {
  ChevronLeft,
  Menu,
  MessageSquarePlus,
  MessageSquare,
  Clock,
  Database,
  Shield,
  LogOut,
} from 'lucide-react';
import { NavLink, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/cn';
import { useAuthStore } from '@/stores/auth.store';
import { useChatStore } from '@/stores/chat.store';
import { ThemeToggle } from '@/components/theme-toggle';

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const { user, logout } = useAuthStore();
  const { sessions, clearSession } = useChatStore();
  const navigate = useNavigate();

  const userInitial = user?.name ? user.name.charAt(0).toUpperCase() : 'U';

  return (
    <div
      className={cn(
        'group flex flex-col bg-sidebar border-r border-sidebar-border transition-[width] duration-200 ease-in-out shrink-0',
        collapsed ? 'w-[var(--sidebar-width-icon)]' : 'w-[var(--sidebar-width)]',
      )}
    >
      {/* Header */}
      <div className="flex items-center h-[52px] border-b border-sidebar-border px-2.5">
        <button
          onClick={onToggle}
          title="Toggle Navigation"
          className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-muted text-muted-foreground hover:text-foreground shrink-0"
        >
          {collapsed ? <Menu size={18} /> : <ChevronLeft size={18} />}
        </button>
        {!collapsed && (
          <span className="ml-3 font-semibold text-foreground tracking-tight">Nexus</span>
        )}
      </div>

      {/* New Chat Button */}
      <div className="p-2.5 shrink-0">
        <button
          title="New Chat"
          onClick={() => {
            clearSession();
            navigate('/chat');
          }}
          className={cn(
            'flex items-center gap-3 w-full rounded-md border border-input bg-card hover:bg-muted hover:text-foreground text-foreground px-2.5 py-2 transition-colors',
            collapsed && 'justify-center px-0',
          )}
        >
          <MessageSquarePlus size={16} />
          {!collapsed && <span className="text-sm font-medium">New Chat</span>}
        </button>
      </div>

      {/* RECENT Sessions (expanded only) */}
      {!collapsed && (
        <div className="flex flex-col flex-1 overflow-hidden">
          <div className="px-4 py-2">
            <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">
              Recent
            </span>
          </div>
          <div className="flex-1 overflow-y-auto px-2 space-y-0.5">
            {sessions.map((session) => (
              <NavLink
                key={session.id}
                to={`/chat/${session.id}`}
                className={({ isActive }) =>
                  cn(
                    'block px-2.5 py-1.5 rounded-md text-[12.5px] truncate transition-colors',
                    isActive
                      ? 'bg-muted text-foreground font-medium'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                  )
                }
              >
                {session.title}
              </NavLink>
            ))}
          </div>
        </div>
      )}

      {/* Spacing if collapsed */}
      {collapsed && <div className="flex-1" />}

      {/* Main Nav */}
      <div className="flex flex-col gap-1 p-2 border-t border-sidebar-border shrink-0">
        <NavLink
          to="/chat"
          title="Chat"
          className={({ isActive }) =>
            cn(
              'flex items-center gap-3 w-full rounded-md px-2.5 py-1.5 transition-colors',
              isActive
                ? 'bg-accent text-accent-foreground'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground',
              collapsed && 'justify-center px-0',
            )
          }
        >
          <MessageSquare size={16} className="shrink-0" />
          {!collapsed && <span className="text-[13px] font-medium">Chat</span>}
        </NavLink>
        <NavLink
          to="/history"
          title="History"
          className={({ isActive }) =>
            cn(
              'flex items-center gap-3 w-full rounded-md px-2.5 py-1.5 transition-colors',
              isActive
                ? 'bg-accent text-accent-foreground'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground',
              collapsed && 'justify-center px-0',
            )
          }
        >
          <Clock size={16} className="shrink-0" />
          {!collapsed && <span className="text-[13px] font-medium">History</span>}
        </NavLink>
        <button
          title="Knowledge Base (Phase 2)"
          disabled
          className={cn(
            'flex items-center gap-3 w-full rounded-md px-2.5 py-1.5 opacity-40 cursor-not-allowed pointer-events-none text-muted-foreground',
            collapsed && 'justify-center px-0',
          )}
        >
          <Database size={16} className="shrink-0" />
          {!collapsed && <span className="text-[13px] font-medium">Knowledge Base</span>}
        </button>
        <NavLink
          to="/admin/users"
          title="Admin"
          className={({ isActive }) =>
            cn(
              'flex items-center gap-3 w-full rounded-md px-2.5 py-1.5 transition-colors',
              isActive
                ? 'bg-accent text-accent-foreground'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground',
              collapsed && 'justify-center px-0',
            )
          }
        >
          <Shield size={16} className="shrink-0" />
          {!collapsed && <span className="text-[13px] font-medium">Admin</span>}
        </NavLink>
      </div>

      {/* Footer / User Profile */}
      <div className="flex flex-col gap-2 p-2 shrink-0 border-t border-sidebar-border">
        {/* Theme toggle */}
        <div
          className={cn('flex items-center px-1', collapsed ? 'justify-center' : 'justify-start')}
        >
          <ThemeToggle />
        </div>

        <div className="flex flex-col px-1 pt-1 pb-1 gap-2">
          <div
            className={cn('flex items-center gap-3 w-full', collapsed && 'flex-col justify-center')}
          >
            <div className="flex items-center justify-center w-[28px] h-[28px] rounded-full bg-primary/20 text-primary font-semibold text-xs shrink-0">
              {userInitial}
            </div>
            {!collapsed && (
              <div className="flex flex-col flex-1 overflow-hidden">
                <span className="text-xs font-medium text-foreground truncate">
                  {user?.name || 'User'}
                </span>
                <span className="text-[10px] text-muted-foreground truncate">
                  {user?.email || 'user@example.com'}
                </span>
              </div>
            )}
            {collapsed ? (
              <button
                onClick={logout}
                title="Log out"
                className="flex items-center justify-center text-muted-foreground hover:text-foreground p-1"
              >
                <LogOut size={16} />
              </button>
            ) : (
              <button
                onClick={logout}
                title="Log out"
                className="text-muted-foreground hover:text-foreground shrink-0 p-1"
              >
                <LogOut size={14} />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
