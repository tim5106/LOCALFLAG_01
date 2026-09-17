import { Navigation } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import * as maptilersdk from '@maptiler/sdk';
import '@maptiler/sdk/dist/maptiler-sdk.css';
import { webEnv } from '../config/env';
import type { Spot } from '../types/spot';
import { calculateDistanceMeters, CHECK_IN_RADIUS_METERS } from '../features/check-in/distance';
import { createGeoJsonCircle } from '../lib/maptiler-circle';
import koreaInvertedMask from '../assets/korea-inverted-mask.json';

const KOREA_BOUNDS: [[number, number], [number, number]] = [
  [123.0, 32.5],
  [133.0, 39.5],
];

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

const CHECKIN_CIRCLE_SOURCE = 'checkin-circle-source';
const CHECKIN_CIRCLE_FILL = 'checkin-circle-fill';
const CHECKIN_CIRCLE_LINE = 'checkin-circle-line';

export function CheckInMap({ position, spots = [], selectedSpot: _selectedSpot, onSelect, onMapClick, onLocate }: Props) {
  const mapElement = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maptilersdk.Map | null>(null);
  const userMarkerRef = useRef<maptilersdk.Marker | null>(null);
  const spotMarkersRef = useRef<Map<string, maptilersdk.Marker>>(new Map());

  const positionRef = useRef(position);
  const onSelectRef = useRef(onSelect);
  positionRef.current = position;
  onSelectRef.current = onSelect;

  const [state, setState] = useState<'loading' | 'ready' | 'fallback' | 'error'>(
    webEnv.maptilerApiKey ? 'loading' : 'fallback'
  );
  const [rangeNotice, setRangeNotice] = useState('');

  // Initialize Map
  useEffect(() => {
    if (!webEnv.maptilerApiKey || !mapElement.current) return;

    maptilersdk.config.apiKey = webEnv.maptilerApiKey;

    let map: maptilersdk.Map | null = null;
    try {
      const initialCenter: [number, number] = position ? [position.lng, position.lat] : [126.98, 37.58];
      map = new maptilersdk.Map({
        container: mapElement.current,
        style: webEnv.maptilerStyleId || maptilersdk.MapStyle.STREETS,
        center: initialCenter,
        zoom: 16,
        dragPan: false, // Locked drag for check-in experience
        scrollZoom: true,
        maxBounds: KOREA_BOUNDS,
        minZoom: 5.5,
      });
      mapRef.current = map;
    } catch (err) {
      console.error('[CheckInMap] Failed to construct MapTiler:', err);
      setState('error');
      return;
    }

    map.on('load', () => {
      // Apply South Korea Inverted Mask (Hide Ocean and foreign territories)
      if (!map.getSource('korea-inverted-mask')) {
        map.addSource('korea-inverted-mask', {
          type: 'geojson',
          data: koreaInvertedMask as any,
        });
        map.addLayer({
          id: 'korea-mask-fill',
          type: 'fill',
          source: 'korea-inverted-mask',
          paint: {
            'fill-color': '#F7F4EC',
            'fill-opacity': 1,
          },
        });
        map.addLayer({
          id: 'korea-mask-border',
          type: 'line',
          source: 'korea-inverted-mask',
          paint: {
            'line-color': 'rgba(24, 59, 51, 0.25)',
            'line-width': 1.5,
          },
        });
      }

      setState('ready');
      map?.resize();
      requestAnimationFrame(() => map?.resize());
    });

    map.on('error', (e) => {
      console.warn('[CheckInMap] MapTiler runtime notice:', e);
    });

    return () => {
      mapRef.current = null;
      map?.remove();
    };
  }, []);

  // Map Click handler
  useEffect(() => {
    const map = mapRef.current;
    if (state !== 'ready' || !map || !onMapClick) return;

    const clickHandler = (e: maptilersdk.MapMouseEvent) => {
      onMapClick(e.lngLat.lat, e.lngLat.lng);
    };

    map.on('click', clickHandler);
    return () => {
      map.off('click', clickHandler);
    };
  }, [state, onMapClick]);

  // Keep center fixed to user location when zooming
  useEffect(() => {
    const map = mapRef.current;
    if (state !== 'ready' || !map) return;

    const handleZoom = () => {
      const currentPos = positionRef.current;
      if (currentPos) {
        map.setCenter([currentPos.lng, currentPos.lat]);
      }
    };

    map.on('zoom', handleZoom);
    return () => {
      map.off('zoom', handleZoom);
    };
  }, [state]);

  // Update user position & circle
  useEffect(() => {
    const map = mapRef.current;
    if (state !== 'ready' || !position || !map) return;

    const userLngLat: [number, number] = [position.lng, position.lat];
    map.setCenter(userLngLat);

    if (userMarkerRef.current) {
      userMarkerRef.current.setLngLat(userLngLat);
    } else {
      const dot = document.createElement('div');
      dot.className = 'user-location-dot';
      userMarkerRef.current = new maptilersdk.Marker({
        element: dot,
        anchor: 'center',
      })
        .setLngLat(userLngLat)
        .addTo(map);
    }

    const circleGeoJson = createGeoJsonCircle(userLngLat, CHECK_IN_RADIUS_METERS);
    const existingSource = map.getSource(CHECKIN_CIRCLE_SOURCE) as maptilersdk.GeoJSONSource | undefined;

    if (existingSource) {
      existingSource.setData(circleGeoJson);
    } else if (map.isStyleLoaded()) {
      map.addSource(CHECKIN_CIRCLE_SOURCE, {
        type: 'geojson',
        data: circleGeoJson,
      });
      map.addLayer({
        id: CHECKIN_CIRCLE_FILL,
        type: 'fill',
        source: CHECKIN_CIRCLE_SOURCE,
        paint: {
          'fill-color': '#60A5FA',
          'fill-opacity': 0.15,
        },
      });
      map.addLayer({
        id: CHECKIN_CIRCLE_LINE,
        type: 'line',
        source: CHECKIN_CIRCLE_SOURCE,
        paint: {
          'line-color': '#2563EB',
          'line-width': 2,
          'line-opacity': 0.7,
        },
      });
    }

    return () => {
      if (map.getLayer(CHECKIN_CIRCLE_LINE)) map.removeLayer(CHECKIN_CIRCLE_LINE);
      if (map.getLayer(CHECKIN_CIRCLE_FILL)) map.removeLayer(CHECKIN_CIRCLE_FILL);
      if (map.getSource(CHECKIN_CIRCLE_SOURCE)) map.removeSource(CHECKIN_CIRCLE_SOURCE);
    };
  }, [position, state]);

  // Update Spot Markers
  useEffect(() => {
    const map = mapRef.current;
    if (state !== 'ready' || !map) return;

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
      const badgeText = `${status === 'COMPLETED' ? '✅' : status === 'AVAILABLE' ? '🟢' : status === 'PENDING' ? '⏳' : '🔒'} ${spot.title}${status === 'PENDING' ? ' (심사중...)' : ''}`;

      let marker = spotMarkersRef.current.get(key);

      if (!marker) {
        const badgeEl = document.createElement('div');
        badgeEl.className = `tourism-badge tourism-badge--${status.toLowerCase()}`;
        badgeEl.textContent = badgeText;
        badgeEl.style.cursor = 'pointer';
        badgeEl.style.pointerEvents = 'auto';

        badgeEl.addEventListener('click', (e) => {
          e.stopPropagation();
          const targetPosition = positionRef.current;
          if (getSpotClickResult(spot, targetPosition) === 'SELECT') {
            setRangeNotice('');
            onSelectRef.current?.(spot);
          } else {
            setRangeNotice('인증 반경 안으로 이동해주세요');
          }
        });

        marker = new maptilersdk.Marker({
          element: badgeEl,
          anchor: 'bottom',
        })
          .setLngLat([coordinates.lng, coordinates.lat])
          .addTo(map);

        spotMarkersRef.current.set(key, marker);
      } else {
        const badgeEl = marker.getElement();
        badgeEl.className = `tourism-badge tourism-badge--${status.toLowerCase()}`;
        badgeEl.textContent = badgeText;
        marker.setLngLat([coordinates.lng, coordinates.lat]);
      }
    });

    spotMarkersRef.current.forEach((marker, key) => {
      if (!activeIds.has(key)) {
        marker.remove();
        spotMarkersRef.current.delete(key);
      }
    });
  }, [spots, position, state]);

  const moveToCurrentLocation = () => {
    if (position && mapRef.current) {
      mapRef.current.flyTo({
        center: [position.lng, position.lat],
        zoom: 16,
      });
    }
  };

  return (
    <section className="check-in-map" aria-label="현재 위치 지도">
      <div ref={mapElement} className="check-in-map__canvas" />
      {state !== 'ready' && (
        <div className="check-in-map__fallback">
          {state === 'loading'
            ? '지도를 불러오는 중입니다.'
            : state === 'error'
            ? '지도 키를 확인해주세요.'
            : 'MapTiler 지도 키 설정 후 현재 위치 지도가 표시됩니다.'}
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
        onClick={() => {
          moveToCurrentLocation();
          onLocate?.();
        }}
      >
        <Navigation size={19} />
      </button>
    </section>
  );
}
