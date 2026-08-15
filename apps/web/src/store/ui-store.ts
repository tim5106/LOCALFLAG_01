import { create } from 'zustand';

export type AppTab = 'discovery' | 'check-in' | 'my-flag';

interface UiState {
  activeTab: AppTab;
  setActiveTab: (tab: AppTab) => void;
}

export const useUiStore = create<UiState>((set) => ({
  activeTab: 'discovery',
  setActiveTab: (activeTab) => set({ activeTab }),
}));

