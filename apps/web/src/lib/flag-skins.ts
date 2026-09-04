export type FlagSkinUnlock = 'default' | 'purchase' | 'achievement';

export interface FlagSkin {
  id: string;
  name: string;
  description: string;
  asset: string;
  unlock: FlagSkinUnlock;
  price?: number;
  requirement?: string;
}

export const flagSkins: FlagSkin[] = [
  { id: 'local-red', name: 'Local Red', description: '첫 방문부터 함께하는 기본 깃발', asset: '/assets/flags/local-red.svg', unlock: 'default' },
  { id: 'explorer-gold', name: 'Explorer Gold', description: '새로운 곳을 찾는 탐험가의 깃발', asset: '/assets/flags/explorer-gold.svg', unlock: 'purchase', price: 800 },
  { id: 'forest-scout', name: 'Forest Scout', description: '숨은 명소 10곳을 방문하면 해금', asset: '/assets/flags/forest-scout.svg', unlock: 'achievement', requirement: '10 flags' },
];
