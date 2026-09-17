import type { Feature, Polygon } from 'geojson';

/**
 * Generates a GeoJSON Polygon Feature representing a circle
 * given a center [lng, lat] coordinate and a radius in meters.
 */
export function createGeoJsonCircle(
  center: [number, number],
  radiusInMeters: number,
  points = 64
): Feature<Polygon> {
  const [lng, lat] = center;
  const km = radiusInMeters / 1000;
  const coordinates: [number, number][] = [];

  const distanceX = km / (111.32 * Math.cos((lat * Math.PI) / 180));
  const distanceY = km / 110.574;

  for (let i = 0; i < points; i++) {
    const theta = (i / points) * (2 * Math.PI);
    const x = distanceX * Math.cos(theta);
    const y = distanceY * Math.sin(theta);
    coordinates.push([lng + x, lat + y]);
  }
  // Close the polygon
  coordinates.push(coordinates[0]!);

  return {
    type: 'Feature',
    geometry: {
      type: 'Polygon',
      coordinates: [coordinates],
    },
    properties: {},
  };
}

