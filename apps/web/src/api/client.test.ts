import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getSpots, precheckSpot, toQueryString } from './client';

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
    expect(result.meta.total).toBe(1);
    expect(result.data.every((spot) => spot.grade === 'S')).toBe(true);
  });

  it('throws a typed error for client errors', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: { code: 'INVALID_QUERY', message: 'bad query', traceId: 'trace-1' } }), { status: 400 })));
    await expect(getSpots()).rejects.toMatchObject({ status: 400, code: 'INVALID_QUERY', traceId: 'trace-1' });
  });

  it('preserves typed 501 errors from precheck', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: { code: 'CHECK_IN_PERSISTENCE_NOT_IMPLEMENTED', message: 'not ready' } }), { status: 501 })));
    await expect(precheckSpot(123, { lat: 37.58, lng: 126.98, accuracyM: 5, capturedAt: new Date().toISOString() })).rejects.toMatchObject({ status: 501, isNotImplemented: true });
  });
  it('keeps the public spots request unauthenticated', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ data: [], meta: { nextCursor: null, hasNext: false, total: 0 } }), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    await getSpots({ areaCode: '1', sigunguCode: '23' });
    expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining('/spots?'), { signal: undefined });
  });

  it('applies region, bounding box, and cursor filters to fallback totals and pages', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('network')));
    const outsideRegion = await getSpots({ areaCode: '32', sigunguCode: '1' });
    expect(outsideRegion).toMatchObject({ data: [], meta: { total: 0 } });
    const outsideBounds = await getSpots({ areaCode: '1', sigunguCode: '23', minLat: 38, minLng: 127, maxLat: 39, maxLng: 128 });
    expect(outsideBounds.meta.total).toBe(0);
    const secondPage = await getSpots({ areaCode: '1', sigunguCode: '23', cursor: '100001', limit: 1 });
    expect(secondPage.meta.total).toBe(3);
    expect(secondPage.data[0]?.id).toBe(100002);
    expect(secondPage.meta.hasNext).toBe(true);
  });
});
