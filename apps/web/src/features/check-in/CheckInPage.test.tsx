// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { useUiStore } from '../../store/ui-store';
import type { Spot } from '../../types/spot';
import { CheckInPage } from './CheckInPage';

const selectedSpot: Spot = {
  id: 101,
  title: '북촌 쪽염색 공방 화연당',
  address: '종로구 계동길',
  contentTypeId: 12,
  grade: 'A',
  isDecliningArea: false,
  estimatedReward: 150,
  imageUrl: null,
  status: 'ACTIVE',
  geometryType: 'POINT',
  checkInEnabled: true,
  location: { lat: 37.58, lng: 126.98 },
};

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}><CheckInPage /></QueryClientProvider>);
}

describe('CheckInPage selected place handoff', () => {
  afterEach(cleanup);

  it('shows the eligible place selected on the discovery page before location results arrive', () => {
    useUiStore.setState({ selectedSpot });
    renderPage();
    const select = screen.getByRole('combobox') as HTMLSelectElement;
    expect(select.value).toBe(String(selectedSpot.id));
    expect(select.textContent).toContain(selectedSpot.title);
  });

  it('rejects an ineligible place handed off defensively', () => {
    useUiStore.setState({ selectedSpot: { ...selectedSpot, checkInEnabled: false } });
    renderPage();
    const select = screen.getByRole('combobox') as HTMLSelectElement;
    expect(select.value).toBe('');
    expect(select.textContent).not.toContain(selectedSpot.title);
  });
});
