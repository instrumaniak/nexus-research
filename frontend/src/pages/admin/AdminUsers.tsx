import { useEffect, useMemo, useState } from 'react';
import { approveUser, banUser, getUsers, unbanUser } from '@/api/admin.api';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { formatDateTime } from '@/lib/time';
import type { AdminUser } from '@/types';

type StatusFilter = 'ALL' | 'ACTIVE' | 'BANNED';

export default function AdminUsers() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [pendingBanUser, setPendingBanUser] = useState<AdminUser | null>(null);

  useEffect(() => {
    let active = true;

    void (async () => {
      try {
        const data = await getUsers();
        if (active) {
          setUsers(data);
        }
      } catch {
        if (active) {
          setError('Failed to load users');
        }
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  const pendingUsers = useMemo(() => users.filter((user) => user.status === 'PENDING'), [users]);
  const visibleUsers = useMemo(
    () => users.filter((user) => (statusFilter === 'ALL' ? true : user.status === statusFilter)),
    [statusFilter, users],
  );

  const optimisticUpdate = async (
    userId: number,
    updater: (user: AdminUser) => AdminUser,
    request: () => Promise<AdminUser>,
  ) => {
    const previousUsers = users;
    setError(null);
    setUsers((current) => current.map((user) => (user.id === userId ? updater(user) : user)));

    try {
      const updatedUser = await request();
      setUsers((current) => current.map((user) => (user.id === userId ? updatedUser : user)));
    } catch {
      setUsers(previousUsers);
      setError('Failed to update user status');
    }
  };

  return (
    <AdminLayout>
      {error ? (
        <p className="mb-6 rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
          {error}
        </p>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <section className="rounded-[1.75rem] border border-slate-800 bg-slate-900/60 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-amber-300">Pending Approvals</p>
              <h3 className="mt-2 font-serif text-2xl text-slate-50">Review new registrations</h3>
            </div>
            <span className="rounded-full bg-amber-400/10 px-3 py-1 text-xs text-amber-200">
              {pendingUsers.length} pending
            </span>
          </div>

          {isLoading ? (
            <SkeletonRows rows={3} />
          ) : pendingUsers.length === 0 ? (
            <p className="mt-6 rounded-2xl border border-dashed border-slate-700 px-4 py-5 text-sm text-slate-400">
              No pending users right now.
            </p>
          ) : (
            <div className="mt-6 space-y-4">
              {pendingUsers.map((user) => (
                <div
                  key={user.id}
                  className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4"
                >
                  <p className="font-medium text-slate-100">{user.username}</p>
                  <p className="mt-1 text-sm text-slate-400">{user.email}</p>
                  <p className="mt-2 text-xs text-slate-500">
                    Registered {formatDateTime(user.createdAt)}
                  </p>
                  <button
                    type="button"
                    onClick={() =>
                      optimisticUpdate(
                        user.id,
                        (current) => ({ ...current, status: 'ACTIVE' }),
                        () => approveUser(user.id),
                      )
                    }
                    className="mt-4 rounded-full bg-emerald-400 px-4 py-2 text-sm font-medium text-slate-950 transition hover:bg-emerald-300"
                  >
                    Approve
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-[1.75rem] border border-slate-800 bg-slate-900/60 p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-cyan-300">All Users</p>
              <h3 className="mt-2 font-serif text-2xl text-slate-50">Access status and actions</h3>
            </div>

            <div className="flex gap-2">
              {(['ALL', 'ACTIVE', 'BANNED'] as const).map((filter) => (
                <button
                  key={filter}
                  type="button"
                  onClick={() => setStatusFilter(filter)}
                  className={`rounded-full px-4 py-2 text-sm transition ${
                    statusFilter === filter
                      ? 'bg-cyan-400 text-slate-950'
                      : 'border border-slate-700 text-slate-300 hover:border-cyan-400'
                  }`}
                >
                  {filter}
                </button>
              ))}
            </div>
          </div>

          {isLoading ? (
            <SkeletonRows rows={5} />
          ) : (
            <div className="mt-6 overflow-hidden rounded-2xl border border-slate-800">
              <table className="min-w-full divide-y divide-slate-800 text-left text-sm">
                <thead className="bg-slate-950/80 text-slate-400">
                  <tr>
                    <th className="px-4 py-3 font-medium">Username</th>
                    <th className="px-4 py-3 font-medium">Email</th>
                    <th className="px-4 py-3 font-medium">Role</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Registered</th>
                    <th className="px-4 py-3 font-medium">Last login</th>
                    <th className="px-4 py-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 bg-slate-900/70">
                  {visibleUsers.map((user) => (
                    <tr key={user.id}>
                      <td className="px-4 py-3 text-slate-100">{user.username}</td>
                      <td className="px-4 py-3 text-slate-300">{user.email}</td>
                      <td className="px-4 py-3 text-slate-300">{user.role}</td>
                      <td className="px-4 py-3">
                        <span className="rounded-full bg-slate-800 px-3 py-1 text-xs text-slate-200">
                          {user.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-400">{formatDateTime(user.createdAt)}</td>
                      <td className="px-4 py-3 text-slate-400">
                        {formatDateTime(user.lastLoginAt)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-2">
                          {user.status === 'PENDING' ? (
                            <ActionButton
                              label="Approve"
                              tone="emerald"
                              onClick={() =>
                                optimisticUpdate(
                                  user.id,
                                  (current) => ({ ...current, status: 'ACTIVE' }),
                                  () => approveUser(user.id),
                                )
                              }
                            />
                          ) : null}
                          {user.status === 'ACTIVE' ? (
                            <ActionButton
                              label="Ban"
                              tone="rose"
                              onClick={() => setPendingBanUser(user)}
                            />
                          ) : null}
                          {user.status === 'BANNED' ? (
                            <ActionButton
                              label="Unban"
                              tone="cyan"
                              onClick={() =>
                                optimisticUpdate(
                                  user.id,
                                  (current) => ({ ...current, status: 'ACTIVE' }),
                                  () => unbanUser(user.id),
                                )
                              }
                            />
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      {pendingBanUser ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 px-4">
          <div className="w-full max-w-md rounded-[1.75rem] border border-slate-800 bg-slate-900 p-6 shadow-2xl">
            <p className="text-xs uppercase tracking-[0.3em] text-rose-300">Confirm ban</p>
            <h3 className="mt-2 font-serif text-2xl text-slate-50">
              Ban {pendingBanUser.username}?
            </h3>
            <p className="mt-3 text-sm leading-6 text-slate-400">
              This will suspend the account and revoke all refresh tokens immediately.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setPendingBanUser(null)}
                className="rounded-full border border-slate-700 px-4 py-2 text-sm text-slate-200"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  const user = pendingBanUser;
                  setPendingBanUser(null);
                  await optimisticUpdate(
                    user.id,
                    (current) => ({ ...current, status: 'BANNED' }),
                    () => banUser(user.id),
                  );
                }}
                className="rounded-full bg-rose-400 px-4 py-2 text-sm font-medium text-slate-950"
              >
                Confirm ban
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </AdminLayout>
  );
}

function ActionButton({
  label,
  tone,
  onClick,
}: {
  label: string;
  tone: 'emerald' | 'rose' | 'cyan';
  onClick: () => void;
}) {
  const styles = {
    emerald: 'bg-emerald-400 text-slate-950 hover:bg-emerald-300',
    rose: 'bg-rose-400 text-slate-950 hover:bg-rose-300',
    cyan: 'bg-cyan-400 text-slate-950 hover:bg-cyan-300',
  };

  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${styles[tone]}`}
    >
      {label}
    </button>
  );
}

function SkeletonRows({ rows }: { rows: number }) {
  return (
    <div className="mt-6 space-y-3">
      {Array.from({ length: rows }).map((_, index) => (
        <div
          key={index}
          className="h-20 animate-pulse rounded-2xl border border-slate-800 bg-slate-950/60"
        />
      ))}
    </div>
  );
}
