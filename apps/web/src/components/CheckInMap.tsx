import { LocateFixed } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { webEnv } from '../config/env';
import type { Spot } from '../types/spot';
import { calculateDistanceMeters, CHECK_IN_RADIUS_METERS } from '../features/check-in/distance';

declare global { interface Window { kakao?: any; } }
interface Coordinates { lat: number; lng: number; accuracy?: number | null; }

export function CheckInMap({ position, spots = [], selectedSpot, onSelect }: { position: Coordinates | null; spots?: Spot[]; selectedSpot?: Spot | null; onSelect?: (spot: Spot) => void }) {
  const mapElement = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const circleRef = useRef<any>(null);
  const spotMarkersRef = useRef<any[]>([]);
  const hasCenteredOnUser = useRef(false);
  const [state, setState] = useState<'loading' | 'ready' | 'fallback' | 'error'>(webEnv.kakaoMapAppKey ? 'loading' : 'fallback');

  useEffect(() => {
    if (!webEnv.kakaoMapAppKey || !mapElement.current) return;
    const existing = document.getElementById('kakao-maps-sdk') as HTMLScriptElement | null;
    const script = existing ?? document.createElement('script');
    script.id = 'kakao-maps-sdk'; script.async = true;
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${encodeURIComponent(webEnv.kakaoMapAppKey)}&autoload=false`;
    if (!existing) document.head.appendChild(script);
    const initialize = () => { if (!window.kakao || !mapElement.current) { setState('error'); return; } window.kakao.maps.load(() => { if (!window.kakao || !mapElement.current) return; mapRef.current = new window.kakao.maps.Map(mapElement.current, { center: new window.kakao.maps.LatLng(37.58, 126.98), level: 5 }); setState('ready'); }); };
    script.addEventListener('load', initialize, { once: true }); if (window.kakao) initialize();
    return () => script.removeEventListener('load', initialize);
  }, []);

  useEffect(() => {
    if (state !== 'ready' || !position || !window.kakao || !mapRef.current) return;
    const point = new window.kakao.maps.LatLng(position.lat, position.lng);
    if (!hasCenteredOnUser.current) { mapRef.current.setCenter(point); hasCenteredOnUser.current = true; }
    if (markerRef.current) markerRef.current.setPosition(point);
    else markerRef.current = new window.kakao.maps.Marker({ map: mapRef.current, position: point, title: '현재 위치' });
    if (circleRef.current) { circleRef.current.setPosition(point); circleRef.current.setRadius(position.accuracy && Number.isFinite(position.accuracy) ? position.accuracy : 0); circleRef.current.setMap(position.accuracy && Number.isFinite(position.accuracy) ? mapRef.current : null); }
    else if (position.accuracy && Number.isFinite(position.accuracy)) circleRef.current = new window.kakao.maps.Circle({ map: mapRef.current, center: point, radius: position.accuracy, strokeWeight: 1, strokeColor: '#2b9a6f', strokeOpacity: .7, fillColor: '#2b9a6f', fillOpacity: .12 });
  }, [position, state]);

  useEffect(() => { if (state !== 'ready' || !window.kakao || !mapRef.current) return; spotMarkersRef.current.forEach((marker) => marker.setMap(null)); spotMarkersRef.current = spots.filter((spot) => spot.geometryType !== 'EXCLUDE' && Number.isFinite(spot.location.lat) && Number.isFinite(spot.location.lng)).map((spot) => { const distance = position ? calculateDistanceMeters(position.lat, position.lng, spot.location.lat, spot.location.lng) : Infinity; const available = spot.checkInEnabled === true && spot.checkInCompleted !== true && spot.reviewStatus !== 'PENDING' && distance <= (spot.checkInRadiusM ?? CHECK_IN_RADIUS_METERS); const completed = spot.checkInCompleted === true; const marker = new window.kakao.maps.Marker({ map: mapRef.current, position: new window.kakao.maps.LatLng(spot.location.lat, spot.location.lng), title: `${spot.title} ${completed ? '인증 완료' : available ? '현장 인증 가능' : '인증 불가'}` }); if (available) marker.setZIndex(2); if (completed) marker.setZIndex(3); window.kakao.maps.event.addListener(marker, 'click', () => onSelect?.(spot)); return marker; }); return () => spotMarkersRef.current.forEach((marker) => marker.setMap(null)); }, [spots, position, state, onSelect]);
  useEffect(() => { if (state === 'ready' && selectedSpot && window.kakao && mapRef.current) mapRef.current.panTo(new window.kakao.maps.LatLng(selectedSpot.location.lat, selectedSpot.location.lng)); }, [selectedSpot, state]);

  const moveToCurrentLocation = () => {
    if (position && mapRef.current && window.kakao) { mapRef.current.setCenter(new window.kakao.maps.LatLng(position.lat, position.lng)); hasCenteredOnUser.current = true; return; }
    navigator.geolocation?.getCurrentPosition(() => undefined, () => undefined, { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 });
  };
  return <section className="check-in-map" aria-label="현재 위치 지도"><div ref={mapElement} className="check-in-map__canvas" />{state !== 'ready' && <div className="check-in-map__fallback">{state === 'loading' ? '지도를 불러오는 중입니다.' : state === 'error' ? '지도 키를 확인해주세요.' : 'Kakao 지도 키 설정 후 현재 위치 지도가 표시됩니다.'}</div>}<button type="button" className="check-in-map__locate" aria-label="내 위치로 이동" onClick={moveToCurrentLocation}><LocateFixed size={19} /></button></section>;
}
