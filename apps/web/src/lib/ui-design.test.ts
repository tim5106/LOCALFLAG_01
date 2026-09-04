import { describe, expect, test } from 'vitest';
import { getCheckInStateContent } from './check-in-state';
import { getFallbackAsset } from './fallback-assets';
import { flagSkins } from './flag-skins';
import { getMarkerAppearance } from './marker-appearance';

describe('getMarkerAppearance', () => {
  test('keeps grade identity visible without relying on color alone', () => {
    expect(getMarkerAppearance('S')).toEqual({
      grade: 'S',
      label: 'S 등급 희귀 명소',
      symbol: '★',
      tone: 'violet',
    });

    expect(getMarkerAppearance('C')).toEqual({
      grade: 'C',
      label: 'C 등급 로컬 명소',
      symbol: 'C',
      tone: 'ochre',
    });
  });
});

describe('getCheckInStateContent', () => {
  test('gives denied users a recovery action instead of a dead end', () => {
    expect(getCheckInStateContent({ type: 'permission-denied' })).toEqual({
      eyebrow: '위치 권한 필요',
      title: '위치 권한을 켜야\n현장 인증을 시작할 수 있어요.',
      description: '브라우저 주소창의 자물쇠 아이콘에서 위치 권한을 허용한 뒤 다시 시도해 주세요.',
      actionLabel: '권한 설정 방법 보기',
      secondaryActionLabel: '다른 지역 둘러보기',
      tone: 'danger',
    });
  });

  test('shows the measured accuracy when GPS is too imprecise', () => {
    expect(getCheckInStateContent({ type: 'gps-inaccurate', accuracyM: 74 })).toMatchObject({
      title: 'GPS 신호가 조금 흔들리고 있어요.',
      description: '현재 정확도는 약 74m예요. 하늘이 보이는 곳에서 다시 측정해 주세요.',
      actionLabel: '위치 다시 측정하기',
      tone: 'warning',
    });
  });

  test('turns an empty nearby result into a discovery path', () => {
    expect(getCheckInStateContent({ type: 'empty-nearby' })).toMatchObject({
      title: '주변에 인증 가능한 플래그가 없어요.',
      actionLabel: '다른 지역 둘러보기',
      tone: 'neutral',
    });
  });
});

describe('getFallbackAsset', () => {
  test('maps TourAPI content types to a stable visual category', () => {
    expect(getFallbackAsset(12).key).toBe('nature');
    expect(getFallbackAsset(14).key).toBe('culture');
    expect(getFallbackAsset(15).key).toBe('festival');
    expect(getFallbackAsset(28).key).toBe('activity');
    expect(getFallbackAsset(999).key).toBe('nature');
  });
});

describe('flagSkins', () => {
  test('ships one free, one purchasable, and one achievement skin for MVP', () => {
    expect(flagSkins.map(({ id, unlock }) => ({ id, unlock }))).toEqual([
      { id: 'local-red', unlock: 'default' },
      { id: 'explorer-gold', unlock: 'purchase' },
      { id: 'forest-scout', unlock: 'achievement' },
    ]);
  });
});
