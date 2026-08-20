import { Flag, Navigation } from 'lucide-react';
import type { Spot } from '../types/spot';

export function MapPreview({ spots }: { spots: Spot[] }) {
  return (
    <section className="map-preview" aria-label="전국 숨은 명소 지도 미리보기">
      <div className="map-preview__grid" aria-hidden="true" />
      <div className="map-preview__label"><span>전국 탐색</span><small>지도 서비스 연결 준비 중</small></div>
      {spots.slice(0, 5).map((spot, index) => <button type="button" className="map-pin" style={{ left: `${18 + index * 15}%`, top: `${30 + (index % 3) * 18}%` }} key={spot.id} aria-label={`${spot.title}, ${spot.grade} 등급`} title={spot.title}><FlagShape grade={spot.grade} /></button>)}
      <button type="button" className="map-preview__locate" aria-label="현재 위치로 이동"><Navigation size={19} /></button>
    </section>
  );
}

function FlagShape({ grade }: { grade: Spot['grade'] }) {
  return <span className="flag-shape" data-grade={grade}><Flag size={17} /></span>;
}
