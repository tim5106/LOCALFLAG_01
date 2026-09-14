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

  it('manages profile open/close and my-flag navigation', () => {
    const store = useUiStore.getState();
    store.openProfile('discovery');
    expect(useUiStore.getState().profileOpen).toBe(true);
    expect(useUiStore.getState().profileOrigin).toBe('discovery');

    store.closeProfile();
    expect(useUiStore.getState().profileOpen).toBe(false);

    store.openProfile('my-flag');
    expect(useUiStore.getState().profileOrigin).toBe('my-flag');

    store.navigateToMyFlagSection('skins');
    expect(useUiStore.getState().activeTab).toBe('my-flag');
    expect(useUiStore.getState().profileOpen).toBe(false);
    expect(useUiStore.getState().myFlagTarget).toBe('skins');

    store.clearMyFlagTarget();
    expect(useUiStore.getState().myFlagTarget).toBeNull();

    store.openProfile('discovery');
    store.setActiveTab('check-in');
    expect(useUiStore.getState().profileOpen).toBe(false);
  });
});
