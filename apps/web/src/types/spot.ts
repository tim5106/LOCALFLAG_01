<<<<<<< HEAD
export type SpotGrade = 'S' | 'A' | 'B' | 'C';
export type CheckInStatus = 'LOCKED' | 'AVAILABLE' | 'PENDING' | 'COMPLETED';
=======
export type SpotGrade = 'S' | 'A' | 'B' | 'C' | 'UNRATED';
export type SpotGeometryType = 'POINT' | 'AREA';
>>>>>>> 44fc6bb (feat(web): add tourist map state UI)

export interface Spot {
  id: number;
  name?: string;
  title: string;
  address: string;
  contentTypeId: number;
  grade?: SpotGrade;
  isDecliningArea: boolean;
  estimatedReward?: number;
  imageUrl: string | null;
<<<<<<< HEAD
  rewardEligible?: boolean;
  seasonPin?: boolean;
  infoOnly?: boolean;
  geometryType?: 'POINT' | 'AREA' | 'EXCLUDE';
  checkInEnabled?: boolean;
  checkInCompleted?: boolean;
  checkInRadiusM?: number;
  reviewStatus?: string;
  reviewNote?: string;
  status: 'SCHEDULED' | 'ACTIVE' | 'INACTIVE' | 'EXPIRED';
=======
  thumbnailUrl?: string | null;
  status?: 'SCHEDULED' | 'ACTIVE' | 'INACTIVE' | 'EXPIRED';
  geometryType?: SpotGeometryType;
  checkInEnabled?: boolean;
  checkInRadiusM?: number;
  visited?: boolean;
>>>>>>> 44fc6bb (feat(web): add tourist map state UI)
  location: {
    lat: number;
    lng: number;
  };
}