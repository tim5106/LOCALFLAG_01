import { ImageOff, MapPin, Navigation } from 'lucide-react';
import { useMemo, useState } from 'react';
import { getMapSpotState, getMapSpotStateLabel, getNearbySpotIds } from '../lib/map-spot-state';
import type { Spot } from '../types/spot';
import { MapMarker } from './MapMarker';
import './map-preview.css';

interface MapPreviewProps {
  spots: Spot[];
}

const categoryLabels: Record<number, string> = {
  12: '관광지',
  14: '문화시설',
  15: '행사·축제',
  28: '레포츠',
};

export function MapPreview({ spots }: MapPreviewProps) {
  const [selectedSpotId, setSelectedSpotId] = useState<number | null>(null);
  const [userLocation, setUserLocation] = useState<Spot['location'] | null>(null);
  const [locationState, setLocationState] = useState<'idle' | 'locating' | 'ready' | 'unavailable'>('idle');
  const [imageFailed, setImageFailed] = useState(false);

  const nearbySpotIds = useMemo(
    () => userLocation ? getNearbySpotIds(spots, userLocation) : new Set<number>(),
    [spots, userLocation],
  );
  const selectedSpot = spots.find((spot) => spot.id === selectedSpotId) ?? null;
  const selectedState = selectedSpot
    ? getMapSpotState({ spot: selectedSpot, selectedSpotId, nearbySpotIds })
    : null;

  const handleSelect = (spotId: number) => {
    setSelectedSpotId(spotId);
    setImageFailed(false);
  };

  const handleLocate = () => {
    if (!navigator.geolocation) {
      setLocationState('unavailable');
      return;
    }

    setLocationState('locating');
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setUserLocation({ lat: coords.latitude, lng: coords.longitude });
        setLocationState('ready');
      },
      () => setLocationState('unavailable'),
      { enableHighAccuracy: true, maximumAge: 30_000, timeout: 10_000 },
    );
  };

  const locationMessage = locationState === 'ready'
    ? nearbySpotIds.size > 0 ? `100m 안 인증 가능 ${nearbySpotIds.size}곳` : '100m 안 인증 가능 장소 없음'
    : locationState === 'locating' ? '현재 위치 확인 중'
    : locationState === 'unavailable' ? '위치를 확인할 수 없음'
    : '관광지 터치로 정보 보기';

  return (
    <section className="map-preview" data-selected={selectedSpot !== null} aria-label="관광지 지도 미리보기">
      <div className="map-preview__grid" aria-hidden="true" />
      <div className="map-preview__label">
        <span>관광지 지도</span>
        <small>{locationMessage}</small>
      </div>
      {spots.slice(0, 10).map((spot, index) => {
        const state = getMapSpotState({ spot, selectedSpotId, nearbySpotIds });
        const statusLabel = getMapSpotStateLabel(state);

        return (
          <button
            type="button"
            className="map-pin"
            style={{ left: `${14 + (index % 5) * 19}%`, top: `${31 + Math.floor(index / 5) * 30 + (index % 2) * 9}%` }}
            key={spot.id}
            aria-label={`${spot.title}, ${statusLabel}`}
            aria-pressed={state.selected}
            onClick={() => handleSelect(spot.id)}
          >
            <MapMarker
              grade={spot.grade}
              selected={state.selected}
              visited={state.visited}
              checkInAvailable={state.checkInAvailable}
              checkInUnavailable={state.checkInUnavailable}
              label={spot.title}
              statusLabel={statusLabel}
              estimatedReward={spot.estimatedReward}
            />
          </button>
        );
      })}
      <button type="button" className="map-preview__locate" aria-label="현재 위치로 인증 가능 장소 찾기" onClick={handleLocate} disabled={locationState === 'locating'}>
        <Navigation size={19} />
      </button>

      {selectedSpot && selectedState && (
        <SpotMapSheet spot={selectedSpot} stateLabel={getMapSpotStateLabel(selectedState)} imageFailed={imageFailed} onImageError={() => setImageFailed(true)} />
      )}
    </section>
  );
}

interface SpotMapSheetProps {
  spot: Spot;
  stateLabel: string;
  imageFailed: boolean;
  onImageError: () => void;
}

function SpotMapSheet({ spot, stateLabel, imageFailed, onImageError }: SpotMapSheetProps) {
  const imageUrl = spot.thumbnailUrl ?? spot.imageUrl;
  const checkInAvailable = stateLabel === '100m 이내 · 인증 가능';
  const checkInUnavailable = stateLabel === '탐색 전용 · 인증 불가';

  return (
    <article className="map-spot-sheet" aria-label={`${spot.title} 정보`}>
      <div className="map-spot-sheet__image">
        {imageUrl && !imageFailed ? <img src={imageUrl} alt="" onError={onImageError} /> : (
          <div className="map-spot-sheet__fallback"><ImageOff size={19} /></div>
        )}
      </div>
      <div className="map-spot-sheet__content">
        <div className="map-spot-sheet__eyebrow">
          <span>{categoryLabels[spot.contentTypeId] ?? '관광지'}</span>
          <strong data-state={checkInAvailable ? 'available' : checkInUnavailable ? 'unavailable' : 'default'}>{stateLabel}</strong>
        </div>
        <h2>{spot.title}</h2>
        <p><MapPin size={13} /> {spot.address}</p>
        <div className="map-spot-sheet__actions">
          <button type="button">상세 보기</button>
          <button type="button" disabled={!checkInAvailable}>{checkInAvailable ? '현장 인증' : checkInUnavailable ? '탐색 전용' : '100m 안에서 인증'}</button>
        </div>
      </div>
    </article>
  );
}