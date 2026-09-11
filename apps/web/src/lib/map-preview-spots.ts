import type { Spot } from '../types/spot';

export function groupSpotsByLocation(spots: Spot[]): Spot[][] {
  const groups = new Map<string, Spot[]>();

  spots
    .filter((spot) => Number.isFinite(spot.location.lat) && Number.isFinite(spot.location.lng))
    .forEach((spot) => {
      const key = `${spot.location.lat.toFixed(6)}:${spot.location.lng.toFixed(6)}`;
      groups.set(key, [...(groups.get(key) ?? []), spot]);
    });

  return [...groups.values()];
}
