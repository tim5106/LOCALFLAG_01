import { describe, expect, it } from 'vitest';
import { createGeoJsonCircle } from './maptiler-circle';

describe('createGeoJsonCircle', () => {
  it('creates a valid closed GeoJSON polygon with the requested number of points', () => {
    const center: [number, number] = [126.98, 37.58];
    const circle = createGeoJsonCircle(center, 30, 32);

    expect(circle.type).toBe('Feature');
    expect(circle.geometry.type).toBe('Polygon');
    expect(circle.geometry.coordinates).toHaveLength(1);

    const ring = circle.geometry.coordinates[0]!;
    // 32 points + 1 closing point = 33
    expect(ring).toHaveLength(33);
    // The first and last coordinate must be identical
    expect(ring[0]).toEqual(ring[ring.length - 1]);

    // Check that the points are reasonably close to the center
    for (const point of ring) {
      const lng = point[0]!;
      const lat = point[1]!;
      expect(Math.abs(lng - center[0])).toBeLessThan(0.001);
      expect(Math.abs(lat - center[1])).toBeLessThan(0.001);
    }
  });
});
