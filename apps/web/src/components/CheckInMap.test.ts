import { describe, expect, it } from 'vitest';
import { canSelectSpot, getCheckInCircleOptions, getSpotClickResult, getSpotCoordinates, getSpotMarkerStatus } from './CheckInMap';
import type { Spot } from '../types/spot';

const spot = (extra: Partial<Spot> = {}): Spot => ({ id: 1, title: 'Test spot', address: 'Seoul', contentTypeId: 12, isDecliningArea: false, imageUrl: null, status: 'ACTIVE', location: { lat: 37.58, lng: 126.98 }, ...extra });

describe('check-in marker rules', () => {
  it('reads nested and TourAPI coordinate shapes', () => {
    expect(getSpotCoordinates(spot())).toEqual({ lat: 37.58, lng: 126.98 });
    expect(getSpotCoordinates({ ...spot(), location: undefined as never, mapy: '37.581', mapx: '126.981' } as Spot & { mapy: string; mapx: string })).toEqual({ lat: 37.581, lng: 126.981 });
  });

  it('keeps completed and pending states ahead of distance', () => {
    expect(getSpotMarkerStatus(spot({ checkInCompleted: true }), 0)).toBe('COMPLETED');
    expect(getSpotMarkerStatus(spot({ reviewStatus: 'PENDING' }), 0)).toBe('PENDING');
    expect(getSpotMarkerStatus(spot(), 20, 30)).toBe('AVAILABLE');
    expect(getSpotMarkerStatus(spot(), 31, 30)).toBe('LOCKED');
  });

  it('does not make AREA or EXCLUDE spots available', () => {
    expect(getSpotMarkerStatus(spot({ geometryType: 'AREA' }), 0)).toBe('LOCKED');
    expect(getSpotMarkerStatus(spot({ geometryType: 'EXCLUDE' }), 0)).toBe('LOCKED');
  });

  it('uses a 30m circle by default and preserves the configured spot radius', () => {
    const center = { lat: 37.58, lng: 126.98 };
    expect(getCheckInCircleOptions(center, 30)).toMatchObject({ center, radius: 30, fillOpacity: .15, strokeWeight: 2 });
    expect(getCheckInCircleOptions(center, 45).radius).toBe(45);
  });

  it('changes availability as the user crosses the spot radius', () => {
    const nearby = spot({ checkInRadiusM: 30 });
    const inside = { lat: 37.58, lng: 126.9802 };
    const outside = { lat: 37.58, lng: 126.981 };
    expect(canSelectSpot(nearby, inside)).toBe(true);
    expect(canSelectSpot(nearby, outside)).toBe(false);
    expect(getSpotClickResult(nearby, outside)).toBe('OUT_OF_RANGE');
  });

  it('allows selection only for AVAILABLE spots', () => {
    const position = { lat: 37.58, lng: 126.98 };
    expect(getSpotClickResult(spot(), position)).toBe('SELECT');
    expect(getSpotClickResult(spot({ checkInEnabled: false }), position)).toBe('OUT_OF_RANGE');
    expect(getSpotClickResult(spot({ checkInCompleted: true }), position)).toBe('OUT_OF_RANGE');
  });
});
