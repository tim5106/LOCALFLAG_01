import type { Spot } from '../types/spot';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api/v1';

export interface ApiListResponse<T> {
  data: T[];
  meta: {
    nextCursor: string | null;
    hasNext: boolean;
  };
}

export async function getSpots(signal?: AbortSignal): Promise<ApiListResponse<Spot>> {
  const response = await fetch(`${API_BASE_URL}/spots?limit=20`, { signal });

  if (!response.ok) {
    throw new Error('장소 목록을 불러오지 못했습니다.');
  }

  return (await response.json()) as ApiListResponse<Spot>;
}

export interface PositionInput {
  lat: number;
  lng: number;
  accuracyM: number;
  capturedAt: string;
}

export async function precheckSpot(spotId: number, position: PositionInput) {
  const response = await fetch(`${API_BASE_URL}/check-ins/precheck`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ spotId, position }),
  });

  const body = (await response.json()) as unknown;
  if (!response.ok) {
    throw new Error('인증 가능 여부를 확인하지 못했습니다.');
  }

  return body;
}

