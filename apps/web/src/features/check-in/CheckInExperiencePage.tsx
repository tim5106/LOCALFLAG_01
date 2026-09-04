import { Crosshair, ShieldCheck } from 'lucide-react';
import { useState } from 'react';
import { CheckInMap } from '../../components/CheckInMap';
import { CheckInStateCard } from '../../components/CheckInStateCard';
import type { CheckInViewState } from '../../lib/check-in-state';
import { useUiStore } from '../../store/ui-store';

const demoStates: Array<{ label: string; state: CheckInViewState }> = [
  { label: '인증 가능', state: { type: 'ready' } },
  { label: '권한 거부', state: { type: 'permission-denied' } },
  { label: 'GPS 불안정', state: { type: 'gps-inaccurate', accuracyM: 74 } },
  { label: '범위 밖', state: { type: 'out-of-range', distanceM: 136 } },
  { label: '빈 화면', state: { type: 'empty-nearby' } },
];

export function CheckInExperiencePage() {
  const [state, setState] = useState<CheckInViewState>({ type: 'ready' });
  const [position, setPosition] = useState<{ lat: number; lng: number } | null>(null);
  const setActiveTab = useUiStore((store) => store.setActiveTab);

  const requestLocation = () => {
    if (!navigator.geolocation) {
      setState({ type: 'permission-denied' });
      return;
    }

    setState({ type: 'locating' });
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setPosition({ lat: coords.latitude, lng: coords.longitude });
        setState(coords.accuracy > 50
          ? { type: 'gps-inaccurate', accuracyM: coords.accuracy }
          : { type: 'out-of-range', distanceM: 136 });
      },
      (error) => setState(error.code === error.PERMISSION_DENIED
        ? { type: 'permission-denied' }
        : { type: 'empty-nearby' }),
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 0 },
    );
  };

  return (
    <main className="page check-in-page">
      <header className="simple-header">
        <p className="eyebrow"><Crosshair size={15} /> 현장 인증</p>
        <h1>{'가까운 플래그를\n찾아볼게요.'}</h1>
        <p>위치는 인증 순간에만 사용하며 이동 경로를 저장하지 않습니다.</p>
      </header>

      <CheckInMap position={position} />

      <CheckInStateCard
        state={state}
        onPrimaryAction={requestLocation}
        onSecondaryAction={() => setActiveTab('discovery')}
      />

      <section className="state-preview" aria-label="UI 상태 미리보기">
        <div className="state-preview__heading">
          <div><small>UI QA</small><strong>상태 미리보기</strong></div>
          <ShieldCheck size={18} />
        </div>
        <div className="state-preview__chips">
          {demoStates.map((item) => (
            <button type="button" key={item.label} data-active={item.state.type === state.type} onClick={() => setState(item.state)}>
              {item.label}
            </button>
          ))}
        </div>
      </section>
    </main>
  );
}
