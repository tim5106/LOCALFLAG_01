import { ArrowLeft, ExternalLink, ImageOff, MapPin, Star } from 'lucide-react';
import type { Spot } from '../types/spot';

export function SpotDetail({ spot, onClose }: { spot: Spot; onClose: () => void }) {
  const directionsUrl = `https://map.kakao.com/link/map/${encodeURIComponent(spot.title)},${spot.location.lat},${spot.location.lng}`;
  return <section className="spot-detail" aria-label={`${spot.title} 상세 정보`}>
    <button type="button" className="detail-back" onClick={onClose}><ArrowLeft size={18} /> 탐색으로 돌아가기</button>
    <div className="spot-detail__image">{spot.imageUrl ? <img src={spot.imageUrl} alt={`${spot.title} 대표 이미지`} /> : <div className="spot-card__fallback"><ImageOff size={28} /><span>이미지 준비 중</span></div>}<strong className="grade-badge" data-grade={spot.grade}>{spot.grade}</strong></div>
    <div className="spot-detail__body"><div className="spot-detail__eyebrow"><Star size={14} /> {spot.isDecliningArea ? '인구감소지역 추천 장소' : 'Local Flag 추천 장소'}</div><h1>{spot.title}</h1><p className="spot-detail__address"><MapPin size={16} /> {spot.address}</p><div className="spot-detail__stats"><div><small>장소 등급</small><strong>{spot.grade} 등급</strong></div><div><small>예상 획득 포인트</small><strong>{spot.estimatedReward}P</strong></div></div>{spot.status !== 'ACTIVE' && <p className="spot-detail__notice">현재 {spot.status === 'SCHEDULED' ? '운영 예정' : '운영이 종료되었거나 정보가 부족한'} 장소입니다.</p>}<a className="primary-button" href={directionsUrl} target="_blank" rel="noreferrer">길찾기 <ExternalLink size={16} /></a></div>
  </section>;
}
