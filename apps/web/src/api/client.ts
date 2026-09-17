import { webEnv } from '../config/env';
import type { ApiErrorBody, ApiListResponse } from '../types/api';
import { ApiRequestError, CheckInApiError } from '../types/api';
import type { Spot } from '../types/spot';
import { getAccessToken } from '../features/auth/auth';
import { buildCheckInPayload, buildPrecheckPayload, type CheckInPosition, type CheckInResponse, type CheckInResult, type PrecheckResult } from '../features/check-in/api-types';

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
export interface MeProfile { id: string; nickname?: string | null; pointBalance?: number; equippedFlagSkinId?: string | null; }
export interface FlagSkin {
  id: string;
  name: string;
  description: string;
  price: number;
  assetUrl: string;
  owned: boolean;
  equipped: boolean;
}
export interface MyFlagVisit { spotId: number; spotTitle: string; location: Spot['location']; visitedAt: string; rewardPoints: number; status: 'SUCCESS'; }
export interface MyFlagMap { equippedFlagSkinId: string | null; visits: MyFlagVisit[]; }

export const prototypeSpots: Spot[] = [
  { id: 100001, title: '북촌 쪽염색 공방 화연당', address: '종로구 계동길', contentTypeId: 12, grade: 'A', isDecliningArea: false, estimatedReward: 150, imageUrl: null, status: 'ACTIVE', geometryType: 'POINT', checkInEnabled: true, location: { lat: 37.5827, lng: 126.9865 } },
  { id: 100002, title: '국립기상박물관', address: '종로구 송월길', contentTypeId: 14, grade: 'S', isDecliningArea: false, estimatedReward: 200, imageUrl: null, status: 'ACTIVE', geometryType: 'POINT', checkInEnabled: true, location: { lat: 37.5712, lng: 126.9667 } },
  { id: 100003, title: '윤동주문학관', address: '종로구 창의문로', contentTypeId: 14, grade: 'B', isDecliningArea: false, estimatedReward: 120, imageUrl: null, status: 'ACTIVE', geometryType: 'POINT', checkInEnabled: true, location: { lat: 37.5921, lng: 126.9671 } },
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

function fallbackCursorId(cursor: string | undefined): number | undefined {
  if (!cursor) return undefined;
  const numeric = Number(cursor);
  if (Number.isSafeInteger(numeric)) return numeric;
  try {
    const normalized = cursor.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
    const decoded = JSON.parse(atob(padded)) as { id?: unknown };
    return Number.isSafeInteger(decoded.id) ? Number(decoded.id) : undefined;
  } catch { return undefined; }
}

function fallbackSpots(query: SpotQuery): ApiListResponse<Spot> {
  const grades = query.grades ?? [];
  const regionMatches = (!query.areaCode || query.areaCode === '1') && (!query.sigunguCode || query.sigunguCode === '23');
  const matchesAllFilters = regionMatches ? prototypeSpots
    .filter((spot) => !grades.length || (spot.grade !== undefined && grades.includes(spot.grade)))
    .filter((spot) => query.decliningArea === undefined || spot.isDecliningArea === query.decliningArea)
    .filter((spot) => !query.q || `${spot.title} ${spot.address}`.toLocaleLowerCase().includes(query.q.toLocaleLowerCase()))
    .filter((spot) => query.minLat === undefined || spot.location.lat >= query.minLat)
    .filter((spot) => query.maxLat === undefined || spot.location.lat <= query.maxLat)
    .filter((spot) => query.minLng === undefined || spot.location.lng >= query.minLng)
    .filter((spot) => query.maxLng === undefined || spot.location.lng <= query.maxLng)
    : [];
  const afterId = fallbackCursorId(query.cursor);
  const cursorFiltered = afterId === undefined ? matchesAllFilters : matchesAllFilters.filter((spot) => spot.id > afterId);
  const limit = query.limit ?? 20;
  const page = cursorFiltered.slice(0, limit);
  const hasNext = cursorFiltered.length > limit;
  return {
    data: page,
    meta: { nextCursor: hasNext && page.at(-1) ? String(page.at(-1)!.id) : null, hasNext, total: matchesAllFilters.length, source: 'fallback' },
  };
}

export type PositionInput = CheckInPosition;

export async function precheckSpot(spotId: number | string, position: PositionInput): Promise<CheckInResponse<PrecheckResult>> {
  const response = await fetch(`${webEnv.apiBaseUrl}/check-ins/precheck`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(getAccessToken() ? { Authorization: `Bearer ${getAccessToken()}` } : {}) },
    body: JSON.stringify(buildPrecheckPayload(spotId, position)),
  });

  const body = (await response.json()) as unknown;
  if (!response.ok) {
    throw new CheckInApiError(response.status, body as ApiErrorBody);
  }

  return body as CheckInResponse<PrecheckResult>;
}

export async function createCheckIn(spotId: number | string, position: PositionInput): Promise<CheckInResponse<CheckInResult>> {
  const response = await fetch(`${webEnv.apiBaseUrl}/check-ins`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Idempotency-Key': crypto.randomUUID(), ...(getAccessToken() ? { Authorization: `Bearer ${getAccessToken()}` } : {}) }, body: JSON.stringify(buildCheckInPayload(spotId, position)) });
  const body = await response.json() as unknown;
  if (!response.ok) throw new CheckInApiError(response.status, body as ApiErrorBody);
  return body as CheckInResponse<CheckInResult>;
}

export async function getMe(): Promise<{ data: MeProfile }> { return authorizedGet('/me') as Promise<{ data: MeProfile }>; }
export async function getPointLedger() { return authorizedGet('/me/point-ledger'); }
export async function getFlagSkins(): Promise<{ data: FlagSkin[] }> { return authorizedGet('/flag-skins') as Promise<{ data: FlagSkin[] }>; }
export async function getMyMap(): Promise<{ data: MyFlagMap }> { return authorizedGet('/me/map') as Promise<{ data: MyFlagMap }>; }
export async function purchaseFlagSkin(skinId: string) {
  return authorizedRequest(`/flag-skins/${encodeURIComponent(skinId)}/purchase`, { method: 'POST', headers: { 'Idempotency-Key': crypto.randomUUID() } });
}

export async function getNearbySpots(lat: number, lng: number, radiusM = 2_000, limit = 20) {
  return authorizedGet(`/spots/nearby?lat=${encodeURIComponent(lat)}&lng=${encodeURIComponent(lng)}&radiusM=${radiusM}&limit=${limit}`) as Promise<ApiListResponse<Spot & { distanceM: number }>>;
}
export async function equipFlagSkin(skinId: string) {
  return authorizedRequest('/me/equipped-flag-skin', { method: 'PUT', body: JSON.stringify({ skinId }) });
}
async function authorizedGet(path: string) { const response = await fetch(`${webEnv.apiBaseUrl}${path}`, { headers: { ...(getAccessToken() ? { Authorization: `Bearer ${getAccessToken()}` } : {}) } }); const body = await response.json() as unknown; if (!response.ok) throw new ApiRequestError(response.status, body as ApiErrorBody); return body; }
async function authorizedRequest(path: string, init: RequestInit = {}) {
  const accessToken = getAccessToken();
  const response = await fetch(`${webEnv.apiBaseUrl}${path}`, { ...init, headers: { 'Content-Type': 'application/json', ...(init.headers ?? {}), ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}) } });
  const body = await response.json() as unknown;
  if (!response.ok) throw new ApiRequestError(response.status, body as ApiErrorBody);
  return body;
}
