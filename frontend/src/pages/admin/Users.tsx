import { useState } from 'react';
import { AlertTriangle, Check, Ban, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/cn';
import { Badge } from '@/components/ui/badge';

type UserRole = 'User' | 'Superadmin';
type UserStatus = 'ACTIVE' | 'PENDING' | 'BANNED';

interface AdminUser {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  joined: string;
}

const mockUsers: AdminUser[] = [
  {
    id: 1,
    name: 'Admin',
    email: 'admin@nexus.local',
    role: 'Superadmin',
    status: 'ACTIVE',
    joined: 'Feb 1',
  },
  {
    id: 2,
    name: 'Alice',
    email: 'alice@example.com',
    role: 'User',
    status: 'ACTIVE',
    joined: 'Mar 1',
  },
  {
    id: 3,
    name: 'Bob',
    email: 'bob@example.com',
    role: 'User',
    status: 'PENDING',
    joined: 'Mar 5',
  },
  {
    id: 4,
    name: 'Eve',
    email: 'eve@example.com',
    role: 'User',
    status: 'BANNED',
    joined: 'Feb 10',
  },
];

export function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>(mockUsers);
  const [activeTab, setActiveTab] = useState<'All' | 'Pending'>('All');

  const pendingCount = users.filter((u) => u.status === 'PENDING').length;

  const displayedUsers = activeTab === 'All' ? users : users.filter((u) => u.status === 'PENDING');

  const updateStatus = (id: number, newStatus: UserStatus) => {
    setUsers(users.map((u) => (u.id === id ? { ...u, status: newStatus } : u)));
  };

  return (
    <div className="flex-1 overflow-y-auto bg-background p-8">
      <div className="max-w-[900px] mx-auto">
        {/* Header Row */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-xl font-semibold text-foreground">User Management</h1>
            <p className="text-sm text-muted-foreground mt-1">{users.length} total users</p>
          </div>
          {pendingCount > 0 && (
            <div className="bg-warning/10 border border-warning/20 rounded-lg px-4 py-2 flex items-center gap-2 text-warning text-[12.5px] font-medium">
              <AlertTriangle size={16} />
              {pendingCount} pending approval
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border mb-6">
          <button
            onClick={() => setActiveTab('All')}
            className={cn(
              'px-4 py-2.5 text-sm transition-colors -mb-px border-b-2',
              activeTab === 'All'
                ? 'border-primary text-foreground font-medium'
                : 'border-transparent text-muted-foreground hover:bg-muted hover:text-foreground',
            )}
          >
            All Users ({users.length})
          </button>
          <button
            onClick={() => setActiveTab('Pending')}
            className={cn(
              'px-4 py-2.5 text-sm transition-colors -mb-px border-b-2',
              activeTab === 'Pending'
                ? 'border-primary text-foreground font-medium'
                : 'border-transparent text-muted-foreground hover:bg-muted hover:text-foreground',
            )}
          >
            Pending ({pendingCount})
          </button>
        </div>

        {/* Table */}
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <table className="w-full border-collapse">
            <thead className="bg-muted">
              <tr>
                <th className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground px-4 py-2.5 text-left">
                  User
                </th>
                <th className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground px-4 py-2.5 text-left">
                  Status
                </th>
                <th className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground px-4 py-2.5 text-left">
                  Role
                </th>
                <th className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground px-4 py-2.5 text-left">
                  Joined
                </th>
                <th className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground px-4 py-2.5 text-right w-[140px]">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {displayedUsers.map((user) => (
                <tr
                  key={user.id}
                  className="border-b border-border last:border-0 hover:bg-muted/40 transition-colors"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div
                        className={cn(
                          'w-[30px] h-[30px] rounded-full flex items-center justify-center shrink-0',
                          user.role === 'Superadmin'
                            ? 'bg-primary/10 text-primary'
                            : 'bg-muted text-foreground',
                        )}
                      >
                        <span className="text-[12px] font-semibold">
                          {user.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="font-medium text-[13px] text-foreground truncate">
                          {user.name}
                        </span>
                        <span className="text-[11.5px] text-muted-foreground truncate">
                          {user.email}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <Badge
                      variant={
                        user.status === 'ACTIVE'
                          ? 'success'
                          : user.status === 'PENDING'
                            ? 'warning'
                            : 'destructive'
                      }
                      className="pl-2"
                    >
                      <div className="w-1.5 h-1.5 rounded-full mr-1.5 bg-current" />
                      {user.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-sm text-foreground">{user.role}</td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">{user.joined}</td>
                  <td className="px-4 py-3 text-right">
                    {user.role !== 'Superadmin' && (
                      <div className="flex items-center justify-end gap-2">
                        {user.status === 'PENDING' && (
                          <button
                            onClick={() => updateStatus(user.id, 'ACTIVE')}
                            className="bg-success/10 text-success hover:bg-success/20 text-[12px] font-medium rounded-md px-3 py-1.5 flex items-center gap-1.5 transition-colors"
                          >
                            <Check size={14} /> Approve
                          </button>
                        )}
                        {user.status === 'ACTIVE' && (
                          <button
                            onClick={() => updateStatus(user.id, 'BANNED')}
                            className="bg-destructive/10 text-destructive hover:bg-destructive/20 text-[12px] font-medium rounded-md px-3 py-1.5 flex items-center gap-1.5 transition-colors"
                          >
                            <Ban size={14} /> Ban
                          </button>
                        )}
                        {user.status === 'BANNED' && (
                          <button
                            onClick={() => updateStatus(user.id, 'ACTIVE')}
                            className="bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground text-[12px] font-medium rounded-md px-3 py-1.5 flex items-center gap-1.5 transition-colors"
                          >
                            <RotateCcw size={14} /> Unban
                          </button>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
              {displayedUsers.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground text-sm">
                    No users found.
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
