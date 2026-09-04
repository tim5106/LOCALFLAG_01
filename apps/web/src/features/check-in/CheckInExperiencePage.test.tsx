import { renderToStaticMarkup } from 'react-dom/server';
import { expect, test } from 'vitest';
import { CheckInExperiencePage } from './CheckInExperiencePage';

test('renders the interactive check-in state preview', () => {
  const html = renderToStaticMarkup(<CheckInExperiencePage />);

  expect(html).toContain('플래그 범위 안에');
  expect(html).toContain('권한 거부');
  expect(html).toContain('GPS 불안정');
  expect(html).toContain('상태 미리보기');
  expect(html).toContain('현재 위치 지도');
});
