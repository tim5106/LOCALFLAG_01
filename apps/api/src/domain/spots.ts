export interface SpotRecord {
  id: number;
  title: string;
  address: string;
  contentTypeId: number;
  grade: 'S' | 'A' | 'B' | 'C';
  isDecliningArea: boolean;
  estimatedReward: number;
  imageUrl: string | null;
  status: 'SCHEDULED' | 'ACTIVE' | 'INACTIVE' | 'EXPIRED';
  location: { lat: number; lng: number };
}

export const prototypeSpots: SpotRecord[] = [
  {
    id: 100001,
    title: '보성 대원사 숲길',
    address: '전라남도 보성군 문덕면',
    contentTypeId: 12,
    grade: 'A',
    isDecliningArea: true,
    estimatedReward: 250,
    imageUrl: null,
    status: 'ACTIVE',
    location: { lat: 34.9671, lng: 127.1694 },
  },
  {
    id: 100002,
    title: '고성 왕곡마을',
    address: '강원특별자치도 고성군 죽왕면',
    contentTypeId: 12,
    grade: 'S',
    isDecliningArea: true,
    estimatedReward: 500,
    imageUrl: null,
    status: 'ACTIVE',
    location: { lat: 38.3306, lng: 128.5174 },
  },
  {
    id: 100003,
    title: '영월 섶다리 마을',
    address: '강원특별자치도 영월군 주천면',
    contentTypeId: 12,
    grade: 'B',
    isDecliningArea: true,
    estimatedReward: 250,
    imageUrl: null,
    status: 'ACTIVE',
    location: { lat: 37.272, lng: 128.267 },
  },
];

