import { create } from 'zustand';

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
  setActiveTab: (tab: AppTab) => void;
  setDiscoveryView: (view: DiscoveryView) => void;
  setDiscoveryFilters: (filters: Partial<DiscoveryFilters>) => void;
}

export const useUiStore = create<UiState>((set) => ({
  activeTab: 'discovery',
  discoveryView: 'map',
  discoveryFilters: { query: '', grades: [], decliningArea: false },
  setActiveTab: (activeTab) => set({ activeTab }),
  setDiscoveryView: (discoveryView) => set({ discoveryView }),
  setDiscoveryFilters: (filters) =>
    set((state) => ({ discoveryFilters: { ...state.discoveryFilters, ...filters } })),
}));

