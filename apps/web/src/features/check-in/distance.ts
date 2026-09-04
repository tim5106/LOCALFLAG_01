export const CHECK_IN_RADIUS_METERS = 100;

const toRadians = (degrees: number) => degrees * Math.PI / 180;

export function calculateDistanceMeters(userLat: number, userLng: number, spotLat: number, spotLng: number): number {
  if (![userLat, userLng, spotLat, spotLng].every(Number.isFinite)) return Number.POSITIVE_INFINITY;
  const earthRadius = 6_371_000;
  const latitudeDelta = toRadians(spotLat - userLat);
  const longitudeDelta = toRadians(spotLng - userLng);
  const a = Math.sin(latitudeDelta / 2) ** 2 + Math.cos(toRadians(userLat)) * Math.cos(toRadians(spotLat)) * Math.sin(longitudeDelta / 2) ** 2;
  return earthRadius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function formatDistance(meters: number): string {
  if (!Number.isFinite(meters)) return '거리 정보 없음';
  return meters >= 1000 ? `${(meters / 1000).toFixed(1)}km` : `${Math.round(meters)}m`;
}
