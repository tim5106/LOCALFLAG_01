export interface ApiMeta {
  nextCursor: string | null;
  hasNext: boolean;
}

export interface ApiListResponse<T> {
  data: T[];
  meta: ApiMeta;
  source?: 'api' | 'fallback' | 'prototype';
}

export interface ApiErrorBody {
  error?: {
    code?: string;
    message?: string;
    traceId?: string;
    details?: Record<string, unknown>;
  };
}

export class ApiRequestError extends Error {
  readonly status: number;
  readonly code?: string;
  readonly traceId?: string;

  constructor(status: number, body?: ApiErrorBody) {
    super(body?.error?.message ?? '요청을 처리하지 못했습니다.');
    this.name = 'ApiRequestError';
    this.status = status;
    this.code = body?.error?.code;
    this.traceId = body?.error?.traceId;
  }
}
