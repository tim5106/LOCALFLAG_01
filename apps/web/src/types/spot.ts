export type SpotGrade = 'S' | 'A' | 'B' | 'C';

export interface Spot {
  id: number;
  title: string;
  address: string;
  contentTypeId: number;
  grade?: SpotGrade;
  isDecliningArea: boolean;
  estimatedReward?: number;
  imageUrl: string | null;
  rewardEligible?: boolean;
  seasonPin?: boolean;
  infoOnly?: boolean;
  status: 'SCHEDULED' | 'ACTIVE' | 'INACTIVE' | 'EXPIRED';
  location: {
    lat: number;
    lng: number;
  };
}

