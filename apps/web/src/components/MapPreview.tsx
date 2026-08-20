import { Flag, Navigation } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { webEnv } from '../config/env';
import type { Spot } from '../types/spot';

declare global { interface Window { kakao?: any; } }

interface MapPreviewProps {
  spots: Spot[];
  onSelect?: (spot: Spot) => void;
  onViewportChange?: (viewport: { minLat: number; minLng: number; maxLat: number; maxLng: number }) => void;
}

export function MapPreview({ spots, onSelect, onViewportChange }: MapPreviewProps) {
  const mapElement = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const [mapState, setMapState] = useState<'fallback' | 'loading' | 'ready' | 'error'>(webEnv.kakaoMapAppKey ? 'loading' : 'fallback');

  useEffect(() => {
    if (!webEnv.kakaoMapAppKey || !mapElement.current) return;
    const scriptId = 'kakao-maps-sdk';
    const existing = document.getElementById(scriptId) as HTMLScriptElement | null;
    const script = existing ?? document.createElement('script');
    script.id = scriptId;
    script.async = true;
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${encodeURIComponent(webEnv.kakaoMapAppKey)}&autoload=false`;
    if (!existing) document.head.appendChild(script);
    const initialize = () => {
      if (!window.kakao || !mapElement.current) { setMapState('error'); return; }
      window.kakao.maps.load(() => {
        if (!window.kakao || !mapElement.current) return;
        const map = new window.kakao.maps.Map(mapElement.current, { center: new window.kakao.maps.LatLng(36.35, 127.9), level: 13 });
        mapRef.current = map;
        setMapState('ready');
        const emitViewport = () => {
          const bounds = map.getBounds(); const sw = bounds.getSouthWest(); const ne = bounds.getNorthEast();
          onViewportChange?.({ minLat: sw.getLat(), minLng: sw.getLng(), maxLat: ne.getLat(), maxLng: ne.getLng() });
        };
        window.kakao.maps.event.addListener(map, 'idle', emitViewport);
        emitViewport();
      });
    };
    script.addEventListener('load', initialize, { once: true });
    if (window.kakao) initialize();
    return () => script.removeEventListener('load', initialize);
  }, [onViewportChange]);

  useEffect(() => {
    if (mapState !== 'ready' || !window.kakao || !mapRef.current) return;
    markersRef.current.forEach((marker) => marker.setMap(null));
    markersRef.current = spots.map((spot) => new window.kakao.maps.Marker({ map: mapRef.current, position: new window.kakao.maps.LatLng(spot.location.lat, spot.location.lng), title: spot.title }));
    return () => markersRef.current.forEach((marker) => marker.setMap(null));
  }, [mapState, spots]);

  const moveToCurrentLocation = () => navigator.geolocation?.getCurrentPosition(({ coords }) => {
    if (mapRef.current && window.kakao) mapRef.current.setCenter(new window.kakao.maps.LatLng(coords.latitude, coords.longitude));
  });

  if (mapState === 'ready') return <section className="map-preview map-preview--kakao" aria-label="전국 장소 지도"><div ref={mapElement} className="map-canvas" /><button type="button" className="map-preview__locate" aria-label="현재 위치로 이동" onClick={moveToCurrentLocation}><Navigation size={19} /></button></section>;
  return <section ref={mapElement} className="map-preview" aria-label="전국 장소 지도"><div className="map-preview__grid" aria-hidden="true" /><div className="map-preview__label"><span>전국 탐색</span><small>{mapState === 'loading' ? '지도를 불러오는 중' : mapState === 'error' ? '지도 키를 확인해주세요' : '개발용 지도 미리보기'}</small></div>{spots.slice(0, 5).map((spot, index) => <button type="button" className="map-pin" style={{ left: `${18 + index * 15}%`, top: `${30 + (index % 3) * 18}%` }} key={spot.id} aria-label={`${spot.title}, ${spot.grade} 등급`} title={spot.title} onClick={() => onSelect?.(spot)}><FlagShape grade={spot.grade} /></button>)}<button type="button" className="map-preview__locate" aria-label="현재 위치로 이동" onClick={moveToCurrentLocation}><Navigation size={19} /></button></section>;
}

function FlagShape({ grade }: { grade: Spot['grade'] }) { return <span className="flag-shape" data-grade={grade}><Flag size={17} /></span>; }
