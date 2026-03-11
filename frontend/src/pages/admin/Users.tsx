// frontend/src/pages/admin/Users.tsx
import { useState } from 'react';
import { Check, Ban, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/cn';
import { Badge } from '@/components/ui/badge';

type UserStatus = 'ACTIVE' | 'PENDING' | 'BANNED';
type UserRole = 'user' | 'superadmin';

interface AdminUser {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  joined: string;
}

const MOCK_USERS: AdminUser[] = [
  {
    id: 1,
    name: 'Admin',
    email: 'admin@nexus.local',
    role: 'superadmin',
    status: 'ACTIVE',
    joined: 'Jan 1, 2026',
  },
  {
    id: 2,
    name: 'Alice',
    email: 'alice@example.com',
    role: 'user',
    status: 'ACTIVE',
    joined: 'Feb 20, 2026',
  },
  {
    id: 3,
    name: 'Bob',
    email: 'bob@example.com',
    role: 'user',
    status: 'PENDING',
    joined: 'Mar 5, 2026',
  },
  {
    id: 4,
    name: 'Carol',
    email: 'carol@example.com',
    role: 'user',
    status: 'PENDING',
    joined: 'Mar 6, 2026',
  },
  {
    id: 5,
    name: 'David',
    email: 'david@example.com',
    role: 'user',
    status: 'ACTIVE',
    joined: 'Feb 15, 2026',
  },
  {
    id: 6,
    name: 'Eve',
    email: 'eve@example.com',
    role: 'user',
    status: 'BANNED',
    joined: 'Feb 10, 2026',
  },
  {
    id: 7,
    name: 'Frank',
    email: 'frank@example.com',
    role: 'user',
    status: 'PENDING',
    joined: 'Mar 7, 2026',
  },
  {
    id: 8,
    name: 'Grace',
    email: 'grace@example.com',
    role: 'user',
    status: 'ACTIVE',
    joined: 'Jan 15, 2026',
  },
];

type TabFilter = 'all' | 'pending';

function statusBadgeVariant(status: UserStatus) {
  if (status === 'ACTIVE') return 'success' as const;
  if (status === 'PENDING') return 'warning' as const;
  if (status === 'BANNED') return 'destructive' as const;
  return 'secondary' as const;
}

export function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>(MOCK_USERS);
  const [tab, setTab] = useState<TabFilter>('all');

  const pendingCount = users.filter((u) => u.status === 'PENDING').length;
  const visibleUsers = tab === 'pending' ? users.filter((u) => u.status === 'PENDING') : users;

  const approve = (id: number) =>
    setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, status: 'ACTIVE' } : u)));
  const ban = (id: number) =>
    setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, status: 'BANNED' } : u)));
  const unban = (id: number) =>
    setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, status: 'ACTIVE' } : u)));

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
                  <th
                    key={h}
                    className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-widest text-muted-foreground"
                  >
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
                      <div
                        className={cn(
                          'w-[30px] h-[30px] rounded-full flex items-center justify-center shrink-0',
                          user.role === 'superadmin' ? 'bg-primary/10' : 'bg-muted',
                        )}
                      >
                        <span
                          className={cn(
                            'text-[12px] font-semibold',
                            user.role === 'superadmin' ? 'text-primary' : 'text-muted-foreground',
                          )}
                        >
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
                      <span
                        className={cn(
                          'w-1.5 h-1.5 rounded-full',
                          user.status === 'ACTIVE' && 'bg-success',
                          user.status === 'PENDING' && 'bg-warning',
                          user.status === 'BANNED' && 'bg-destructive',
                        )}
                      />
                      {user.status}
                    </Badge>
                  </td>

                  {/* Role */}
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        'text-[13px]',
                        user.role === 'superadmin'
                          ? 'text-primary font-medium'
                          : 'text-muted-foreground',
                      )}
                    >
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
