import { ImageOff, MapPin, X } from 'lucide-react';
import { useState } from 'react';
import { getFallbackAsset } from '../lib/fallback-assets';
import type { Spot } from '../types/spot';

const categoryLabels: Record<number, string> = {
  12: '관광지',
  14: '문화시설',
  15: '행사·축제',
  28: '레포츠',
  32: '숙박',
};

export function SpotMapSheet({ spot, onClose, onDetail }: { spot: Spot; onClose: () => void; onDetail: () => void }) {
  const [imageFailed, setImageFailed] = useState(false);
  const imageUrl = spot.thumbnailUrl ?? spot.imageUrl;
  const fallback = getFallbackAsset(spot.contentTypeId);

  return (
    <aside className="spot-map-sheet" aria-label={`${spot.title} 장소 정보`} role="dialog">
      <button type="button" className="spot-map-sheet__close" aria-label="장소 카드 닫기" onClick={onClose}><X size={18} /></button>
      <div className="spot-map-sheet__image">
        {imageUrl && !imageFailed ? (
          <img src={imageUrl} alt={`${spot.title} 대표 이미지`} onError={() => setImageFailed(true)} />
        ) : (
          <div className="spot-card__fallback" style={{ backgroundImage: `url(${fallback.src})` }}>
            <ImageOff size={25} /><span>숨은 장소</span>
          </div>
        )}
      </div>
      <div className="spot-map-sheet__body">
        <span className="spot-map-sheet__category">{categoryLabels[spot.contentTypeId] ?? '관광 정보'}</span>
        <h2>{spot.title}</h2>
        <p><MapPin size={15} /> {spot.address || '주소 정보 없음'}</p>
        <button type="button" className="primary-button" onClick={onDetail}>상세 보기</button>
      </div>
    </aside>
  );
}
