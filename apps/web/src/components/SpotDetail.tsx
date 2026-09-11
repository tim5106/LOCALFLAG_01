import { ArrowLeft, ExternalLink, MapPin } from 'lucide-react';
import { SpotImage } from './SpotImage';
import type { Spot } from '../types/spot';

const categoryLabels: Record<number, string> = { 12: '관광지', 14: '문화시설', 15: '행사·축제', 28: '레포츠', 32: '숙박' };

export function SpotDetail({ spot, onClose }: { spot: Spot; onClose: () => void }) {
  const directionsUrl = `https://map.kakao.com/link/map/${encodeURIComponent(spot.title)},${spot.location.lat},${spot.location.lng}`;
  return <section className="spot-detail" aria-label={`${spot.title} 상세 정보`}><button type="button" className="detail-back" onClick={onClose}><ArrowLeft size={18} /> 탐색으로 돌아가기</button><div className="spot-detail__image"><SpotImage src={spot.imageUrl} alt={`${spot.title} 대표 이미지`} iconSize={28} /></div><div className="spot-detail__body"><div className="spot-detail__eyebrow">{categoryLabels[spot.contentTypeId] ?? '관광 정보'}</div><h1>{spot.title}</h1><p className="spot-detail__address"><MapPin size={16} /> {spot.address || '주소 정보 없음'}</p><a className="primary-button" href={directionsUrl} target="_blank" rel="noreferrer">길찾기 <ExternalLink size={16} /></a></div></section>;
}
