import { useEffect, useState } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { RequireAuth } from '@/components/RequireAuth';
import { RequireSuperadmin } from '@/components/RequireSuperadmin';
import Chat from '@/pages/Chat';
import History from '@/pages/History';
import Login from '@/pages/Login';
import Register from '@/pages/Register';
import AdminUsers from '@/pages/admin/AdminUsers';
import { useAuthStore } from '@/stores/auth.store';

function App() {
  const initialise = useAuthStore((state) => state.initialise);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    void initialise().finally(() => setIsReady(true));
  }, [initialise]);

  if (!isReady) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-100">
        <div className="rounded-[1.75rem] border border-slate-800 bg-slate-900/70 px-8 py-6 text-center">
          <p className="text-xs uppercase tracking-[0.35em] text-cyan-300">Nexus</p>
          <p className="mt-3 text-sm text-slate-400">Restoring session...</p>
        </div>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      <Route element={<RequireAuth />}>
        <Route path="/chat" element={<Chat />} />
        <Route path="/chat/:sessionId" element={<Chat />} />
        <Route
          path="/kb"
          element={
            <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-100">
              Coming in Phase 2
            </div>
          }
        />
        <Route path="/history" element={<History />} />

        <Route path="/admin" element={<Navigate to="/admin/users" replace />} />
        <Route element={<RequireSuperadmin />}>
          <Route path="/admin/users" element={<AdminUsers />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/chat" replace />} />
    </Routes>
  );
}

export default App;
