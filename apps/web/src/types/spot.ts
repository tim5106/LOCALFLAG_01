export type SpotGrade = 'S' | 'A' | 'B' | 'C' | 'UNRATED';
export type SpotGeometryType = 'POINT' | 'AREA' | 'EXCLUDE';

export interface Spot {
  id: number;
  title: string;
  address: string;
  contentTypeId: number;
  grade?: SpotGrade;
  isDecliningArea: boolean;
  estimatedReward?: number;
  imageUrl: string | null;
  thumbnailUrl?: string | null;
  rewardEligible?: boolean;
  seasonPin?: boolean;
  infoOnly?: boolean;
  checkInCompleted?: boolean;
  reviewStatus?: string;
  reviewNote?: string;
  status: 'SCHEDULED' | 'ACTIVE' | 'INACTIVE' | 'EXPIRED';
  geometryType?: SpotGeometryType;
  checkInEnabled?: boolean;
  checkInRadiusM?: number;
  visited?: boolean;
  location: {
    lat: number;
    lng: number;
  };
}