import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, test } from 'vitest';
import { prototypeSpots } from '../api/client';
import { MyFlagPage } from '../features/my-flag/MyFlagPage';
import { MapPreview } from './MapPreview';
import { SpotCard } from './SpotCard';
import { SpotMapSheet } from './SpotMapSheet';

describe('imported UI integration', () => {
  test('uses a stable category fallback when a spot image is unavailable', () => {
    const spot = prototypeSpots[0];
    expect(spot).toBeDefined();
    if (!spot) throw new Error('prototype spot fixture is required');
    const html = renderToStaticMarkup(<SpotCard spot={spot} />);

    expect(html).toContain('/assets/fallback/nature.webp');
    expect(html).toContain('숨은 장소');
  });

  test('shows semantic map markers in the fallback map', () => {
    const html = renderToStaticMarkup(<MapPreview spots={prototypeSpots} />);

    expect(html).toContain('관광지 지도');
    expect(html).toContain('map-marker');
    expect(html).toContain('A 등급 추천 명소');
  });

  test('uses the imported flag skin catalog on My Flag', () => {
    const html = renderToStaticMarkup(<MyFlagPage />);

    expect(html).toContain('Explorer Gold');
    expect(html).toContain('Forest Scout');
    expect(html).toContain('/assets/flags/local-red.svg');
  });

  test('uses the same fallback asset in the map selection sheet', () => {
    const spot = prototypeSpots[0];
    expect(spot).toBeDefined();
    if (!spot) throw new Error('prototype spot fixture is required');
    const html = renderToStaticMarkup(
      <SpotMapSheet spot={spot} onClose={() => undefined} onDetail={() => undefined} />,
    );

    expect(html).toContain('/assets/fallback/nature.webp');
    expect(html).toContain('숨은 장소');
  });
});
