// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import {
  INITIAL_MOCK_SKINS,
  equipMockFlagSkin,
  getEquippedSkinId,
  getFlagSkinAssetUrl,
  getMockFlagSkins,
  getOwnedSkinIds,
  getSimulatedPointDeduction,
  purchaseMockFlagSkin,
  resetMockSkinState,
} from './mock-skins';

describe('mock-skins catalog and simulator', () => {
  beforeEach(() => {
    localStorage.clear();
    resetMockSkinState();
  });

  it('contains exactly 7 flag skins with correct pricing and SVG asset URLs', () => {
    expect(INITIAL_MOCK_SKINS).toHaveLength(7);

    const skinIds = INITIAL_MOCK_SKINS.map((s) => s.id);
    expect(skinIds).toEqual([
      'default-red',
      'bukchon-indigo',
      'forest-green',
      'explorer',
      'sunset-terracotta',
      'palace-night',
      'gold-master',
    ]);

    INITIAL_MOCK_SKINS.forEach((skin) => {
      expect(skin.price).toBeGreaterThanOrEqual(0);
      expect(skin.assetUrl).toMatch(/^\/assets\/flags\/[\w-]+\.svg$/);
      expect(skin.name).toBeTruthy();
      expect(skin.description).toBeTruthy();
    });
  });

  it('defaults to owning and equipping only default-red', () => {
    const skins = getMockFlagSkins();
    expect(skins).toHaveLength(7);

    const red = skins.find((s) => s.id === 'default-red')!;
    expect(red.owned).toBe(true);
    expect(red.equipped).toBe(true);

    const others = skins.filter((s) => s.id !== 'default-red');
    others.forEach((skin) => {
      expect(skin.owned).toBe(false);
      expect(skin.equipped).toBe(false);
    });

    expect(getSimulatedPointDeduction()).toBe(0);
    expect(getEquippedSkinId()).toBe('default-red');
    expect(getOwnedSkinIds()).toEqual(['default-red']);
  });

  it('simulates skin purchase by updating owned set and accumulating point deductions', () => {
    // 1. 북촌 쪽빛(300P) 구매
    const result1 = purchaseMockFlagSkin('bukchon-indigo');
    expect(result1.skinId).toBe('bukchon-indigo');
    expect(result1.price).toBe(300);
    expect(getSimulatedPointDeduction()).toBe(300);
    expect(getOwnedSkinIds()).toContain('bukchon-indigo');

    let skins = getMockFlagSkins();
    const indigo = skins.find((s) => s.id === 'bukchon-indigo')!;
    expect(indigo.owned).toBe(true);
    expect(indigo.equipped).toBe(false); // 구매 시 자동 장착은 아님

    // 2. 골목 탐험가(800P) 추가 구매 -> 누적 1,100P 차감
    purchaseMockFlagSkin('explorer');
    expect(getSimulatedPointDeduction()).toBe(1100);
    expect(getOwnedSkinIds()).toContain('explorer');

    skins = getMockFlagSkins();
    expect(skins.find((s) => s.id === 'explorer')!.owned).toBe(true);
  });

  it('simulates skin equip and preserves selection', () => {
    purchaseMockFlagSkin('forest-green');
    const equipResult = equipMockFlagSkin('forest-green');
    expect(equipResult.success).toBe(true);
    expect(equipResult.equippedSkinId).toBe('forest-green');

    expect(getEquippedSkinId()).toBe('forest-green');

    const skins = getMockFlagSkins();
    expect(skins.find((s) => s.id === 'forest-green')!.equipped).toBe(true);
    expect(skins.find((s) => s.id === 'default-red')!.equipped).toBe(false);
  });

  it('throws error when attempting to purchase or equip a non-existent skin', () => {
    expect(() => purchaseMockFlagSkin('invalid-skin-id')).toThrow('존재하지 않는 상품입니다.');
    expect(() => equipMockFlagSkin('invalid-skin-id')).toThrow('존재하지 않는 상품입니다.');
  });

  it('resets state cleanly when resetMockSkinState is called', () => {
    purchaseMockFlagSkin('palace-night');
    equipMockFlagSkin('palace-night');

    resetMockSkinState();

    expect(getEquippedSkinId()).toBe('default-red');
    expect(getSimulatedPointDeduction()).toBe(0);
    expect(getOwnedSkinIds()).toEqual(['default-red']);
  });

  it('returns correct assetUrl for given skinId or falls back to default-red', () => {
    expect(getFlagSkinAssetUrl('bukchon-indigo')).toBe('/assets/flags/bukchon-indigo.svg');
    expect(getFlagSkinAssetUrl('gold-master')).toBe('/assets/flags/gold-master.svg');
    expect(getFlagSkinAssetUrl('unknown-id')).toBe('/assets/flags/default-red.svg');
    expect(getFlagSkinAssetUrl(null)).toBe('/assets/flags/default-red.svg');
  });
});

