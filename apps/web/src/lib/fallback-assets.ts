export type FallbackAssetKey = 'nature' | 'culture' | 'festival' | 'activity';

export interface FallbackAsset {
  key: FallbackAssetKey;
  label: string;
  src: string;
}

const fallbackAssets: Record<FallbackAssetKey, FallbackAsset> = {
  nature: { key: 'nature', label: '자연·관광지', src: '/assets/fallback/nature.webp' },
  culture: { key: 'culture', label: '문화시설', src: '/assets/fallback/culture.webp' },
  festival: { key: 'festival', label: '축제·행사', src: '/assets/fallback/festival.webp' },
  activity: { key: 'activity', label: '레포츠·체험', src: '/assets/fallback/activity.webp' },
};

export function getFallbackAsset(contentTypeId: number): FallbackAsset {
  if (contentTypeId === 14) return fallbackAssets.culture;
  if (contentTypeId === 15) return fallbackAssets.festival;
  if (contentTypeId === 28) return fallbackAssets.activity;
  return fallbackAssets.nature;
}
