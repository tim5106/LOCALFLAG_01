import { ImageOff, MapPin } from 'lucide-react';
import type { Spot } from '../types/spot';

interface SpotCardProps {
  spot: Spot;
}

export function SpotCard({ spot }: SpotCardProps) {
  return (
    <article className="spot-card">
      <div className="spot-card__image">
        {spot.imageUrl ? (
          <img src={spot.imageUrl} alt="" />
        ) : (
          <div className="spot-card__fallback">
            <ImageOff size={20} />
            <span>숨은 장소</span>
          </div>
        )}
        <strong className="grade-badge" data-grade={spot.grade}>
          {spot.grade}
        </strong>
      </div>
      <div className="spot-card__content">
        <div>
          <h3>{spot.title}</h3>
          <p>
            <MapPin size={14} /> {spot.address}
          </p>
        </div>
        <div className="spot-card__meta">
          {spot.isDecliningArea && <span>인구감소지역 2.5×</span>}
          <strong>예상 {spot.estimatedReward}P</strong>
        </div>
      </div>
    </article>
  );
}

