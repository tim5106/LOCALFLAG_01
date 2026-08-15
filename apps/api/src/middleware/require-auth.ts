import type { RequestHandler } from 'express';
import { env } from '../config/env.js';
import { HttpError } from '../lib/http-error.js';
import { getSupabaseAuthClient } from '../lib/supabase.js';

export const requireAuth: RequestHandler = async (request, _response, next) => {
  try {
    if (env.NODE_ENV !== 'production' && env.DEV_AUTH_BYPASS) {
      request.userId = '00000000-0000-0000-0000-000000000001';
      next();
      return;
    }

    const accessToken = request.header('authorization')?.replace(/^Bearer\s+/i, '');
    if (!accessToken) {
      throw new HttpError(401, 'UNAUTHORIZED', '로그인이 필요합니다.');
    }

    const supabase = getSupabaseAuthClient();
    if (!supabase) {
      throw new HttpError(503, 'AUTH_NOT_CONFIGURED', '인증 서비스가 아직 설정되지 않았습니다.');
    }

    const { data, error } = await supabase.auth.getUser(accessToken);
    if (error || !data.user) {
      throw new HttpError(401, 'INVALID_TOKEN', '로그인 정보가 만료되었거나 올바르지 않습니다.');
    }

    request.userId = data.user.id;
    next();
  } catch (error) {
    next(error);
  }
};

