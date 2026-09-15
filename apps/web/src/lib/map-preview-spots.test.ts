import { describe, expect, it } from 'vitest';
import type { Spot } from '../types/spot';
import { groupSpotsByLocation } from './map-preview-spots';

const spot = (id: number, lat: number, lng: number): Spot => ({
  id,
  title: `Spot ${id}`,
  address: 'Seoul',
  contentTypeId: 12,
  isDecliningArea: false,
  imageUrl: null,
  status: 'ACTIVE',
  location: { lat, lng },
});

describe('map preview spot grouping', () => {
  it('groups valid spots that share the same rounded coordinates', () => {
    const groups = groupSpotsByLocation([
      spot(1, 37.5800001, 126.9800001),
      spot(2, 37.5800002, 126.9800002),
      spot(3, 37.581, 126.981),
      spot(4, Number.NaN, 126.982),
    ]);

    expect(groups.map((group) => group.map(({ id }) => id))).toEqual([[1, 2], [3]]);
  });
});
