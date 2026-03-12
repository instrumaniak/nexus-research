import { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { useState } from 'react';
import { useChatStore } from '@/stores/chat.store';

export function AppLayout({ children }: { children?: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(true); // default: icon rail
  const fetchSessions = useChatStore((s) => s.fetchSessions);

  useEffect(() => {
    void fetchSessions();
  }, [fetchSessions]);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} />
      <main className="flex flex-1 flex-col overflow-hidden">{children || <Outlet />}</main>
    </div>
  );
}
