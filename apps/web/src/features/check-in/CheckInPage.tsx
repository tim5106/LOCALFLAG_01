import { Crosshair, ShieldCheck, RefreshCw } from 'lucide-react';
import { useState } from 'react';
import { CheckInMap } from '../../components/CheckInMap';

type LocationState = 'idle' | 'requesting' | 'denied' | 'inaccurate' | 'out-of-range' | 'unsupported';

export function CheckInPage() {
  const [state, setState] = useState<LocationState>('idle'); const [accuracy, setAccuracy] = useState<number | null>(null); const [position, setPosition] = useState<{ lat: number; lng: number } | null>(null);
  const requestLocation = () => { if (!navigator.geolocation) { setState('unsupported'); return; } setState('requesting'); navigator.geolocation.getCurrentPosition(({ coords }) => { setAccuracy(Math.round(coords.accuracy)); setPosition({ lat: coords.latitude, lng: coords.longitude }); setState(coords.accuracy > 50 ? 'inaccurate' : 'out-of-range'); }, (error) => setState(error.code === error.PERMISSION_DENIED ? 'denied' : 'out-of-range'), { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }); };
  const copy = { idle: ['위치 권한을 확인하기 전이에요', '현재 위치를 확인하면 가까운 체크인 장소를 안내해드려요.', '위치 권한 요청하기'], requesting: ['현재 위치를 확인하고 있어요', '잠시만 기다려주세요. 정확한 위치를 측정하고 있어요.', '위치 확인 중'], denied: ['위치 권한이 필요해요', '브라우저 설정에서 위치 권한을 허용한 뒤 다시 시도해주세요.', '다시 요청하기'], inaccurate: ['GPS 정확도가 부족해요', `현재 정확도는 ${accuracy ?? '-'}m예요. 50m 이내가 되도록 다시 측정해주세요.`, '다시 측정하기'], 'out-of-range': ['아직 체크인 범위 밖이에요', '선택한 장소에서 100m 이내로 이동하면 체크인할 수 있어요.', '현재 위치 다시 확인'], unsupported: ['위치 기능을 사용할 수 없어요', '이 브라우저에서는 위치 정보를 지원하지 않습니다.', '다시 시도하기'] }[state];
  const isRequesting = state === 'requesting';
  return <main className="page check-in-page"><header className="simple-header"><p className="eyebrow"><Crosshair size={15} /> 현장 인증</p><h1>가까운 플래그를 찾아볼까요?</h1><p>위치는 인증 순간에만 사용하며 이동 경로를 저장하지 않습니다.</p></header><CheckInMap position={position} /><section className="check-in-card"><div><span className={`status-dot status-dot--${state}`} /><small>{copy[0]}</small></div><h2>{copy[1]}</h2><button type="button" className="primary-button" disabled={isRequesting} onClick={requestLocation}>{isRequesting ? <><RefreshCw className="spin" size={19} /> {copy[2]}</> : <><Crosshair size={19} /> {copy[2]}</>}</button><p className="privacy-note"><ShieldCheck size={15} /> GPS 정확도와 거리를 서버에서 확인합니다.</p></section></main>;
}
