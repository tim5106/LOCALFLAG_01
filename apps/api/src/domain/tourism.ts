export const SUPPORTED_CONTENT_TYPE_IDS = [12, 14, 15, 28, 32, 38, 39] as const;

export type SupportedContentTypeId = (typeof SUPPORTED_CONTENT_TYPE_IDS)[number];
export type SpotGrade = 'S' | 'A' | 'B' | 'C';

export interface NormalizedTourSpot {
  contentId: number;
  contentTypeId: SupportedContentTypeId;
  title: string;
  address: string;
  latitude: number;
  longitude: number;
  areaCode: number | null;
  sigunguCode: number | null;
  imageUrl: string | null;
  thumbnailUrl: string | null;
  eventStartDate: string | null;
  eventEndDate: string | null;
  additionalImageCount: number;
  detailFieldCount: number;
  classificationWeight: 0 | 0.1 | 0.2;
  rawJson: Record<string, unknown>;
}

export interface SpotScore {
  categoryWeight: number;
  mediaWeight: number;
  detailWeight: number;
  classWeight: number;
  quietWeight: number;
  spotScore: number;
  grade: SpotGrade;
  scoreVersion: 'spot-score-v1';
}
