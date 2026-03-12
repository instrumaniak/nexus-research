// frontend/src/pages/admin/Users.tsx
import { useEffect, useMemo, useState } from 'react';
import { Check, Ban, RotateCcw, Loader2 } from 'lucide-react';
import { cn } from '@/lib/cn';
import { Badge } from '@/components/ui/badge';
import { approveUser, banUser, getUsers, unbanUser } from '@/api/admin.api';
import type { AdminUser } from '@/types';

type TabFilter = 'all' | 'pending';

function statusBadgeVariant(status: AdminUser['status']) {
  if (status === 'ACTIVE') return 'success' as const;
  if (status === 'PENDING') return 'warning' as const;
  return 'destructive' as const;
}

export function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [tab, setTab] = useState<TabFilter>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
    return () => {
      active = false;
    };
  }, []);

  const pendingCount = useMemo(() => users.filter((u) => u.status === 'PENDING').length, [users]);
  const visibleUsers = useMemo(
    () => (tab === 'pending' ? users.filter((u) => u.status === 'PENDING') : users),
    [users, tab],
  );

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
              <span className="text-[12.5px] font-medium text-warning">
                {pendingCount} pending approval
              </span>
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
                          user.role.toUpperCase() === 'SUPERADMIN' ? 'bg-primary/10' : 'bg-muted',
                        )}
                      >
                        <span
                          className={cn(
                            'text-[12px] font-semibold',
                            user.role.toUpperCase() === 'SUPERADMIN'
                              ? 'text-primary'
                              : 'text-muted-foreground',
                          )}
                        >
                          {user.username.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <div className="text-[13px] font-medium text-foreground">
                          {user.username}
                        </div>
                        <div className="text-[11.5px] text-muted-foreground">{user.email}</div>
                      </div>
                    </div>
                  </td>

                  {/* Status */}
                  <td className="px-4 py-3">
                    <Badge variant={statusBadgeVariant(user.status)}>
                      <span
                        className={cn(
                          'w-1.5 h-1.5 rounded-full mr-1.5',
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
                        user.role.toUpperCase() === 'SUPERADMIN'
                          ? 'text-primary font-medium'
                          : 'text-muted-foreground',
                      )}
                    >
                      {user.role.toUpperCase() === 'SUPERADMIN' ? 'Superadmin' : 'User'}
                    </span>
                  </td>

                  {/* Joined */}
                  <td className="px-4 py-3 text-[13px] text-muted-foreground">
                    {new Date(user.createdAt).toLocaleDateString()}
                  </td>

                  {/* Actions */}
                  <td className="px-4 py-3">
                    {user.role.toUpperCase() !== 'SUPERADMIN' && (
                      <div className="flex gap-2">
                        {user.status === 'PENDING' && (
                          <button
                            onClick={() =>
                              optimisticUpdate(
                                user.id,
                                (u) => ({ ...u, status: 'ACTIVE' }),
                                () => approveUser(user.id),
                              )
                            }
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[12px] font-medium bg-success/10 text-success hover:bg-success/20 transition-colors"
                          >
                            <Check size={11} /> Approve
                          </button>
                        )}
                        {user.status === 'ACTIVE' && (
                          <button
                            onClick={() =>
                              optimisticUpdate(
                                user.id,
                                (u) => ({ ...u, status: 'BANNED' }),
                                () => banUser(user.id),
                              )
                            }
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[12px] font-medium bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors"
                          >
                            <Ban size={11} /> Ban
                          </button>
                        )}
                        {user.status === 'BANNED' && (
                          <button
                            onClick={() =>
                              optimisticUpdate(
                                user.id,
                                (u) => ({ ...u, status: 'ACTIVE' }),
                                () => unbanUser(user.id),
                              )
                            }
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
