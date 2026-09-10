import { describe, expect, it } from 'vitest';
import { normalizeTourApiSpot } from './normalizer.js';

const validList = {
  contentid: '125266',
  contenttypeid: '12',
  title: '  Quiet place  ',
  mapy: '34.771',
  mapx: '127.081',
  areacode: '36',
  sigungucode: '2',
  addr1: '전라남도',
  addr2: '',
  firstimage: '',
};

describe('normalizeTourApiSpot', () => {
  it('normalizes numeric strings, empty optionals, and missing images', () => {
    const result = normalizeTourApiSpot({ list: validList });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).toMatchObject({
      contentId: 125266,
      contentTypeId: 12,
      title: 'Quiet place',
      latitude: 34.771,
      longitude: 127.081,
      areaCode: 36,
      sigunguCode: 2,
      address: '전라남도',
      imageUrl: null,
      thumbnailUrl: null,
      eventStartDate: null,
    });
  });

  it.each([
    [{ ...validList, mapy: undefined }, 'MISSING_OR_ZERO_COORDINATES'],
    [{ ...validList, mapx: '' }, 'MISSING_OR_ZERO_COORDINATES'],
    [{ ...validList, mapy: '0' }, 'MISSING_OR_ZERO_COORDINATES'],
    [{ ...validList, mapx: 0 }, 'MISSING_OR_ZERO_COORDINATES'],
    [{ ...validList, mapy: '32.99' }, 'COORDINATES_OUTSIDE_KOREA_RANGE'],
    [{ ...validList, mapx: '132.01' }, 'COORDINATES_OUTSIDE_KOREA_RANGE'],
    [{ ...validList, mapy: 'not-a-number' }, 'MISSING_OR_ZERO_COORDINATES'],
  ])('rejects invalid coordinates without fabricating a location', (list, reason) => {
    expect(normalizeTourApiSpot({ list })).toEqual({ ok: false, reason });
  });

  it('normalizes event dates and counts detail/image metadata', () => {
    const result = normalizeTourApiSpot({
      list: { ...validList, contenttypeid: '15' },
      intro: { eventstartdate: '20260825', eventenddate: '2026-08-27', sponsor1: 'Local' },
      common: { overview: 'A', homepage: 'B', tel: 'C', title: 'Festival' },
      images: [{ originimgurl: 'https://example.com/1.jpg' }, { originimgurl: '' }],
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.eventStartDate).toBe('2026-08-25');
    expect(result.value.eventEndDate).toBe('2026-08-27');
    expect(result.value.additionalImageCount).toBe(1);
    expect(result.value.detailFieldCount).toBeGreaterThanOrEqual(5);
  });
});
