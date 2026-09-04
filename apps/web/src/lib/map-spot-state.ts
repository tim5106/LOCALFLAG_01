import type { Spot } from '../types/spot';

type SpotStateSource = Pick<Spot, 'id' | 'geometryType' | 'checkInEnabled' | 'visited'>;
type NearbySpot = Pick<Spot, 'id' | 'location' | 'checkInRadiusM'>;

export interface MapSpotState {
  selected: boolean;
  visited: boolean;
  checkInAvailable: boolean;
  checkInUnavailable: boolean;
}

export interface MapSpotStateInput {
  spot: SpotStateSource;
  selectedSpotId?: number | null;
  nearbySpotId?: number | null;
  nearbySpotIds?: ReadonlySet<number>;
  visitedSpotIds?: ReadonlySet<number>;
}

export function getMapSpotState({ spot, selectedSpotId = null, nearbySpotId = null, nearbySpotIds = new Set<number>(), visitedSpotIds = new Set<number>() }: MapSpotStateInput): MapSpotState {
  const visited = spot.visited === true || visitedSpotIds.has(spot.id);
  const checkInUnavailable = spot.geometryType === 'AREA' || spot.checkInEnabled === false;
  const nearby = nearbySpotId === spot.id || nearbySpotIds.has(spot.id);
  return { selected: selectedSpotId === spot.id, visited, checkInAvailable: !visited && !checkInUnavailable && nearby, checkInUnavailable };
}

export function getMapSpotStateLabel(state: MapSpotState): string {
  if (state.checkInUnavailable) return '탐색 전용 · 인증 불가';
  if (state.visited) return '방문 완료';
  if (state.checkInAvailable) return '100m 이내 · 인증 가능';
  return '인증 범위 밖';
}

export function getNearbySpotIds(spots: readonly NearbySpot[], userLocation: Spot['location']): Set<number> {
  return new Set(spots.filter((spot) => distanceInMeters(spot.location, userLocation) <= (spot.checkInRadiusM ?? 100)).map((spot) => spot.id));
}

function distanceInMeters(from: Spot['location'], to: Spot['location']): number {
  const earthRadiusM = 6_371_000;
  const latitudeDelta = degreesToRadians(to.lat - from.lat);
  const longitudeDelta = degreesToRadians(to.lng - from.lng);
  const fromLatitude = degreesToRadians(from.lat);
  const toLatitude = degreesToRadians(to.lat);
  const haversine = Math.sin(latitudeDelta / 2) ** 2 + Math.cos(fromLatitude) * Math.cos(toLatitude) * Math.sin(longitudeDelta / 2) ** 2;
  return earthRadiusM * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
}

function degreesToRadians(value: number): number {
  return value * (Math.PI / 180);
}
