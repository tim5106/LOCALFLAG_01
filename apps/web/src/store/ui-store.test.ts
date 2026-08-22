import { describe, expect, it } from 'vitest';
import { useUiStore } from './ui-store';

describe('ui store', () => {
  it('shares filters, viewport and selected spot state', () => {
    const store = useUiStore.getState();
    store.setDiscoveryFilters({ grades: ['A'], decliningArea: true });
    store.setMapViewport({ minLat: 34, minLng: 126, maxLat: 38, maxLng: 130 });
    expect(useUiStore.getState().discoveryFilters.grades).toEqual(['A']);
    expect(useUiStore.getState().mapViewport?.maxLng).toBe(130);
    store.setDiscoveryFilters({ grades: [], decliningArea: false });
    store.setMapViewport({ minLat: 33, minLng: 124, maxLat: 39, maxLng: 132 });
  });
});
