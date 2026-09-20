import { Navigation } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { webEnv } from '../config/env';
import type { Spot } from '../types/spot';
import { calculateDistanceMeters, CHECK_IN_RADIUS_METERS } from '../features/check-in/distance';

declare global {
  interface Window {
    kakao?: any;
    __handleSpotClick?: (spotId: string) => void;
  }
}

interface Coordinates {
  lat: number;
  lng: number;
  accuracy?: number | null;
}

interface Props {
  position: Coordinates | null;
  spots?: Spot[];
  selectedSpot?: Spot | null;
  onSelect?: (spot: Spot) => void;
  onMapClick?: (lat: number, lng: number) => void;
  onLocate?: () => void;
}

export type MarkerStatus = 'LOCKED' | 'AVAILABLE' | 'PENDING' | 'COMPLETED';

export function getSpotCoordinates(spot: Spot) {
  const raw = spot as Spot & { lat?: number | string; lng?: number | string; mapy?: number | string; mapx?: number | string };
  const lat = Number(raw.location?.lat ?? raw.lat ?? raw.mapy);
  const lng = Number(raw.location?.lng ?? raw.lng ?? raw.mapx);
  return Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null;
}

export function getSpotMarkerStatus(spot: Spot, distance: number, _radius = CHECK_IN_RADIUS_METERS): MarkerStatus {
  if (spot.geometryType === 'AREA' || spot.geometryType === 'EXCLUDE') return 'LOCKED';
  if (spot.checkInCompleted === true) return 'COMPLETED';
  if (spot.reviewStatus === 'PENDING' || spot.reviewStatus === 'REVIEWING') return 'PENDING';
  return spot.checkInEnabled !== false && distance <= CHECK_IN_RADIUS_METERS ? 'AVAILABLE' : 'LOCKED';
}

export function getCheckInRadius(_spot?: Pick<Spot, 'checkInRadiusM'> | null) {
  return CHECK_IN_RADIUS_METERS;
}

export function canSelectSpot(spot: Spot, position: Coordinates | null) {
  const coordinates = getSpotCoordinates(spot);
  const distance = coordinates && position ? calculateDistanceMeters(position.lat, position.lng, coordinates.lat, coordinates.lng) : Infinity;
  return getSpotMarkerStatus(spot, distance, getCheckInRadius(spot)) === 'AVAILABLE';
}

export function getSpotClickResult(spot: Spot, position: Coordinates | null): 'SELECT' | 'OUT_OF_RANGE' {
  return canSelectSpot(spot, position) ? 'SELECT' : 'OUT_OF_RANGE';
}

export function getCheckInCircleOptions(center: unknown, radius: number) {
  return { center, radius, strokeWeight: 2, strokeColor: '#2563EB', strokeOpacity: 0.7, fillColor: '#60A5FA', fillOpacity: 0.15 };
}

export function CheckInMap({ position, spots = [], selectedSpot, onSelect, onMapClick, onLocate }: Props) {
  const mapElement = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const userOverlayRef = useRef<any>(null);
  const circleRef = useRef<any>(null);
  const overlaysRef = useRef<Map<string, any>>(new Map());

  const spotsRef = useRef<Spot[]>(spots);
  const positionRef = useRef(position);
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;
  spotsRef.current = spots;
  positionRef.current = position;

  const [state, setState] = useState<'loading' | 'ready' | 'fallback' | 'error'>(
    webEnv.kakaoMapAppKey ? 'loading' : 'fallback'
  );
  const [rangeNotice, setRangeNotice] = useState('');

  // 1. 마커 클릭 이벤트 핸들러 등록
  useEffect(() => {
    window.__handleSpotClick = (spotId) => {
      const targetSpot = spotsRef.current.find(
        (spot) =>
          String(spot.id) === String(spotId) ||
          String((spot as any).spotId) === String(spotId) ||
          String((spot as any).contentid) === String(spotId)
      );
      const targetPosition = positionRef.current;
      if (targetSpot && getSpotClickResult(targetSpot, targetPosition) === 'SELECT') {
        setRangeNotice('');
        onSelectRef.current?.(targetSpot);
      } else {
        setRangeNotice('인증 반경 안으로 이동해주세요');
        if (targetSpot) {
          onSelectRef.current?.(targetSpot);
        }
      }
    };
    return () => {
      delete window.__handleSpotClick;
    };
  }, []);

  // 2. 카카오 지도 SDK 동적 로드 및 초기화
  useEffect(() => {
    if (!webEnv.kakaoMapAppKey || !mapElement.current) return;

    const existing = document.getElementById('kakao-maps-sdk') as HTMLScriptElement | null;
    const script = existing ?? document.createElement('script');
    script.id = 'kakao-maps-sdk';
    script.async = true;
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${encodeURIComponent(webEnv.kakaoMapAppKey)}&autoload=false`;

    const initialize = () => {
      if (!window.kakao || !mapElement.current) {
        setState('error');
        return;
      }
      window.kakao.maps.load(() => {
        if (!window.kakao || !mapElement.current) return;
        const isFarAway = position && calculateDistanceMeters(position.lat, position.lng, 37.58, 126.98) > 3000;
        const initialCenter = position && !isFarAway
          ? new window.kakao.maps.LatLng(position.lat, position.lng)
          : selectedSpot?.location
          ? new window.kakao.maps.LatLng(selectedSpot.location.lat, selectedSpot.location.lng)
          : new window.kakao.maps.LatLng(37.58, 126.98);

        mapRef.current = new window.kakao.maps.Map(mapElement.current, {
          center: initialCenter,
          level: 4,
        });
        setState('ready');
      });
    };

    if (!existing) {
      script.addEventListener('load', initialize, { once: true });
      script.addEventListener('error', () => setState('error'), { once: true });
      document.head.appendChild(script);
    } else if (window.kakao?.maps?.load) {
      initialize();
    } else {
      script.addEventListener('load', initialize, { once: true });
      script.addEventListener('error', () => setState('error'), { once: true });
    }
  }, []);

  // 3. 사용자 위치 변경 시 지도 중심 이동 및 인증 반경 원 표출
  useEffect(() => {
    if (state !== 'ready' || !position || !window.kakao || !mapRef.current) return;

    const point = new window.kakao.maps.LatLng(position.lat, position.lng);
    const radius = CHECK_IN_RADIUS_METERS;
    mapRef.current.setCenter(point);

    if (userOverlayRef.current) {
      userOverlayRef.current.setPosition(point);
    } else {
      const dot = document.createElement('div');
      dot.className = 'user-location-dot';
      userOverlayRef.current = new window.kakao.maps.CustomOverlay({
        map: mapRef.current,
        position: point,
        content: dot,
        yAnchor: 0.5,
      });
    }

    circleRef.current?.setMap(null);
    circleRef.current = new window.kakao.maps.Circle({
      map: mapRef.current,
      ...getCheckInCircleOptions(point, radius),
    });

    return () => {
      circleRef.current?.setMap(null);
      circleRef.current = null;
    };
  }, [position, state]);

  // 4. 주변 관광지 뱃지 오버레이 갱신
  useEffect(() => {
    if (state !== 'ready' || !window.kakao || !mapRef.current) return;
    const activeIds = new Set<string>();

    spots.forEach((spot) => {
      const coordinates = getSpotCoordinates(spot);
      if (spot.geometryType === 'EXCLUDE' || !coordinates) return;
      const key = String(spot.id);
      activeIds.add(key);

      const distance = position
        ? calculateDistanceMeters(position.lat, position.lng, coordinates.lat, coordinates.lng)
        : Infinity;
      const status = getSpotMarkerStatus(spot, distance, spot.checkInRadiusM ?? CHECK_IN_RADIUS_METERS);
      const isSelected = selectedSpot?.id === spot.id;
      const badgeText = `${status === 'COMPLETED' ? '✅' : status === 'AVAILABLE' ? '🟢' : status === 'PENDING' ? '⏳' : '🔒'} ${spot.title}${status === 'PENDING' ? ' (심사중...)' : ''}`;
      const content = `<div class="tourism-badge tourism-badge--${status.toLowerCase()} ${isSelected ? 'tourism-badge--selected' : ''}" onclick="event.stopPropagation(); window.__handleSpotClick('${spot.id}');" style="cursor:pointer;pointer-events:auto;position:relative;z-index:9999;">${badgeText}</div>`;

      const point = new window.kakao.maps.LatLng(coordinates.lat, coordinates.lng);
      const existing = overlaysRef.current.get(key);
      if (existing) {
        existing.setPosition(point);
        existing.setContent(content);
      } else {
        overlaysRef.current.set(
          key,
          new window.kakao.maps.CustomOverlay({
            map: mapRef.current,
            position: point,
            content,
            yAnchor: 1,
            clickable: true,
          })
        );
      }
    });

    overlaysRef.current.forEach((overlay, key) => {
      if (!activeIds.has(key)) {
        overlay.setMap(null);
        overlaysRef.current.delete(key);
      }
    });
  }, [spots, position, selectedSpot, state]);

  // 5. 선택된 장소 변경 시 지도 중심 이동
  useEffect(() => {
    if (state !== 'ready' || !mapRef.current || !selectedSpot?.location || !window.kakao) return;
    mapRef.current.panTo(new window.kakao.maps.LatLng(selectedSpot.location.lat, selectedSpot.location.lng));
  }, [selectedSpot?.id, state]);

  // 6. 테스트 모드 지도 클릭 이벤트 연동 (좌표 순간이동)
  useEffect(() => {
    if (state !== 'ready' || !onMapClick || !window.kakao || !mapRef.current) return;
    const handler = (event: any) => onMapClick(event.latLng.getLat(), event.latLng.getLng());
    window.kakao.maps.event.addListener(mapRef.current, 'click', handler);
    return () => window.kakao?.maps?.event?.removeListener(mapRef.current, 'click', handler);
  }, [state, onMapClick]);

  const moveToCurrentLocation = () => {
    if (position && mapRef.current && window.kakao) {
      mapRef.current.setCenter(new window.kakao.maps.LatLng(position.lat, position.lng));
    }
    onLocate?.();
  };

  return (
    <section className="check-in-map" aria-label="현재 위치 지도">
      <div ref={mapElement} className="check-in-map__canvas" />
      {state !== 'ready' && (
        <div className="check-in-map__fallback">
          {state === 'loading'
            ? '지도를 불러오는 중입니다.'
            : state === 'error'
            ? '카카오 지도 키를 확인해주세요.'
            : 'Kakao 지도 키 설정 후 현재 위치 지도가 표시됩니다.'}
        </div>
      )}
      {rangeNotice && (
        <div className="check-in-map__range-notice" role="status" aria-live="polite">
          {rangeNotice}
        </div>
      )}
      <button
        type="button"
        className="map-preview__locate"
        aria-label="현재 위치로 이동"
        onClick={moveToCurrentLocation}
      >
        <Navigation size={19} />
      </button>
    </section>
  );
}
