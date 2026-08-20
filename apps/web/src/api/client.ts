import { webEnv } from '../config/env';
import type { ApiErrorBody, ApiListResponse } from '../types/api';
import { ApiRequestError } from '../types/api';
import type { Spot } from '../types/spot';

export interface SpotQuery {
  minLat?: number;
  minLng?: number;
  maxLat?: number;
  maxLng?: number;
  q?: string;
  grades?: string[];
  decliningArea?: boolean;
  areaCode?: string;
  sigunguCode?: string;
  cursor?: string;
  limit?: number;
}

const toQueryString = (query: SpotQuery) => {
  const params = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value === undefined || value === '' || (Array.isArray(value) && value.length === 0)) return;
    params.set(key, Array.isArray(value) ? value.join(',') : String(value));
  });
  return params.toString();
};

export async function getSpots(query: SpotQuery = {}, signal?: AbortSignal): Promise<ApiListResponse<Spot>> {
  const params = toQueryString({ limit: 20, ...query });
  const response = await fetch(`${webEnv.apiBaseUrl}/spots?${params}`, { signal });

  if (!response.ok) {
    const body = (await response.json().catch(() => undefined)) as ApiErrorBody | undefined;
    throw new ApiRequestError(response.status, body);
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
  const response = await fetch(`${webEnv.apiBaseUrl}/check-ins/precheck`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ spotId, position }),
  });

  const body = (await response.json()) as unknown;
  if (!response.ok) {
    throw new ApiRequestError(response.status, body as ApiErrorBody);
  }

  return body;
}
