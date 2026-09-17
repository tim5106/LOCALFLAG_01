import { Navigation } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import * as maptilersdk from '@maptiler/sdk';
import '@maptiler/sdk/dist/maptiler-sdk.css';
import { getMapTilerStyleUrl, webEnv } from '../config/env';
import { groupSpotsByLocation } from '../lib/map-preview-spots';
import { getMapSpotState, getMapSpotStateLabel, getNearbySpotIds } from '../lib/map-spot-state';
import { createGeoJsonCircle } from '../lib/maptiler-circle';
import type { Spot } from '../types/spot';
import { CHECK_IN_RADIUS_METERS } from '../features/check-in/distance';
import { getFlagSkinAssetUrl } from '../features/point-shop/mock-skins';
import koreaInvertedMask from '../assets/korea-inverted-mask.json';
import './map-preview.css';

interface MapPreviewProps {
  spots: Spot[];
  selectedSpot?: Spot | null;
  visitedSpotIds?: ReadonlySet<number>;
  equippedSkinId?: string | null;
  onSelect?: (spot: Spot) => void;
  onDeselect?: () => void;
  onViewportChange?: (viewport: { minLat: number; minLng: number; maxLat: number; maxLng: number }) => void;
  onUserLocationChange?: (location: Spot['location']) => void;
}

type LocationState = 'idle' | 'locating' | 'ready' | 'unavailable';

const KOREA_BOUNDS: [[number, number], [number, number]] = [
  [124.5, 33.0], // 남서단 (마라도 남단 33.11° 포함)
  [131.9, 38.65], // 북동단 (고성 DMZ 38.61°, 독도 포함)
];

const PAN_BOUNDS: [[number, number], [number, number]] = [
  [122.0, 31.0],
  [134.0, 40.5],
];

const CIRCLE_SOURCE_ID = 'user-check-in-circle-source';
const CIRCLE_FILL_LAYER_ID = 'user-check-in-circle-fill';
const CIRCLE_LINE_LAYER_ID = 'user-check-in-circle-line';

export function MapPreview({
  spots,
  selectedSpot,
  visitedSpotIds = new Set<number>(),
  equippedSkinId,
  onSelect,
  onDeselect,
  onViewportChange,
  onUserLocationChange,
}: MapPreviewProps) {
  const mapElement = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maptilersdk.Map | null>(null);
  const markersRef = useRef<maptilersdk.Marker[]>([]);
  const userMarkerRef = useRef<maptilersdk.Marker | null>(null);
  const onDeselectRef = useRef(onDeselect);
  onDeselectRef.current = onDeselect;

  const [mapState, setMapState] = useState<'fallback' | 'loading' | 'ready' | 'error'>(
    webEnv.maptilerApiKey ? 'loading' : 'fallback'
  );
  const [userLocation, setUserLocation] = useState<Spot['location'] | null>(null);
  const [locationState, setLocationState] = useState<LocationState>('idle');

  const nearbySpotIds = useMemo(
    () => (userLocation ? getNearbySpotIds(spots, userLocation) : new Set<number>()),
    [spots, userLocation]
  );

  // Initialize MapTiler Map
  useEffect(() => {
    console.log('[MapTiler] Initializing MapPreview:', {
      hasKey: Boolean(webEnv.maptilerApiKey),
      styleId: webEnv.maptilerStyleId,
    });

    if (!webEnv.maptilerApiKey || !mapElement.current) {
      if (!webEnv.maptilerApiKey) {
        console.warn('[MapTiler] VITE_MAPTILER_API_KEY is empty! Check apps/web/.env and restart dev server.');
      }
      return;
    }

    maptilersdk.config.apiKey = webEnv.maptilerApiKey;

    const KOREA_CENTER: [number, number] = [127.8, 35.85];
    const KOREA_INITIAL_ZOOM = 5.6;

    let map: maptilersdk.Map | null = null;
    try {
      map = new maptilersdk.Map({
        container: mapElement.current,
        style: getMapTilerStyleUrl(),
        center: KOREA_CENTER,
        zoom: KOREA_INITIAL_ZOOM,
        maxBounds: PAN_BOUNDS,
        minZoom: 4.5,
        navigationControl: false,
        geolocateControl: false,
      });
      mapRef.current = map;
    } catch (err) {
      console.error('[MapPreview] Failed to construct MapTiler:', err);
      setMapState('error');
      return;
    }

    const emitViewport = () => {
      if (!map) return;
      const bounds = map.getBounds();
      onViewportChange?.({
        minLat: bounds.getSouth(),
        minLng: bounds.getWest(),
        maxLat: bounds.getNorth(),
        maxLng: bounds.getEast(),
      });
    };

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
            'fill-color': '#F7F4EC', // Match app background
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

      setMapState('ready');
      requestAnimationFrame(() => {
        if (!map) return;
        map.resize();
        map.fitBounds(KOREA_BOUNDS, {
          padding: { top: 12, bottom: 12, left: 16, right: 16 },
          maxZoom: 6.2,
          duration: 0,
        });
      });
      emitViewport();
    });

    map.on('moveend', emitViewport);
    map.on('click', () => {
      onDeselectRef.current?.();
    });
    map.on('error', (e) => {
      console.warn('[MapPreview] MapTiler runtime notice:', e);
    });

    return () => {
      mapRef.current = null;
      map?.remove();
    };
  }, [onViewportChange]);

  // Render Spots & Flag Markers
  useEffect(() => {
    const map = mapRef.current;
    if (mapState !== 'ready' || !map) return;

    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = groupSpotsByLocation(spots)
      .map((group) => {
        let selectedIndex = 0;
        const representative = group[0];
        if (!representative) return null;
        const representativeState = getMapSpotState({
          spot: representative,
          selectedSpotId: selectedSpot?.id,
          nearbySpotIds,
          visitedSpotIds,
        });
        const isCompleted =
          representative.checkInCompleted ||
          representativeState.visited ||
          group.some((spot) => spot.checkInCompleted || visitedSpotIds.has(spot.id));
        const isSelected = group.some((spot) => spot.id === selectedSpot?.id);

        const content = document.createElement('button');
        content.type = 'button';

        if (isCompleted) {
          const skinUrl = getFlagSkinAssetUrl(equippedSkinId);
          content.className = `kakao-flag-marker${isSelected ? ' kakao-flag-marker--selected' : ''}`;
          content.setAttribute(
            'aria-label',
            group.length > 1
              ? `${group.length}개 장소 (인증 완료 포함): ${group.map((spot) => spot.title).join(', ')}`
              : `${representative.title}, 방문 완료 깃발`
          );
          content.innerHTML = `
            <div class="kakao-flag-marker__inner">
              <img src="${skinUrl}" alt="플래그" class="kakao-flag-marker__img" />
              ${group.length > 1 ? `<span class="kakao-flag-marker__badge">${group.length}</span>` : ''}
            </div>
            <span class="kakao-flag-marker__shadow"></span>
          `;
        } else {
          const state = representativeState.checkInAvailable
            ? 'check-in'
            : representative.reviewStatus
            ? 'pending'
            : 'default';
          content.className = `kakao-spot-marker kakao-spot-marker--${state}${
            isSelected ? ' kakao-spot-marker--selected' : ''
          }`;
          content.setAttribute(
            'aria-label',
            group.length > 1
              ? `${group.length}개 장소: ${group.map((spot) => spot.title).join(', ')}`
              : `${representative.title}, ${getMapSpotStateLabel(representativeState)}`
          );
          content.innerHTML = group.length > 1 ? `<span>${group.length}</span>` : '<span></span>';
        }

        content.addEventListener('click', (event) => {
          event.stopPropagation();
          onSelect?.(group[selectedIndex] ?? representative);
          selectedIndex = (selectedIndex + 1) % group.length;
        });

        const marker = new maptilersdk.Marker({
          element: content,
          anchor: isCompleted ? 'bottom-left' : 'bottom',
        })
          .setLngLat([representative.location.lng, representative.location.lat])
          .addTo(map);

        return marker;
      })
      .filter((marker): marker is maptilersdk.Marker => marker !== null);

    return () => {
      markersRef.current.forEach((marker) => marker.remove());
      markersRef.current = [];
    };
  }, [equippedSkinId, mapState, nearbySpotIds, onSelect, selectedSpot, spots, visitedSpotIds]);

  // Smoothly pan camera to selected spot with offset so marker is visible above bottom card
  useEffect(() => {
    const map = mapRef.current;
    if (mapState !== 'ready' || !map || !selectedSpot) return;

    map.flyTo({
      center: [selectedSpot.location.lng, selectedSpot.location.lat],
      offset: [0, -80],
      zoom: Math.max(map.getZoom(), 13.5),
      duration: 600,
    });
  }, [mapState, selectedSpot]);

  // Render User Location & Check-in Circle
  useEffect(() => {
    const map = mapRef.current;
    if (mapState !== 'ready' || !userLocation || !map) return;

    const userLngLat: [number, number] = [userLocation.lng, userLocation.lat];

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
    const existingSource = map.getSource(CIRCLE_SOURCE_ID) as maptilersdk.GeoJSONSource | undefined;

    if (existingSource) {
      existingSource.setData(circleGeoJson);
    } else if (map.isStyleLoaded()) {
      map.addSource(CIRCLE_SOURCE_ID, {
        type: 'geojson',
        data: circleGeoJson,
      });
      map.addLayer({
        id: CIRCLE_FILL_LAYER_ID,
        type: 'fill',
        source: CIRCLE_SOURCE_ID,
        paint: {
          'fill-color': '#60A5FA',
          'fill-opacity': 0.15,
        },
      });
      map.addLayer({
        id: CIRCLE_LINE_LAYER_ID,
        type: 'line',
        source: CIRCLE_SOURCE_ID,
        paint: {
          'line-color': '#2563EB',
          'line-width': 2,
          'line-opacity': 0.7,
        },
      });
    }

    return () => {
      if (map.getLayer(CIRCLE_LINE_LAYER_ID)) map.removeLayer(CIRCLE_LINE_LAYER_ID);
      if (map.getLayer(CIRCLE_FILL_LAYER_ID)) map.removeLayer(CIRCLE_FILL_LAYER_ID);
      if (map.getSource(CIRCLE_SOURCE_ID)) map.removeSource(CIRCLE_SOURCE_ID);
    };
  }, [mapState, userLocation]);

  const moveToCurrentLocation = (fly = true) => {
    if (!navigator.geolocation) {
      setLocationState('unavailable');
      return;
    }
    setLocationState('locating');
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const location = { lat: coords.latitude, lng: coords.longitude };
        setUserLocation(location);
        onUserLocationChange?.(location);
        setLocationState('ready');
        if (fly && mapRef.current) {
          mapRef.current.flyTo({
            center: [location.lng, location.lat],
            zoom: 15,
          });
        }
      },
      () => setLocationState('unavailable'),
      { enableHighAccuracy: true, maximumAge: 30_000, timeout: 10_000 }
    );
  };

  useEffect(() => {
    moveToCurrentLocation(false); // 처음 로드 시에는 확대하지 않고 한국 전체를 보여줌
  }, []);

  const locationMessage =
    locationState === 'locating'
      ? '현재 위치를 확인하는 중...'
      : locationState === 'unavailable'
      ? '위치를 확인할 수 없어요.'
      : locationState === 'ready'
      ? '현재 위치를 확인했어요.'
      : null;

  const controls = (
    <>
      {locationMessage && (
        <span
          className="map-preview__location-state"
          role={locationState === 'unavailable' ? 'alert' : 'status'}
        >
          {locationMessage}
        </span>
      )}
      <button
        type="button"
        className="map-preview__locate"
        aria-label="현재 위치로 이동"
        onClick={() => moveToCurrentLocation(true)}
      >
        <Navigation size={19} />
      </button>
    </>
  );

  return (
    <section
      className={`map-preview ${mapState === 'ready' ? 'map-preview--maptiler' : 'map-preview--fallback'}`}
      aria-label="종로구 관광지 지도"
    >
      <div ref={mapElement} className="map-canvas" />
      {mapState !== 'ready' && (
        <>
          <div className="map-preview__label">
            <span>종로구 관광지 지도</span>
            <small>
              {mapState === 'loading'
                ? '지도를 불러오는 중'
                : mapState === 'error'
                ? '지도 키를 확인해주세요'
                : 'MapTiler 키 설정 후 실제 마커 표시'}
            </small>
          </div>
          <div className="map-preview__empty">
            {spots.length ? `${spots.length}개 장소를 불러왔습니다.` : '표시할 장소가 없습니다.'}
          </div>
        </>
      )}
      {controls}
    </section>
  );
}
