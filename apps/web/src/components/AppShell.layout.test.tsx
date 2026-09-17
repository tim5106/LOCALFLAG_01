// @vitest-environment jsdom
import { cleanup, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import layoutStyles from '../styles.css?inline';
import { AppShell } from './AppShell';

describe('AppShell mobile layout', () => {
  beforeEach(() => {
    const style = document.createElement('style');
    style.dataset.testLayoutStyles = 'true';
    style.textContent = layoutStyles;
    document.head.append(style);
  });

  afterEach(() => {
    cleanup();
    document.querySelector('[data-test-layout-styles="true"]')?.remove();
  });

  it('keeps navigation fixed and reserves bottom clearance for tab pages', () => {
    const { container } = render(
      <AppShell activeTab="discovery" onTabChange={() => undefined}>
        <main className="page discovery-page">
          <button type="button">Last page action</button>
        </main>
      </AppShell>,
    );

    const navigation = container.querySelector('.bottom-nav');
    const page = container.querySelector('.page');
    const appFrame = container.querySelector('.app-frame');

    expect(navigation).not.toBeNull();
    expect(page).not.toBeNull();
    expect(appFrame).not.toBeNull();
    expect(getComputedStyle(navigation!).position).toBe('fixed');
    expect(parseFloat(getComputedStyle(page!).paddingBottom)).toBeGreaterThanOrEqual(96);
    expect(getComputedStyle(appFrame!).minHeight).toBe('0px');
  });
});
