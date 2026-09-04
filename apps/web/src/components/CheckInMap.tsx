import { LocateFixed } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { webEnv } from '../config/env';
import type { Spot } from '../types/spot';
import { calculateDistanceMeters, CHECK_IN_RADIUS_METERS } from '../features/check-in/distance';

declare global { interface Window { kakao?: any; } }
interface Coordinates { lat: number; lng: number; accuracy?: number | null; }
interface Props { position: Coordinates | null; spots?: Spot[]; selectedSpot?: Spot | null; onSelect?: (spot: Spot) => void; onMapClick?: (lat: number, lng: number) => void; }
type MarkerStatus = 'available' | 'completed' | 'unavailable';

export function getSpotCoordinates(spot: Spot) {
  const raw = spot as Spot & { lat?: number | string; lng?: number | string; mapy?: number | string; mapx?: number | string };
  const lat = Number(raw.location?.lat ?? raw.lat ?? raw.mapy);
  const lng = Number(raw.location?.lng ?? raw.lng ?? raw.mapx);
  return Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null;
}

export function getSpotMarkerStatus(spot: Spot, distance: number, radius = CHECK_IN_RADIUS_METERS): MarkerStatus {
  if (spot.checkInCompleted === true) return 'completed';
  const enabled = spot.checkInEnabled !== false;
  if (enabled && spot.reviewStatus !== 'PENDING' && distance <= radius) return 'available';
  return 'unavailable';
}

export function CheckInMap({ position, spots = [], selectedSpot, onSelect, onMapClick }: Props) {
  const mapElement = useRef<HTMLDivElement>(null); const mapRef = useRef<any>(null); const userOverlayRef = useRef<any>(null); const circleRef = useRef<any>(null); const spotOverlaysRef = useRef<any[]>([]); const hasCenteredOnUser = useRef(false);
  const [state, setState] = useState<'loading' | 'ready' | 'fallback' | 'error'>(webEnv.kakaoMapAppKey ? 'loading' : 'fallback');
  useEffect(() => { if (!webEnv.kakaoMapAppKey || !mapElement.current) return; const existing = document.getElementById('kakao-maps-sdk') as HTMLScriptElement | null; const script = existing ?? document.createElement('script'); script.id = 'kakao-maps-sdk'; script.async = true; script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${encodeURIComponent(webEnv.kakaoMapAppKey)}&autoload=false`; if (!existing) document.head.appendChild(script); const initialize = () => { if (!window.kakao || !mapElement.current) { setState('error'); return; } window.kakao.maps.load(() => { if (!window.kakao || !mapElement.current) return; mapRef.current = new window.kakao.maps.Map(mapElement.current, { center: new window.kakao.maps.LatLng(37.58, 126.98), level: 3, draggable: false, zoomable: true }); setState('ready'); }); }; script.addEventListener('load', initialize, { once: true }); if (window.kakao) initialize(); return () => script.removeEventListener('load', initialize); }, []);
  useEffect(() => { if (state !== 'ready' || !position || !window.kakao || !mapRef.current) return; const point = new window.kakao.maps.LatLng(position.lat, position.lng); mapRef.current.setCenter(point); hasCenteredOnUser.current = true; const content = document.createElement('div'); content.className = 'user-location-dot'; content.setAttribute('aria-label', '현재 사용자 위치'); if (userOverlayRef.current) { userOverlayRef.current.setPosition(point); } else userOverlayRef.current = new window.kakao.maps.CustomOverlay({ map: mapRef.current, position: point, content, yAnchor: .5 }); if (position.accuracy && Number.isFinite(position.accuracy)) { if (circleRef.current) { circleRef.current.setPosition(point); circleRef.current.setRadius(position.accuracy); circleRef.current.setMap(mapRef.current); } else circleRef.current = new window.kakao.maps.Circle({ map: mapRef.current, center: point, radius: position.accuracy, strokeWeight: 1, strokeColor: '#2563EB', strokeOpacity: .6, fillColor: '#2563EB', fillOpacity: .12 }); } else if (circleRef.current) circleRef.current.setMap(null); }, [position, state]);
  useEffect(() => { if (state !== 'ready' || !window.kakao || !mapRef.current) return; spotOverlaysRef.current.forEach((overlay) => overlay.setMap(null)); spotOverlaysRef.current = spots.map((spot) => { const coordinates = getSpotCoordinates(spot); if (spot.geometryType === 'EXCLUDE' || !coordinates) return null; const distance = position && coordinates ? calculateDistanceMeters(position.lat, position.lng, coordinates.lat, coordinates.lng) : Infinity; const status = getSpotMarkerStatus(spot, distance, spot.checkInRadiusM ?? CHECK_IN_RADIUS_METERS); console.log(`[check-in] spot=${spot.id} distanceM=${Number.isFinite(distance) ? Math.round(distance) : 'unknown'} status=${status}`); const content = document.createElement('button'); content.type = 'button'; content.className = `tourism-badge tourism-badge--${status}`; content.textContent = `${status === 'completed' ? '✅' : status === 'available' ? '🟢' : '🔒'} ${spot.title}`; content.addEventListener('click', () => onSelect?.(spot)); const overlay = new window.kakao.maps.CustomOverlay({ map: mapRef.current, position: new window.kakao.maps.LatLng(coordinates.lat, coordinates.lng), content, yAnchor: 1 }); overlay.setContent(content); return overlay; }).filter(Boolean); return () => spotOverlaysRef.current.forEach((overlay) => overlay?.setMap(null)); }, [spots, position, state, onSelect]);
  useEffect(() => { if (state === 'ready' && selectedSpot && window.kakao && mapRef.current) mapRef.current.panTo(new window.kakao.maps.LatLng(selectedSpot.location.lat, selectedSpot.location.lng)); }, [selectedSpot, state]);
  useEffect(() => { if (state !== 'ready' || !onMapClick || !window.kakao || !mapRef.current) return; const handler = (event: any) => onMapClick(event.latLng.getLat(), event.latLng.getLng()); window.kakao.maps.event.addListener(mapRef.current, 'click', handler); return () => window.kakao?.maps?.event?.removeListener(mapRef.current, 'click', handler); }, [state, onMapClick]);
  useEffect(() => { if (state === 'ready') mapRef.current?.setZoomable(true); }, [state]);
  useEffect(() => { if (state !== 'ready' || !position || !window.kakao || !mapRef.current) return; const userPoint = new window.kakao.maps.LatLng(position.lat, position.lng); const handleZoomChanged = () => mapRef.current?.setCenter(userPoint); window.kakao.maps.event.addListener(mapRef.current, 'zoom_changed', handleZoomChanged); return () => window.kakao?.maps?.event?.removeListener(mapRef.current, 'zoom_changed', handleZoomChanged); }, [position, state]);
  const moveToCurrentLocation = () => { if (position && mapRef.current && window.kakao) { mapRef.current.setCenter(new window.kakao.maps.LatLng(position.lat, position.lng)); hasCenteredOnUser.current = true; } };
  const changeZoom = (delta: number) => { if (!mapRef.current || !window.kakao) return; mapRef.current.setLevel(Math.max(1, Math.min(14, mapRef.current.getLevel() + delta)), { animate: true }); if (position) mapRef.current.setCenter(new window.kakao.maps.LatLng(position.lat, position.lng)); };
  return <section className="check-in-map" aria-label="현재 위치 지도"><div ref={mapElement} className="check-in-map__canvas" />{state !== 'ready' && <div className="check-in-map__fallback">{state === 'loading' ? '지도를 불러오는 중입니다.' : state === 'error' ? '지도 키를 확인해주세요.' : 'Kakao 지도 키 설정 후 현재 위치 지도가 표시됩니다.'}</div>}<div className="check-in-map__zoom-controls"><button type="button" aria-label="지도 확대" onClick={() => changeZoom(-1)}>+</button><button type="button" aria-label="지도 축소" onClick={() => changeZoom(1)}>−</button><button type="button" className="check-in-map__locate" aria-label="내 위치로 이동" onClick={moveToCurrentLocation}><LocateFixed size={19} /></button></div></section>;
}
