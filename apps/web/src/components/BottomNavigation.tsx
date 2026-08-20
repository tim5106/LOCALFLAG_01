import { Compass, Flag, MapPinCheck } from 'lucide-react';
import type { AppTab } from '../store/ui-store';

const items: Array<{ id: AppTab; label: string; icon: typeof Compass }> = [
  { id: 'discovery', label: '탐색', icon: Compass },
  { id: 'check-in', label: '현장 인증', icon: MapPinCheck },
  { id: 'my-flag', label: '마이 플래그', icon: Flag },
];

export function BottomNavigation({ activeTab, onChange }: { activeTab: AppTab; onChange: (tab: AppTab) => void }) {
  return <nav className="bottom-nav" aria-label="주요 메뉴">{items.map((item) => { const Icon = item.icon; const active = item.id === activeTab; return <button type="button" key={item.id} className="bottom-nav__item" data-active={active} aria-current={active ? 'page' : undefined} onClick={() => onChange(item.id)}><Icon size={21} strokeWidth={active ? 2.6 : 2} /><span>{item.label}</span></button>; })}</nav>;
}
