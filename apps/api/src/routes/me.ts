import { Router, type RequestHandler } from 'express';
import { z } from 'zod';
import { CursorError, decodeCursor, encodeCursor } from '../lib/cursor.js';
import { HttpError } from '../lib/http-error.js';
import type { HistoryCursor, UserReadRepository } from '../repositories/user-read-repository.js';

const historyQuery = z.object({
  cursor: z.string().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

function decodeHistoryCursor(cursor: string): HistoryCursor {
  return decodeCursor(cursor, (value): value is HistoryCursor => {
    if (typeof value !== 'object' || value === null) return false;
    const item = value as { createdAt?: unknown; id?: unknown };
    return typeof item.createdAt === 'string' && !Number.isNaN(Date.parse(item.createdAt))
      && typeof item.id === 'string' && z.uuid().safeParse(item.id).success;
  });
}

function userId(request: Express.Request): string {
  if (!request.userId) throw new HttpError(401, 'UNAUTHORIZED', '로그인이 필요합니다.');
  return request.userId;
}

function publicProfile(profile: Awaited<ReturnType<UserReadRepository['findProfile']>>) {
  if (!profile) throw new HttpError(401, 'PROFILE_NOT_FOUND', '사용자 프로필을 찾을 수 없습니다.');
  return {
    id: profile.id,
    nickname: profile.nickname,
    pointBalance: profile.pointBalance,
    equippedFlagSkinId: profile.equippedFlagSkinId,
  };
}

export function createMeRouter(repository: UserReadRepository, requireAuth: RequestHandler): Router {
  const router = Router();
  router.use(requireAuth);

  router.get('/', async (request, response, next) => {
    try { response.json({ data: publicProfile(await repository.findProfile(userId(request))) }); }
    catch (error) { next(error); }
  });

  router.patch('/', async (request, response, next) => {
    try {
      const body = z.object({ nickname: z.string().trim().min(1).max(30) }).strict().safeParse(request.body);
      if (!body.success) throw new HttpError(400, 'INVALID_BODY', '닉네임 형식을 확인해 주세요.', { issues: body.error.issues });
      response.json({ data: publicProfile(await repository.updateNickname(userId(request), body.data.nickname)) });
    } catch (error) { next(error); }
  });

  router.get('/check-ins', async (request, response, next) => {
    try {
      const query = historyQuery.safeParse(request.query);
      if (!query.success) throw new HttpError(400, 'INVALID_QUERY', '방문 기록 검색 조건을 확인해 주세요.');
      const after = query.data.cursor ? decodeHistoryCursor(query.data.cursor) : undefined;
      const rows = await repository.listCheckIns(userId(request), after, query.data.limit + 1);
      const hasNext = rows.length > query.data.limit;
      const page = rows.slice(0, query.data.limit);
      const last = page.at(-1);
      response.json({ data: page, meta: {
        nextCursor: hasNext && last ? encodeCursor({ createdAt: last.createdAt, id: last.checkInId }) : null,
        hasNext,
      } });
    } catch (error) {
      next(error instanceof CursorError ? new HttpError(400, 'INVALID_CURSOR', '페이지 커서가 올바르지 않습니다.') : error);
    }
  });

  router.get('/point-ledger', async (request, response, next) => {
    try {
      const query = historyQuery.safeParse(request.query);
      if (!query.success) throw new HttpError(400, 'INVALID_QUERY', '포인트 기록 검색 조건을 확인해 주세요.');
      const after = query.data.cursor ? decodeHistoryCursor(query.data.cursor) : undefined;
      const rows = await repository.listPointLedger(userId(request), after, query.data.limit + 1);
      const hasNext = rows.length > query.data.limit;
      const page = rows.slice(0, query.data.limit);
      const last = page.at(-1);
      response.json({ data: page, meta: {
        nextCursor: hasNext && last ? encodeCursor({ createdAt: last.createdAt, id: last.transactionId }) : null,
        hasNext,
      } });
    } catch (error) {
      next(error instanceof CursorError ? new HttpError(400, 'INVALID_CURSOR', '페이지 커서가 올바르지 않습니다.') : error);
    }
  });
  return router;
}
