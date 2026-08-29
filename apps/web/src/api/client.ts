import { webEnv } from '../config/env';
import type { ApiErrorBody, ApiListResponse } from '../types/api';
import { ApiRequestError } from '../types/api';
import type { Spot } from '../types/spot';
import { getAccessToken } from '../features/auth/auth';

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

export const prototypeSpots: Spot[] = [
  { id: 100001, title: '보성 대한다원 전망대', address: '전라남도 보성군', contentTypeId: 12, grade: 'A', isDecliningArea: true, estimatedReward: 250, imageUrl: null, status: 'ACTIVE', location: { lat: 34.9671, lng: 127.1694 } },
  { id: 100002, title: '고성 화진포 마을', address: '강원특별자치도 고성군', contentTypeId: 12, grade: 'S', isDecliningArea: true, estimatedReward: 500, imageUrl: null, status: 'ACTIVE', location: { lat: 38.3306, lng: 128.5174 } },
  { id: 100003, title: '영월 청령포 마을', address: '강원특별자치도 영월군', contentTypeId: 12, grade: 'B', isDecliningArea: true, estimatedReward: 250, imageUrl: null, status: 'ACTIVE', location: { lat: 37.272, lng: 128.267 } },
];

export const toQueryString = (query: SpotQuery) => {
  const params = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value === undefined || value === '' || (Array.isArray(value) && value.length === 0)) return;
    params.set(key, Array.isArray(value) ? value.join(',') : String(value));
  });
  return params.toString();
};

export async function getSpots(query: SpotQuery = {}, signal?: AbortSignal): Promise<ApiListResponse<Spot>> {
  const params = toQueryString({ limit: 20, ...query });
  let response: Response;
  try {
    response = await fetch(`${webEnv.apiBaseUrl}/spots?${params}`, { signal });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error;
    return fallbackSpots(query);
  }

  if (!response.ok) {
    if (response.status >= 500) return fallbackSpots(query);
    const body = (await response.json().catch(() => undefined)) as ApiErrorBody | undefined;
    throw new ApiRequestError(response.status, body);
  }

  return (await response.json()) as ApiListResponse<Spot>;
}

function fallbackSpots(query: SpotQuery): ApiListResponse<Spot> {
  const grades = query.grades ?? [];
  const data = prototypeSpots.filter((spot) => !grades.length || (spot.grade !== undefined && grades.includes(spot.grade)))
    .filter((spot) => query.decliningArea === undefined || spot.isDecliningArea === query.decliningArea)
    .filter((spot) => !query.q || `${spot.title} ${spot.address}`.includes(query.q))
    .slice(0, query.limit ?? 20);
  return { data, meta: { nextCursor: null, hasNext: false, source: 'fallback' } };
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
    headers: { 'Content-Type': 'application/json', ...(getAccessToken() ? { Authorization: `Bearer ${getAccessToken()}` } : {}) },
    body: JSON.stringify({ spotId, position }),
  });

  const body = (await response.json()) as unknown;
  if (!response.ok) {
    throw new ApiRequestError(response.status, body as ApiErrorBody);
  }

  return body;
}

export async function createCheckIn(spotId: number, position: PositionInput) {
  const response = await fetch(`${webEnv.apiBaseUrl}/check-ins`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Idempotency-Key': crypto.randomUUID(), ...(getAccessToken() ? { Authorization: `Bearer ${getAccessToken()}` } : {}) }, body: JSON.stringify({ spotId, position }) });
  const body = await response.json() as unknown;
  if (!response.ok) throw new ApiRequestError(response.status, body as ApiErrorBody);
  return body;
}

export async function getMe() { return authorizedGet('/me'); }
export async function getFlagSkins() { return authorizedGet('/flag-skins'); }
async function authorizedGet(path: string) { const response = await fetch(`${webEnv.apiBaseUrl}${path}`, { headers: { ...(getAccessToken() ? { Authorization: `Bearer ${getAccessToken()}` } : {}) } }); const body = await response.json() as unknown; if (!response.ok) throw new ApiRequestError(response.status, body as ApiErrorBody); return body; }
