import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { LoginPage } from '@/pages/Login';
import { RegisterPage } from '@/pages/Register';
import { ChatPage } from '@/pages/Chat';
import { HistoryPage } from '@/pages/History';
import { AdminUsersPage } from '@/pages/admin/Users';
import { AppLayout } from '@/components/layout/AppLayout';
import { RequireAuth } from '@/components/RequireAuth';
import { RequireSuperadmin } from '@/components/RequireSuperadmin';
import { PublicOnlyRoute } from '@/components/PublicOnlyRoute';
import { useAuthStore } from '@/stores/auth.store';

export default function App() {
  const { initialise, isInitialising } = useAuthStore();

  useEffect(() => {
    void initialise();
  }, [initialise]);

  // Block all routing until session restore is resolved.
  // Without this, RequireAuth would redirect to /login on a page refresh
  // before the refresh cookie has been checked.
  if (isInitialising) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <span className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/login"
          element={
            <PublicOnlyRoute>
              <LoginPage />
            </PublicOnlyRoute>
          }
        />
        <Route
          path="/register"
          element={
            <PublicOnlyRoute>
              <RegisterPage />
            </PublicOnlyRoute>
          }
        />

        <Route element={<RequireAuth />}>
          <Route element={<AppLayout />}>
            <Route index element={<Navigate to="/chat" replace />} />
            <Route path="/chat" element={<ChatPage />} />
            <Route path="/chat/:id" element={<ChatPage />} />
            <Route path="/history" element={<HistoryPage />} />

            <Route element={<RequireSuperadmin />}>
              <Route path="/admin/users" element={<AdminUsersPage />} />
            </Route>
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/chat" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
