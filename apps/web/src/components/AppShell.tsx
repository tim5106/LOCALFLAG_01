import type { ReactNode } from 'react';
import { BottomNavigation } from './BottomNavigation';
import type { AppTab } from '../store/ui-store';

interface AppShellProps {
  activeTab: AppTab;
  onTabChange: (tab: AppTab) => void;
  children: ReactNode;
}

export function AppShell({ activeTab, onTabChange, children }: AppShellProps) {
  return (
    <div className="app-shell">
      <div className="app-frame">
        {children}
        <BottomNavigation activeTab={activeTab} onChange={onTabChange} />
      </div>
    </div>
  );
}
