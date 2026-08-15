import { Navigation } from 'lucide-react';
import type { Spot } from '../types/spot';

interface MapPreviewProps {
  spots: Spot[];
}

export function MapPreview({ spots }: MapPreviewProps) {
  return (
    <section className="map-preview" aria-label="전국 숨은 명소 지도 미리보기">
      <div className="map-preview__grid" aria-hidden="true" />
      <div className="map-preview__label">
        <span>전국 탐색</span>
        <small>카카오 지도 연결 전 미리보기</small>
      </div>
      {spots.slice(0, 5).map((spot, index) => (
        <button
          type="button"
          className="map-pin"
          style={{ left: `${18 + index * 15}%`, top: `${30 + (index % 3) * 18}%` }}
          key={spot.id}
          aria-label={`${spot.title}, ${spot.grade} 등급`}
          title={spot.title}
        >
          <FlagShape grade={spot.grade} />
        </button>
      ))}
      <button type="button" className="map-preview__locate" aria-label="현재 위치로 이동">
        <Navigation size={19} />
      </button>
    </section>
  );
}

function FlagShape({ grade }: { grade: Spot['grade'] }) {
  return (
    <span className="flag-shape" data-grade={grade}>
      <span>{grade}</span>
    </span>
  );
}

