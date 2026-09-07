import { estimateReward } from './reward.js';
import type { SpotGrade } from './tourism.js';

export type PublicSpotStatus = 'SCHEDULED' | 'ACTIVE';

export interface SpotReadModel {
  id: number;
  title: string;
  address: string;
  contentTypeId: number;
  lat: number;
  lng: number;
  grade: SpotGrade;
  isDecliningArea: boolean;
  imageUrl: string | null;
  status: PublicSpotStatus;
  areaCode: number | null;
  quietWeight: number;
}

export interface PublicSpot {
  id: number;
  title: string;
  address: string;
  contentTypeId: number;
  location: { lat: number; lng: number };
  grade: SpotGrade;
  isDecliningArea: boolean;
  estimatedReward: number;
  imageUrl: string | null;
  status: PublicSpotStatus;
}

export function toPublicSpot(spot: SpotReadModel): PublicSpot {
  return {
    id: spot.id,
    title: spot.title,
    address: spot.address,
    contentTypeId: spot.contentTypeId,
    location: { lat: spot.lat, lng: spot.lng },
    grade: spot.grade,
    isDecliningArea: spot.isDecliningArea,
    estimatedReward: estimateReward(spot).points,
    imageUrl: spot.imageUrl,
    status: spot.status,
  };
}
