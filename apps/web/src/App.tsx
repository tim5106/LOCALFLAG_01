import { AppShell } from './components/AppShell';
import { CheckInPage } from './features/check-in/CheckInPage';
import { DiscoveryPage } from './features/discovery/DiscoveryPage';
import { MyFlagPage } from './features/my-flag/MyFlagPage';
import { useUiStore } from './store/ui-store';
import { LoginPage } from './features/auth/LoginPage';
import { getStoredUser } from './features/auth/auth';
import { useState } from 'react';
import { CheckInTestPage } from './features/check-in/CheckInTestPage';

const pages = {
  discovery: DiscoveryPage,
  'check-in': CheckInPage,
  'my-flag': MyFlagPage,
};

export function App() {
  const [user, setUser] = useState(getStoredUser);
  const { activeTab, setActiveTab } = useUiStore();
  if (window.location.pathname === '/check-in/test' && import.meta.env.DEV) return <div className="app-shell"><div className="app-frame"><CheckInTestPage /></div></div>;
  const ActivePage = pages[activeTab];

  if (!user) return <div className="app-shell"><div className="app-frame"><LoginPage onSignedIn={() => setUser(getStoredUser())} /></div></div>;
  return (
    <AppShell activeTab={activeTab} onTabChange={setActiveTab}>
      <ActivePage />
    </AppShell>
  );
}

