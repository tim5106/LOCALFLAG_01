import { create } from 'zustand';
import type { Spot } from '../types/spot';

export type AppTab = 'discovery' | 'check-in' | 'my-flag';
export type DiscoveryView = 'map' | 'list';

export interface DiscoveryFilters {
  query: string;
  grades: Array<'S' | 'A' | 'B' | 'C'>;
  decliningArea: boolean;
  areaCode?: string;
  sigunguCode?: string;
}
export interface MapViewport { minLat: number; minLng: number; maxLat: number; maxLng: number; }

interface UiState {
  activeTab: AppTab;
  discoveryView: DiscoveryView;
  discoveryFilters: DiscoveryFilters;
  selectedSpot: Spot | null;
  mapViewport: MapViewport | null;
  profileOpen: boolean;
  profileOrigin: 'discovery' | 'my-flag' | 'check-in';
  myFlagTarget: 'photolog' | 'skins' | null;
  setActiveTab: (tab: AppTab) => void;
  setDiscoveryView: (view: DiscoveryView) => void;
  setDiscoveryFilters: (filters: Partial<DiscoveryFilters>) => void;
  setSelectedSpot: (spot: Spot | null) => void;
  setMapViewport: (viewport: MapViewport) => void;
  openProfile: (origin: 'discovery' | 'my-flag' | 'check-in') => void;
  closeProfile: () => void;
  navigateToMyFlagSection: (target: 'photolog' | 'skins') => void;
  clearMyFlagTarget: () => void;
}

export const useUiStore = create<UiState>((set) => ({
  activeTab: 'discovery',
  discoveryView: 'map',
  discoveryFilters: { query: '', grades: [], decliningArea: false },
  selectedSpot: null,
  mapViewport: null,
  profileOpen: false,
  profileOrigin: 'discovery',
  myFlagTarget: null,
  setActiveTab: (activeTab) => set({ activeTab, profileOpen: false }),
  setDiscoveryView: (discoveryView) => set({ discoveryView }),
  setDiscoveryFilters: (filters) =>
    set((state) => ({ discoveryFilters: { ...state.discoveryFilters, ...filters } })),
  setSelectedSpot: (selectedSpot) => set({ selectedSpot }),
  setMapViewport: (mapViewport) => set({ mapViewport }),
  openProfile: (profileOrigin) => set({ profileOpen: true, profileOrigin }),
  closeProfile: () => set({ profileOpen: false }),
  navigateToMyFlagSection: (myFlagTarget) =>
    set({ activeTab: 'my-flag', profileOpen: false, myFlagTarget }),
  clearMyFlagTarget: () => set({ myFlagTarget: null }),
}));

