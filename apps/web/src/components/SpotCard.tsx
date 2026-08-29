import { ImageOff, MapPin } from 'lucide-react';
import { useState } from 'react';
import type { Spot } from '../types/spot';

export function SpotCard({ spot, onSelect }: { spot: Spot; onSelect?: (spot: Spot) => void }) {
  const [imageFailed, setImageFailed] = useState(false);
  return <article className="spot-card" tabIndex={0} role="button" onClick={() => onSelect?.(spot)} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onSelect?.(spot); } }}>
    <div className="spot-card__image">{spot.imageUrl && !imageFailed ? <img src={spot.imageUrl} alt={`${spot.title} 대표 이미지`} onError={() => setImageFailed(true)} /> : <div className="spot-card__fallback"><ImageOff size={20} /><span>이미지 준비 중</span></div>}{spot.grade && <strong className="grade-badge" data-grade={spot.grade}>{spot.grade}</strong>}</div>
    <div className="spot-card__content"><div><h3>{spot.title}</h3><p><MapPin size={14} /> {spot.address || '주소 정보 없음'}</p></div><div className="spot-card__meta">{spot.checkInEnabled ? <span className="spot-status spot-status--enabled">현장 인증 가능</span> : spot.reviewStatus ? <span className="spot-status">정보 확인 중</span> : spot.isDecliningArea ? <span>인구감소지역 · 2.5배</span> : null}{spot.estimatedReward !== undefined && <strong>예상 {spot.estimatedReward}P</strong>}</div></div>
  </article>;
}
