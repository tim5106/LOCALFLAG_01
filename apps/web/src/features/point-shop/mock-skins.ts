import type { FlagSkin } from '../../api/client';

export const INITIAL_MOCK_SKINS: FlagSkin[] = [
  {
    id: 'default-red',
    name: 'Local Red',
    description: '로컬 플래그 시그니처 붉은 깃발',
    price: 0,
    assetUrl: '/assets/flags/default-red.svg',
    owned: true,
    equipped: true,
  },
  {
    id: 'bukchon-indigo',
    name: '북촌 쪽빛',
    description: '계동길 쪽염색 공방 테마의 깊은 남색 깃발',
    price: 300,
    assetUrl: '/assets/flags/bukchon-indigo.svg',
    owned: false,
    equipped: false,
  },
  {
    id: 'forest-green',
    name: '서촌 녹음',
    description: '인왕산 자락과 통인동 골목길의 숲빛 깃발',
    price: 500,
    assetUrl: '/assets/flags/forest-green.svg',
    owned: false,
    equipped: false,
  },
  {
    id: 'explorer',
    name: '골목 탐험가',
    description: '나침반 심볼이 새겨진 레트로 탐험가 깃발',
    price: 800,
    assetUrl: '/assets/flags/explorer.svg',
    owned: false,
    equipped: false,
  },
  {
    id: 'sunset-terracotta',
    name: '노을 테라코타',
    description: '익선동 기와지붕 위로 물드는 석양빛 깃발',
    price: 1200,
    assetUrl: '/assets/flags/sunset-terracotta.svg',
    owned: false,
    equipped: false,
  },
  {
    id: 'palace-night',
    name: '궁궐 달빛',
    description: '창덕궁 달빛 기행 테마의 은은한 달빛 심볼 깃발',
    price: 1800,
    assetUrl: '/assets/flags/palace-night.svg',
    owned: false,
    equipped: false,
  },
  {
    id: 'gold-master',
    name: '골드 마스터',
    description: '100% 탐험 완주자를 위한 황금빛 프리미엄 깃발',
    price: 2500,
    assetUrl: '/assets/flags/gold-master.svg',
    owned: false,
    equipped: false,
  },
];

const STORAGE_KEYS = {
  OWNED: 'localflag_owned_skins',
  EQUIPPED: 'localflag_equipped_skin',
  DEDUCTION: 'localflag_deducted_points',
} as const;

function safeGetItem(key: string): string | null {
  try {
    return typeof window !== 'undefined' && window.localStorage ? localStorage.getItem(key) : null;
  } catch {
    return null;
  }
}

function safeSetItem(key: string, value: string): void {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem(key, value);
    }
  } catch {
    // Ignore storage quota or security errors
  }
}

export function getOwnedSkinIds(): string[] {
  const raw = safeGetItem(STORAGE_KEYS.OWNED);
  if (!raw) return ['default-red'];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (Array.isArray(parsed) && parsed.every((id) => typeof id === 'string')) {
      return parsed.includes('default-red') ? parsed : ['default-red', ...parsed];
    }
    return ['default-red'];
  } catch {
    return ['default-red'];
  }
}

export function getEquippedSkinId(): string {
  return safeGetItem(STORAGE_KEYS.EQUIPPED) || 'default-red';
}

export function getSimulatedPointDeduction(): number {
  const raw = safeGetItem(STORAGE_KEYS.DEDUCTION);
  const num = Number(raw);
  return Number.isFinite(num) && num >= 0 ? num : 0;
}

export function getMockFlagSkins(): FlagSkin[] {
  const ownedIds = new Set(getOwnedSkinIds());
  const equippedId = getEquippedSkinId();

  return INITIAL_MOCK_SKINS.map((skin) => ({
    ...skin,
    owned: skin.id === 'default-red' || ownedIds.has(skin.id),
    equipped: skin.id === equippedId,
  }));
}

export function purchaseMockFlagSkin(skinId: string) {
  const skin = INITIAL_MOCK_SKINS.find((s) => s.id === skinId);
  if (!skin) {
    throw new Error('존재하지 않는 상품입니다.');
  }

  const owned = new Set(getOwnedSkinIds());
  owned.add(skinId);
  safeSetItem(STORAGE_KEYS.OWNED, JSON.stringify(Array.from(owned)));

  const currentDeduction = getSimulatedPointDeduction();
  safeSetItem(STORAGE_KEYS.DEDUCTION, String(currentDeduction + skin.price));

  return {
    skinId: skin.id,
    price: skin.price,
    acquiredAt: new Date().toISOString(),
  };
}

export function equipMockFlagSkin(skinId: string) {
  const skin = INITIAL_MOCK_SKINS.find((s) => s.id === skinId);
  if (!skin) {
    throw new Error('존재하지 않는 상품입니다.');
  }

  safeSetItem(STORAGE_KEYS.EQUIPPED, skinId);

  return {
    success: true,
    equippedSkinId: skinId,
  };
}

export function resetMockSkinState(): void {
  safeSetItem(STORAGE_KEYS.OWNED, JSON.stringify(['default-red']));
  safeSetItem(STORAGE_KEYS.EQUIPPED, 'default-red');
  safeSetItem(STORAGE_KEYS.DEDUCTION, '0');
}

