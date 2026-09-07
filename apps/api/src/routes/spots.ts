import { Router, type RequestHandler } from 'express';
import { z } from 'zod';
import { toPublicSpot } from '../domain/public-spot.js';
import { RECOMMENDATION_V1 } from '../domain/recommendation.js';
import { SUPPORTED_CONTENT_TYPE_IDS, type SpotGrade } from '../domain/tourism.js';
import { CursorError, decodeCursor, encodeCursor } from '../lib/cursor.js';
import { HttpError } from '../lib/http-error.js';
import type { SpotReadRepository } from '../repositories/spot-read-repository.js';

const gradeValues = ['S', 'A', 'B', 'C'] as const;
const baseLimit = z.coerce.number().int().min(1).max(100).default(20);
const coordinate = z.coerce.number().finite();

const listQuerySchema = z.object({
  minLat: coordinate.min(33).max(39).optional(), minLng: coordinate.min(124).max(132).optional(),
  maxLat: coordinate.min(33).max(39).optional(), maxLng: coordinate.min(124).max(132).optional(),
  contentTypeIds: z.string().optional(), grades: z.string().optional(),
  decliningArea: z.enum(['true', 'false']).optional(), q: z.string().trim().min(1).max(100).optional(),
  areaCode: z.coerce.number().int().nonnegative().optional(),
  sigunguCode: z.coerce.number().int().nonnegative().optional(),
  cursor: z.string().min(1).optional(), limit: baseLimit,
});

function parseCsvNumbers(value: string | undefined): number[] | undefined {
  if (!value) return undefined;
  const parsed = value.split(',').map(Number);
  if (!parsed.length || parsed.some((item) => !Number.isSafeInteger(item))) {
    throw new HttpError(400, 'INVALID_QUERY', '장소 검색 조건을 확인해 주세요.');
  }
  return [...new Set(parsed)];
}

function parseContentTypes(value: string | undefined) {
  const parsed = parseCsvNumbers(value);
  if (!parsed) return undefined;
  if (parsed.some((id) => !SUPPORTED_CONTENT_TYPE_IDS.includes(id as never))) {
    throw new HttpError(400, 'INVALID_QUERY', '지원하지 않는 콘텐츠 유형입니다.');
  }
  return parsed as (typeof SUPPORTED_CONTENT_TYPE_IDS)[number][];
}

function parseGrades(value: string | undefined): SpotGrade[] | undefined {
  if (!value) return undefined;
  const parsed = [...new Set(value.split(','))];
  if (parsed.some((grade) => !gradeValues.includes(grade as SpotGrade))) {
    throw new HttpError(400, 'INVALID_QUERY', '지원하지 않는 장소 등급입니다.');
  }
  return parsed as SpotGrade[];
}

function listCursor(cursor: string): { id: number } {
  return decodeCursor(cursor, (value): value is { id: number } => (
    typeof value === 'object' && value !== null
    && Number.isSafeInteger((value as { id?: unknown }).id)
    && Number((value as { id: number }).id) > 0
  ));
}

function recommendationCursor(cursor: string): { rank: number; id: number } {
  return decodeCursor(cursor, (value): value is { rank: number; id: number } => {
    if (typeof value !== 'object' || value === null) return false;
    const candidate = value as { rank?: unknown; id?: unknown };
    return typeof candidate.rank === 'number' && Number.isFinite(candidate.rank)
      && Number.isSafeInteger(candidate.id) && Number(candidate.id) > 0;
  });
}

function mapCursorError(error: unknown): unknown {
  return error instanceof CursorError
    ? new HttpError(400, 'INVALID_CURSOR', '페이지 커서가 올바르지 않습니다.')
    : error;
}

export function createSpotsRouter(repository: SpotReadRepository, requireAuth: RequestHandler): Router {
  const router = Router();
  router.get('/', async (request, response, next) => {
    try {
      const query = listQuerySchema.safeParse(request.query);
      if (!query.success) throw new HttpError(400, 'INVALID_QUERY', '장소 검색 조건을 확인해 주세요.', { issues: query.error.issues });
      const bbox = [query.data.minLat, query.data.minLng, query.data.maxLat, query.data.maxLng];
      const bboxCount = bbox.filter((value) => value !== undefined).length;
      if (bboxCount !== 0 && bboxCount !== 4) throw new HttpError(400, 'INVALID_BBOX', '지도 영역 좌표 네 개를 모두 입력해 주세요.');
      if (query.data.minLat !== undefined && query.data.maxLat !== undefined
        && (query.data.minLat > query.data.maxLat || query.data.minLng! > query.data.maxLng!)) {
        throw new HttpError(400, 'INVALID_BBOX', '지도 영역의 최소 좌표가 최대 좌표보다 클 수 없습니다.');
      }
      const after = query.data.cursor ? listCursor(query.data.cursor) : undefined;
      const rows = await repository.list({
        ...query.data,
        contentTypeIds: parseContentTypes(query.data.contentTypeIds), grades: parseGrades(query.data.grades),
        decliningArea: query.data.decliningArea === undefined ? undefined : query.data.decliningArea === 'true',
        afterId: after?.id, limit: query.data.limit + 1,
      });
      const hasNext = rows.length > query.data.limit;
      const page = rows.slice(0, query.data.limit);
      response.json({ data: page.map(toPublicSpot), meta: {
        nextCursor: hasNext && page.at(-1) ? encodeCursor({ id: page.at(-1)!.id }) : null, hasNext,
      } });
    } catch (error) { next(mapCursorError(error)); }
  });

  router.get('/recommendations', async (request, response, next) => {
    try {
      const query = z.object({ cursor: z.string().min(1).optional(), limit: baseLimit }).safeParse(request.query);
      if (!query.success) throw new HttpError(400, 'INVALID_QUERY', '추천 검색 조건을 확인해 주세요.');
      const rows = await repository.recommendations({
        after: query.data.cursor ? recommendationCursor(query.data.cursor) : undefined,
        limit: query.data.limit + 1, policy: RECOMMENDATION_V1,
      });
      const hasNext = rows.length > query.data.limit;
      const page = rows.slice(0, query.data.limit);
      const last = page.at(-1);
      response.json({ data: page.map(toPublicSpot), meta: {
        nextCursor: hasNext && last ? encodeCursor({ rank: last.recommendationRank, id: last.id }) : null,
        hasNext, policyVersion: RECOMMENDATION_V1.version,
      } });
    } catch (error) { next(mapCursorError(error)); }
  });

  router.get('/nearby', requireAuth, async (request, response, next) => {
    try {
      const query = z.object({
        lat: coordinate.min(33).max(39), lng: coordinate.min(124).max(132),
        radiusM: z.coerce.number().int().min(100).max(10_000).default(2_000),
        limit: z.coerce.number().int().min(1).max(50).default(20),
      }).safeParse(request.query);
      if (!query.success) throw new HttpError(400, 'INVALID_QUERY', '현재 위치 검색 조건을 확인해 주세요.', { issues: query.error.issues });
      const rows = await repository.nearby(query.data);
      response.json({ data: rows.map((row) => ({ ...toPublicSpot(row), distanceM: Math.round(row.distanceM * 10) / 10 })) });
    } catch (error) { next(error); }
  });

  router.get('/:spotId', async (request, response, next) => {
    try {
      const spotId = z.coerce.number().int().positive().safeParse(request.params.spotId);
      if (!spotId.success) throw new HttpError(400, 'INVALID_SPOT_ID', '장소 ID 형식이 올바르지 않습니다.');
      const spot = await repository.findVisibleById(spotId.data);
      if (!spot) throw new HttpError(404, 'SPOT_NOT_FOUND', '장소를 찾을 수 없습니다.');
      response.json({ data: toPublicSpot(spot) });
    } catch (error) { next(error); }
  });
  return router;
}
