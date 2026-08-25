import { useEffect, useRef, useState } from 'react';
import { webEnv } from '../config/env';

declare global { interface Window { kakao?: any; } }
interface Coordinates { lat: number; lng: number; }

export function CheckInMap({ position }: { position: Coordinates | null }) {
  const mapElement = useRef<HTMLDivElement>(null); const mapRef = useRef<any>(null); const markerRef = useRef<any>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'fallback' | 'error'>(webEnv.kakaoMapAppKey ? 'loading' : 'fallback');
  useEffect(() => { if (!webEnv.kakaoMapAppKey || !mapElement.current) return; const existing = document.getElementById('kakao-maps-sdk') as HTMLScriptElement | null; const script = existing ?? document.createElement('script'); script.id = 'kakao-maps-sdk'; script.async = true; script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${encodeURIComponent(webEnv.kakaoMapAppKey)}&autoload=false`; if (!existing) document.head.appendChild(script); const initialize = () => { if (!window.kakao || !mapElement.current) { setState('error'); return; } window.kakao.maps.load(() => { if (!window.kakao || !mapElement.current) return; mapRef.current = new window.kakao.maps.Map(mapElement.current, { center: new window.kakao.maps.LatLng(37.58, 126.98), level: 5 }); setState('ready'); }); }; script.addEventListener('load', initialize, { once: true }); if (window.kakao) initialize(); return () => script.removeEventListener('load', initialize); }, []);
  useEffect(() => { if (state !== 'ready' || !position || !window.kakao || !mapRef.current) return; const point = new window.kakao.maps.LatLng(position.lat, position.lng); mapRef.current.setCenter(point); markerRef.current?.setMap(null); markerRef.current = new window.kakao.maps.Marker({ map: mapRef.current, position: point, title: '현재 위치' }); }, [position, state]);
  return <section className="check-in-map" aria-label="현재 위치 지도"><div ref={mapElement} className="check-in-map__canvas" />{state !== 'ready' && <div className="check-in-map__fallback">{state === 'loading' ? '지도를 불러오는 중입니다.' : state === 'error' ? '지도 키를 확인해주세요.' : 'Kakao 지도 키 설정 후 현재 위치 지도가 표시됩니다.'}</div>}</section>;
}
