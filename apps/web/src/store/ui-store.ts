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

interface UiState {
  activeTab: AppTab;
  discoveryView: DiscoveryView;
  discoveryFilters: DiscoveryFilters;
  selectedSpot: Spot | null;
  setActiveTab: (tab: AppTab) => void;
  setDiscoveryView: (view: DiscoveryView) => void;
  setDiscoveryFilters: (filters: Partial<DiscoveryFilters>) => void;
  setSelectedSpot: (spot: Spot | null) => void;
}

export const useUiStore = create<UiState>((set) => ({
  activeTab: 'discovery',
  discoveryView: 'map',
  discoveryFilters: { query: '', grades: [], decliningArea: false },
  selectedSpot: null,
  setActiveTab: (activeTab) => set({ activeTab }),
  setDiscoveryView: (discoveryView) => set({ discoveryView }),
  setDiscoveryFilters: (filters) =>
    set((state) => ({ discoveryFilters: { ...state.discoveryFilters, ...filters } })),
  setSelectedSpot: (selectedSpot) => set({ selectedSpot }),
}));

