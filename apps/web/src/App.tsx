import { BottomNavigation } from './components/BottomNavigation';
import { CheckInPage } from './features/check-in/CheckInPage';
import { DiscoveryPage } from './features/discovery/DiscoveryPage';
import { MyFlagPage } from './features/my-flag/MyFlagPage';
import { useUiStore } from './store/ui-store';

const pages = {
  discovery: DiscoveryPage,
  'check-in': CheckInPage,
  'my-flag': MyFlagPage,
};

export function App() {
  const { activeTab, setActiveTab } = useUiStore();
  const ActivePage = pages[activeTab];

  return (
    <div className="app-shell">
      <div className="app-frame">
        <ActivePage />
        <BottomNavigation activeTab={activeTab} onChange={setActiveTab} />
      </div>
    </div>
  );
}

