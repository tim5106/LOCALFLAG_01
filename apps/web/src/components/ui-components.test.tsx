import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, test } from 'vitest';
import { CheckInStateCard } from './CheckInStateCard';
import { FlagSkinGrid } from './FlagSkinGrid';
import { MapMarker } from './MapMarker';

describe('Local Flag UI components', () => {
  test('renders marker grade and check-in range as text, not color alone', () => {
    const html = renderToStaticMarkup(
      <MapMarker grade="A" checkInAvailable statusLabel="100m 이내 · 인증 가능" />,
    );

    expect(html).toContain('A 등급 추천 명소');
    expect(html).toContain('100m');
  });

  test('offers a recovery action when location permission is denied', () => {
    const html = renderToStaticMarkup(
      <CheckInStateCard state={{ type: 'permission-denied' }} />,
    );

    expect(html).toContain('권한 설정 방법 보기');
    expect(html).toContain('다른 지역 둘러보기');
  });

  test('renders the three MVP flag skins with their unlock states', () => {
    const html = renderToStaticMarkup(<FlagSkinGrid />);

    expect(html).toContain('Local Red');
    expect(html).toContain('Explorer Gold');
    expect(html).toContain('Forest Scout');
    expect(html).toContain('플래그 10개로 해금');
  });
});
