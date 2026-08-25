import { describe, expect, test } from 'vitest';
import { getMapSpotState, getNearbySpotIds } from './map-spot-state';

describe('getMapSpotState', () => {
  test('marks a nearby POINT place as available for check-in', () => {
    expect(getMapSpotState({
      spot: { id: 17, geometryType: 'POINT', checkInEnabled: true },
      nearbySpotId: 17,
    })).toEqual({
      selected: false,
      visited: false,
      checkInAvailable: true,
      checkInUnavailable: false,
    });
  });

  test('keeps an AREA place visible but prevents check-in', () => {
    expect(getMapSpotState({
      spot: { id: 18, geometryType: 'AREA', checkInEnabled: false },
      selectedSpotId: 18,
      nearbySpotId: 18,
    })).toEqual({
      selected: true,
      visited: false,
      checkInAvailable: false,
      checkInUnavailable: true,
    });
  });

  test('retains the completed indicator for a previously visited place', () => {
    expect(getMapSpotState({
      spot: { id: 19, geometryType: 'POINT', checkInEnabled: true },
      visitedSpotIds: new Set([19]),
    })).toEqual({
      selected: false,
      visited: true,
      checkInAvailable: false,
      checkInUnavailable: false,
    });
  });

  test('finds only places within their 100m check-in radius', () => {
    expect(getNearbySpotIds([
      { id: 20, location: { lat: 37.58, lng: 126.98 }, checkInRadiusM: 100 },
      { id: 21, location: { lat: 37.582, lng: 126.98 }, checkInRadiusM: 100 },
    ], { lat: 37.58, lng: 126.98 })).toEqual(new Set([20]));
  });
});