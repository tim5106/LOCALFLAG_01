import { AppShell } from './components/AppShell';
import { CheckInExperiencePage } from './features/check-in/CheckInExperiencePage';
import { DiscoveryPage } from './features/discovery/DiscoveryPage';
import { MyFlagPage } from './features/my-flag/MyFlagPage';
import { useUiStore } from './store/ui-store';
import { LoginPage } from './features/auth/LoginPage';
import { getStoredUser } from './features/auth/auth';
import { useState } from 'react';

const pages = {
  discovery: DiscoveryPage,
  'check-in': CheckInExperiencePage,
  'my-flag': MyFlagPage,
};

export function App() {
  const [user, setUser] = useState(getStoredUser);
  const { activeTab, setActiveTab } = useUiStore();
  const ActivePage = pages[activeTab];

  if (!user) return <div className="app-shell"><div className="app-frame"><LoginPage onSignedIn={() => setUser(getStoredUser())} /></div></div>;
  return (
    <AppShell activeTab={activeTab} onTabChange={setActiveTab}>
      <ActivePage />
    </AppShell>
  );
}

