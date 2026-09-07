import { env } from '../config/env.js';
import type { SpotRecord } from '../domain/spots.js';

const SEOUL_AREA_CODE = '1';
const JONGNO_SIGUNGU_CODE = '23';
const ALLOWED_CONTENT_TYPES = new Set([12, 14, 15, 28, 32]);

interface TourItem { contentid?: string; title?: string; contenttypeid?: string; mapy?: string; mapx?: string; addr1?: string; firstimage?: string; }
interface TourResponse { response?: { header?: { resultCode?: string; resultMsg?: string }; body?: { items?: { item?: TourItem | TourItem[] } } }; }

export async function fetchJongnoSpots(signal?: AbortSignal): Promise<SpotRecord[]> {
  if (!env.TOUR_API_SERVICE_KEY) throw new Error('TOUR_API_SERVICE_KEY is not configured');
  const results = await Promise.all([...ALLOWED_CONTENT_TYPES].map((contentTypeId) => fetchContentType(contentTypeId, env.TOUR_API_SERVICE_KEY!, signal)));
  return results.flat();
}

async function fetchContentType(contentTypeId: number, serviceKey: string, signal?: AbortSignal): Promise<SpotRecord[]> {
  const url = new URL(`${env.TOUR_API_BASE_URL}/areaBasedList2`);
  url.searchParams.set('serviceKey', normalizeServiceKey(serviceKey));
  url.searchParams.set('MobileOS', 'ETC');
  url.searchParams.set('MobileApp', 'LOCALFLAG');
  url.searchParams.set('_type', 'json');
  url.searchParams.set('areaCode', SEOUL_AREA_CODE);
  url.searchParams.set('sigunguCode', JONGNO_SIGUNGU_CODE);
  url.searchParams.set('contentTypeId', String(contentTypeId));
  url.searchParams.set('numOfRows', '100');
  url.searchParams.set('pageNo', '1');

  const diagnosticUrl = new URL(url);
  diagnosticUrl.searchParams.delete('serviceKey');
  console.info(`[tour-api] GET ${diagnosticUrl.toString()}`);
  const response = await fetch(url, { signal });
  const text = await response.text();
  let payload: TourResponse;
  try { payload = JSON.parse(text) as TourResponse; } catch { payload = {}; }
  const resultCode = payload.response?.header?.resultCode ?? 'unknown';
  const resultMsg = payload.response?.header?.resultMsg ?? 'unknown';
  console.info(`[tour-api] HTTP ${response.status}; resultCode=${resultCode}; resultMsg=${resultMsg}`);
  if (!response.ok || (resultCode !== '0000' && resultCode !== 'unknown')) throw new Error(`TourAPI failure: HTTP ${response.status}, resultCode=${resultCode}, resultMsg=${resultMsg}`);
  if (!payload.response?.body) throw new Error(`TourAPI returned no body: resultCode=${resultCode}, resultMsg=${resultMsg}`);
  const rawItems = payload.response?.body?.items?.item ?? [];
  const items = Array.isArray(rawItems) ? rawItems : [rawItems];
  return items.map(toSpot).filter((spot): spot is SpotRecord => spot !== null);
}

function normalizeServiceKey(value: string): string {
  try {
    return /%[0-9a-f]{2}/i.test(value) ? decodeURIComponent(value) : value;
  } catch {
    return value;
  }
}

function toSpot(item: TourItem): SpotRecord | null {
  const id = Number(item.contentid);
  const contentTypeId = Number(item.contenttypeid);
  const lat = Number(item.mapy);
  const lng = Number(item.mapx);
  if (!Number.isInteger(id) || !item.title || !ALLOWED_CONTENT_TYPES.has(contentTypeId) || !Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return {
    id, title: item.title, address: item.addr1 ?? '', contentTypeId,
    isDecliningArea: false,
    imageUrl: item.firstimage || null, status: 'ACTIVE', location: { lat, lng },
    rewardEligible: [12, 14, 28].includes(contentTypeId), seasonPin: contentTypeId === 15, infoOnly: contentTypeId === 32,
  };
}
