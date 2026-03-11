// frontend/src/App.tsx
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

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public — redirect to /chat if already authenticated */}
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

        {/* Protected — requires authentication */}
        <Route element={<RequireAuth />}>
          <Route element={<AppLayout />}>
            <Route index element={<Navigate to="/chat" replace />} />
            <Route path="/chat" element={<ChatPage />} />
            <Route path="/chat/:id" element={<ChatPage />} />
            <Route path="/history" element={<HistoryPage />} />

            {/* Admin — requires superadmin role */}
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
