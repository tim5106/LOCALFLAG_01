import { Router } from 'express';
import { z } from 'zod';
import { distanceInMeters } from '../domain/geo.js';
import { prototypeSpots } from '../domain/spots.js';
import { HttpError } from '../lib/http-error.js';
import { requireAuth } from '../middleware/require-auth.js';

const positionSchema = z.object({
  lat: z.number().min(33).max(39),
  lng: z.number().min(124).max(132),
  accuracyM: z.number().positive().max(5_000),
  capturedAt: z.iso.datetime(),
});

const precheckSchema = z.object({
  spotId: z.number().int().positive(),
  position: positionSchema,
});

export const checkInsRouter = Router();

checkInsRouter.use(requireAuth);

checkInsRouter.post('/precheck', (request, response) => {
  const body = precheckSchema.safeParse(request.body);
  if (!body.success) {
    throw new HttpError(400, 'INVALID_BODY', '인증 위치 정보 형식을 확인해 주세요.', {
      issues: body.error.issues,
    });
  }

  const spot = prototypeSpots.find((item) => item.id === body.data.spotId);
  if (!spot || spot.status !== 'ACTIVE') {
    throw new HttpError(404, 'SPOT_NOT_FOUND', '인증 가능한 장소를 찾을 수 없습니다.');
  }

  const distanceM = distanceInMeters(body.data.position, spot.location);
  const capturedAgeSeconds = Math.abs(Date.now() - Date.parse(body.data.position.capturedAt)) / 1_000;
  const reasons: string[] = [];

  if (body.data.position.accuracyM > 50) reasons.push('GPS_INACCURATE');
  if (capturedAgeSeconds > 120) reasons.push('POSITION_STALE');
  if (distanceM > 100) reasons.push('OUT_OF_RANGE');

  response.json({
    data: {
      eligible: reasons.length === 0,
      spotId: spot.id,
      distanceM: Math.round(distanceM * 10) / 10,
      allowedRadiusM: 100,
      accuracyM: body.data.position.accuracyM,
      reasons,
      estimatedReward: reasons.length === 0 ? spot.estimatedReward : 0,
    },
  });
});

checkInsRouter.post('/', (request, _response) => {
  if (!request.header('idempotency-key')) {
    throw new HttpError(400, 'IDEMPOTENCY_KEY_REQUIRED', 'Idempotency-Key 헤더가 필요합니다.');
  }

  throw new HttpError(
    501,
    'CHECK_IN_PERSISTENCE_NOT_IMPLEMENTED',
    'Supabase 포인트 원장 연결 후 최종 인증을 활성화합니다.',
  );
});

