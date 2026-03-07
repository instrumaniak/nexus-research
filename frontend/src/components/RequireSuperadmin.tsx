import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '@/stores/auth.store';

export function RequireSuperadmin() {
  const user = useAuthStore((state) => state.user);

  if (user?.role !== 'SUPERADMIN') {
    return <Navigate to="/chat" replace />;
  }

  return <Outlet />;
}
