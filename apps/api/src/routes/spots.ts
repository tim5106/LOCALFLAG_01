import { Router } from 'express';
import { z } from 'zod';
import { prototypeSpots } from '../domain/spots.js';
import { HttpError } from '../lib/http-error.js';

const listQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  grades: z.string().optional(),
  decliningArea: z.enum(['true', 'false']).optional(),
});

export const spotsRouter = Router();

spotsRouter.get('/', (request, response) => {
  const query = listQuerySchema.safeParse(request.query);
  if (!query.success) {
    throw new HttpError(400, 'INVALID_QUERY', '장소 검색 조건을 확인해 주세요.', {
      issues: query.error.issues,
    });
  }

  const gradeFilter = query.data.grades?.split(',');
  const spots = prototypeSpots
    .filter((spot) => !gradeFilter || gradeFilter.includes(spot.grade))
    .filter((spot) => (
      query.data.decliningArea === undefined
      || spot.isDecliningArea === (query.data.decliningArea === 'true')
    ))
    .slice(0, query.data.limit);

  response.json({
    data: spots,
    meta: { nextCursor: null, hasNext: false, source: 'prototype' },
  });
});

spotsRouter.get('/:spotId', (request, response) => {
  const spotId = z.coerce.number().int().safeParse(request.params.spotId);
  if (!spotId.success) {
    throw new HttpError(400, 'INVALID_SPOT_ID', '장소 ID 형식이 올바르지 않습니다.');
  }

  const spot = prototypeSpots.find((item) => item.id === spotId.data);
  if (!spot) {
    throw new HttpError(404, 'SPOT_NOT_FOUND', '장소를 찾을 수 없습니다.');
  }

  response.json({ data: spot });
});

