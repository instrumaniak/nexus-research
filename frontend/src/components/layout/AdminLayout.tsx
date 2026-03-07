import type { PropsWithChildren } from 'react';
import { AppLayout } from './AppLayout';

export function AdminLayout({ children }: PropsWithChildren) {
  return (
    <AppLayout>
      <div className="p-5 md:p-8">
        <div className="rounded-[2rem] border border-slate-800 bg-slate-900/70 p-6 shadow-2xl shadow-slate-950/30">
          <p className="text-xs uppercase tracking-[0.3em] text-amber-300">Superadmin</p>
          <h2 className="mt-2 font-serif text-3xl text-slate-50">
            User approvals and access control
          </h2>
          <p className="mt-2 max-w-2xl text-sm text-slate-400">
            Review pending accounts, approve access, and suspend users with immediate token
            revocation.
          </p>
        </div>
        <div className="mt-6">{children}</div>
      </div>
    </AppLayout>
  );
}
