import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { useState } from 'react';

export function AppLayout({ children }: { children?: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(true); // default: icon rail

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} />
      <main className="flex flex-1 flex-col overflow-hidden">{children || <Outlet />}</main>
    </div>
  );
}
