import { AppShell } from './components/AppShell';
import { CheckInPage } from './features/check-in/CheckInPage';
import { DiscoveryPage } from './features/discovery/DiscoveryPage';
import { MyFlagPage } from './features/my-flag/MyFlagPage';
import { useUiStore, type AppTab } from './store/ui-store';
import { LoginPage } from './features/auth/LoginPage';
import { getStoredUser } from './features/auth/auth';
import { useState } from 'react';
import { CheckInTestPage } from './features/check-in/CheckInTestPage';

import { ProfilePage } from './features/profile/ProfilePage';
import { PointShopPage } from './features/point-shop/PointShopPage';

const pages = {
  discovery: DiscoveryPage,
  'check-in': CheckInPage,
  'my-flag': MyFlagPage,
};

export function App() {
  const [user, setUser] = useState(getStoredUser);
  const { activeTab, setActiveTab, setDiscoveryView, profileOpen, closeProfile, shopOpen, closeShop } = useUiStore();
  if (window.location.pathname === '/check-in/test' && import.meta.env.DEV) return <div className="app-shell"><div className="app-frame"><CheckInTestPage /></div></div>;
  const ActivePage = pages[activeTab];

  const handleTabChange = (tab: AppTab) => {
    closeShop();
    closeProfile();
    if (tab === 'discovery') {
      setDiscoveryView('map');
    }
    setActiveTab(tab);
  };

  if (!user) return <div className="app-shell"><div className="app-frame"><LoginPage onSignedIn={() => setUser(getStoredUser())} /></div></div>;
  return (
    <AppShell activeTab={activeTab} onTabChange={handleTabChange}>
      {shopOpen ? (
        <PointShopPage />
      ) : profileOpen ? (
        <ProfilePage onSignOut={() => setUser(null)} />
      ) : (
        <ActivePage />
      )}
    </AppShell>
  );
}

