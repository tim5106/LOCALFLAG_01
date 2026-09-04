import { Navigation } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { webEnv } from '../config/env';
import type { Spot } from '../types/spot';

declare global { interface Window { kakao?: any; } }
interface MapPreviewProps { spots: Spot[]; selectedSpot?: Spot | null; onSelect?: (spot: Spot) => void; onViewportChange?: (viewport: { minLat: number; minLng: number; maxLat: number; maxLng: number }) => void; }

export function MapPreview({ spots, selectedSpot, onSelect, onViewportChange }: MapPreviewProps) {
  const mapElement = useRef<HTMLDivElement>(null); const mapRef = useRef<any>(null); const markersRef = useRef<any[]>([]);
  const [mapState, setMapState] = useState<'fallback' | 'loading' | 'ready' | 'error'>(webEnv.kakaoMapAppKey ? 'loading' : 'fallback');
  useEffect(() => {
    if (!webEnv.kakaoMapAppKey || !mapElement.current) return;
    const existing = document.getElementById('kakao-maps-sdk') as HTMLScriptElement | null;
    const script = existing ?? document.createElement('script'); script.id = 'kakao-maps-sdk'; script.async = true; script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${encodeURIComponent(webEnv.kakaoMapAppKey)}&autoload=false`;
    if (!existing) document.head.appendChild(script);
    const initialize = () => { if (!window.kakao || !mapElement.current) { setMapState('error'); return; } window.kakao.maps.load(() => { if (!window.kakao || !mapElement.current) return; const map = new window.kakao.maps.Map(mapElement.current, { center: new window.kakao.maps.LatLng(37.58, 126.98), level: 5 }); mapRef.current = map; setMapState('ready'); const emitViewport = () => { const bounds = map.getBounds(); const sw = bounds.getSouthWest(); const ne = bounds.getNorthEast(); onViewportChange?.({ minLat: sw.getLat(), minLng: sw.getLng(), maxLat: ne.getLat(), maxLng: ne.getLng() }); }; window.kakao.maps.event.addListener(map, 'idle', emitViewport); emitViewport(); }); };
    script.addEventListener('load', initialize, { once: true }); if (window.kakao) initialize(); return () => script.removeEventListener('load', initialize);
  }, [onViewportChange]);
  useEffect(() => { if (mapState !== 'ready' || !window.kakao || !mapRef.current) return; markersRef.current.forEach((marker) => marker.setMap(null)); markersRef.current = spots.filter((spot) => Number.isFinite(spot.location.lat) && Number.isFinite(spot.location.lng)).map((spot) => { const state = spot.checkInCompleted ? 'completed' : spot.checkInEnabled ? 'check-in' : spot.reviewStatus ? 'pending' : 'default'; const content = document.createElement('button'); content.type = 'button'; content.className = `kakao-spot-marker kakao-spot-marker--${state}${selectedSpot?.id === spot.id ? ' kakao-spot-marker--selected' : ''}`; content.setAttribute('aria-label', spot.title); content.innerHTML = '<span></span>'; content.addEventListener('click', () => onSelect?.(spot)); return new window.kakao.maps.CustomOverlay({ map: mapRef.current, position: new window.kakao.maps.LatLng(spot.location.lat, spot.location.lng), content, yAnchor: 1 }); }); return () => markersRef.current.forEach((marker) => marker.setMap(null)); }, [mapState, spots, selectedSpot, onSelect]);
  const moveToCurrentLocation = () => navigator.geolocation?.getCurrentPosition(({ coords }) => { if (mapRef.current && window.kakao) mapRef.current.setCenter(new window.kakao.maps.LatLng(coords.latitude, coords.longitude)); });
  if (mapState === 'ready') return <section className="map-preview map-preview--kakao" aria-label="종로구 관광지 지도"><div ref={mapElement} className="map-canvas" /><button type="button" className="map-preview__locate" aria-label="현재 위치로 이동" onClick={moveToCurrentLocation}><Navigation size={19} /></button></section>;
  return <section ref={mapElement} className="map-preview map-preview--fallback" aria-label="종로구 관광지 지도"><div className="map-preview__label"><span>종로구 관광지 지도</span><small>{mapState === 'loading' ? '지도를 불러오는 중' : mapState === 'error' ? '지도 키를 확인해주세요' : 'Kakao 키 설정 후 실제 마커 표시'}</small></div><div className="map-preview__empty">{spots.length ? `${spots.length}개 장소를 불러왔습니다.` : '표시할 장소가 없습니다.'}</div><button type="button" className="map-preview__locate" aria-label="현재 위치로 이동" onClick={moveToCurrentLocation}><Navigation size={19} /></button></section>;
}
