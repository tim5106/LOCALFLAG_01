import { describe, expect, it, vi } from 'vitest';
import { TourApiClient, TourApiError } from './client.js';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
}

describe('TourApiClient', () => {
  it('parses pages and identifies the next page', async () => {
    const fetch = vi.fn<typeof globalThis.fetch>().mockResolvedValue(jsonResponse({
      response: {
        header: { resultCode: '0000', resultMsg: 'OK' },
        body: { items: { item: { contentid: '1' } }, pageNo: 1, numOfRows: 1, totalCount: 2 },
      },
    }));
    const client = new TourApiClient({ baseUrl: 'https://example.com', serviceKey: 'secret', fetch });
    await expect(client.areaBasedList(1, 1)).resolves.toMatchObject({
      items: [{ contentid: '1' }], hasNext: true, totalCount: 2,
    });
    const requestedUrl = String(fetch.mock.calls[0]?.[0]);
    expect(requestedUrl).toContain('/areaBasedList2?');
    expect(requestedUrl).toContain('serviceKey=secret');
  });

  it('supports empty result sets', async () => {
    const fetch = vi.fn<typeof globalThis.fetch>().mockResolvedValue(jsonResponse({
      response: { header: { resultCode: '0000' }, body: { items: '', totalCount: 0 } },
    }));
    const client = new TourApiClient({ baseUrl: 'https://example.com', serviceKey: 'secret', fetch });
    await expect(client.detailImage(1)).resolves.toEqual([]);
  });

  it('rejects upstream result failures and malformed JSON', async () => {
    const upstreamFailure = vi.fn<typeof globalThis.fetch>().mockResolvedValue(jsonResponse({
      response: { header: { resultCode: '22', resultMsg: 'LIMITED_NUMBER_OF_SERVICE_REQUESTS_EXCEEDS_ERROR' } },
    }));
    await expect(new TourApiClient({
      baseUrl: 'https://example.com', serviceKey: 'secret', fetch: upstreamFailure,
    }).areaBasedList()).rejects.toMatchObject({ code: '22', retryable: true });

    const malformed = vi.fn<typeof globalThis.fetch>().mockResolvedValue(new Response('{', { status: 200 }));
    await expect(new TourApiClient({
      baseUrl: 'https://example.com', serviceKey: 'secret', fetch: malformed,
    }).areaBasedList()).rejects.toBeInstanceOf(TourApiError);
  });
});
