import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getSpots, toQueryString } from './client';

describe('spot API client', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('serializes filters and viewport parameters', () => {
    const query = new URLSearchParams(toQueryString({ grades: ['S', 'A'], decliningArea: true, minLat: 35.1, maxLng: 129.2, cursor: 'next' }));
    expect(query.get('grades')).toBe('S,A');
    expect(query.get('decliningArea')).toBe('true');
    expect(query.get('minLat')).toBe('35.1');
    expect(query.get('maxLng')).toBe('129.2');
    expect(query.get('cursor')).toBe('next');
  });

  it('returns API data and metadata', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ data: [{ id: 1 }], meta: { nextCursor: 'next', hasNext: true } }), { status: 200 })));
    const result = await getSpots({ limit: 5 });
    expect(result.meta.hasNext).toBe(true);
    expect(result.data[0]?.id).toBe(1);
  });

  it('uses filtered fallback data when the API is unavailable', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('network')));
    const result = await getSpots({ grades: ['S'] });
    expect(result.meta.source).toBe('fallback');
    expect(result.data.every((spot) => spot.grade === 'S')).toBe(true);
  });

  it('throws a typed error for client errors', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: { code: 'INVALID_QUERY', message: 'bad query', traceId: 'trace-1' } }), { status: 400 })));
    await expect(getSpots()).rejects.toMatchObject({ status: 400, code: 'INVALID_QUERY', traceId: 'trace-1' });
  });
});
