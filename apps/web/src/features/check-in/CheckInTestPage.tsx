import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getSpots } from '../../api/client';
import { CheckInMap } from '../../components/CheckInMap';
import { calculateDistanceMeters, CHECK_IN_RADIUS_METERS, formatDistance } from './distance';

const DEFAULT_LOCATION = { lat: 37.58, lng: 126.98 };

export function CheckInTestPage() {
  const [position, setPosition] = useState(DEFAULT_LOCATION);
  const [latitude, setLatitude] = useState(String(DEFAULT_LOCATION.lat));
  const [longitude, setLongitude] = useState(String(DEFAULT_LOCATION.lng));
  const [error, setError] = useState('');
  const spotsQuery = useQuery({ queryKey: ['check-in-test-spots'], queryFn: () => getSpots({ areaCode: '1', sigunguCode: '23', limit: 20 }) });
  const spots = spotsQuery.data?.data ?? [];
  const applyPosition = (lat: number, lng: number) => { if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) { setError('위도는 -90~90, 경도는 -180~180 범위의 숫자여야 합니다.'); return; } setError(''); setPosition({ lat, lng }); setLatitude(String(lat)); setLongitude(String(lng)); };
  const submit = (event: React.FormEvent) => { event.preventDefault(); applyPosition(Number(latitude), Number(longitude)); };
  return <main className="page check-in-test-page"><header className="simple-header"><p className="eyebrow">🧪 CHECK-IN TEST</p><h1>개발/테스트 전용</h1><p>실제 GPS를 사용하지 않고 가상 위치로 거리와 마커 상태를 확인합니다.</p></header><CheckInMap position={position} spots={spots} onMapClick={applyPosition} /><section className="check-in-test-panel"><h2>🧪 테스트 위치</h2><p>현재 위치: 테스트 위치</p><div className="test-location-coordinates"><span>위도 {position.lat.toFixed(6)}</span><span>경도 {position.lng.toFixed(6)}</span></div><form onSubmit={submit} className="test-location-form"><label>위도<input inputMode="decimal" value={latitude} onChange={(event) => setLatitude(event.target.value)} /></label><label>경도<input inputMode="decimal" value={longitude} onChange={(event) => setLongitude(event.target.value)} /></label><button type="submit" className="primary-button">위치 적용</button></form>{error && <p className="auth-error" role="alert">{error}</p>}</section><section className="check-in-test-results"><h2>관광지 거리와 상태</h2>{spotsQuery.isPending && <p>관광지를 불러오는 중입니다.</p>}{spotsQuery.isError && <p className="auth-error">관광지를 불러오지 못했습니다.</p>}{spots.map((spot) => { const distance = calculateDistanceMeters(position.lat, position.lng, spot.location.lat, spot.location.lng); const available = spot.checkInEnabled === true && spot.checkInCompleted !== true && spot.reviewStatus !== 'PENDING' && distance <= (spot.checkInRadiusM ?? CHECK_IN_RADIUS_METERS); return <article className="test-spot-row" key={spot.id}><div><strong>{spot.title}</strong><small>{formatDistance(distance)}</small></div><span className={available ? 'test-spot-status test-spot-status--available' : 'test-spot-status'}>{available ? '🟢 인증 가능' : '🔒 인증 불가'}</span></article>; })}</section></main>;
}
