// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useUiStore } from '../../store/ui-store';
import type { Spot } from '../../types/spot';
import { DiscoveryPage } from './DiscoveryPage';

const spot: Spot = {
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

const visits = Array.from({ length: 7 }, (_, index) => ({
  spotId: index + 1,
  spotTitle: `방문 ${index + 1}`,
  location: { lat: 37.58, lng: 126.98 },
  visitedAt: '2026-09-01T00:00:00.000Z',
  rewardPoints: 100,
  status: 'SUCCESS' as const,
}));

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}><DiscoveryPage /></QueryClientProvider>);
}

function successResponse(input: RequestInfo | URL) {
  const url = String(input);
  if (url.includes('/me/map')) return new Response(JSON.stringify({ data: { equippedFlagSkinId: null, visits } }), { status: 200 });
  if (url.includes('/me')) return new Response(JSON.stringify({ data: { id: 'user-1', nickname: '로컬러', pointBalance: 1250, equippedFlagSkinId: null } }), { status: 200 });
  return new Response(JSON.stringify({ data: [spot], meta: { nextCursor: null, hasNext: false, total: 89 } }), { status: 200 });
}

describe('DiscoveryPage redesigned home', () => {
  afterEach(cleanup);
  beforeEach(() => {
    useUiStore.setState({ activeTab: 'discovery', selectedSpot: null, mapViewport: null });
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => successResponse(input)));
  });

  it('renders account progress and the active place in the map-first layout', async () => {
    renderPage();
    await screen.findAllByText('북촌 쪽염색 공방 화연당');
    await waitFor(() => expect(screen.getByLabelText('플래그 수집 현황').textContent).toContain('07 / 89 플래그'));
    expect(screen.getByText('1,250 P')).toBeTruthy();
    expect(screen.getByRole('button', { name: '현장 인증하기' })).toBeTruthy();
    expect(screen.queryByRole('search')).toBeNull();
  });

  it('shows the distance after the user shares their current location', async () => {
    Object.defineProperty(navigator, 'geolocation', {
      configurable: true,
      value: { getCurrentPosition: vi.fn((success) => success({ coords: { latitude: 37.58, longitude: 126.98 } })) },
    });
    renderPage();
    await screen.findAllByText('북촌 쪽염색 공방 화연당');
    fireEvent.click(screen.getByRole('button', { name: '현재 위치로 이동' }));
    await screen.findByText(/종로구 계동길 · 0m/);
    expect(screen.getByRole('status').textContent).toContain('현재 위치를 확인했어요.');
  });

  it('keeps the selected place when moving to check-in and links the profile to My Flag', async () => {
    renderPage();
    await screen.findAllByText('북촌 쪽염색 공방 화연당');
    fireEvent.click(screen.getByRole('button', { name: '현장 인증하기' }));
    expect(useUiStore.getState()).toMatchObject({ activeTab: 'check-in', selectedSpot: spot });
    useUiStore.getState().setActiveTab('discovery');
    fireEvent.click(screen.getByRole('button', { name: '마이 플래그로 이동' }));
    expect(useUiStore.getState().activeTab).toBe('my-flag');
  });

  it('does not present failed account queries as zero values', async () => {
    vi.mocked(fetch).mockImplementation(async (input) => {
      const url = String(input);
      if (url.includes('/me')) return new Response(JSON.stringify({ error: { message: 'failed' } }), { status: 500 });
      return successResponse(input);
    });
    renderPage();
    await screen.findAllByText('북촌 쪽염색 공방 화연당');
    await screen.findByText(/포인트 정보를 확인할 수 없어요/);
    expect(screen.getByLabelText('보유 포인트').textContent).toBe('확인 불가');
    expect(screen.getByLabelText('플래그 수집 현황').textContent).toContain('-- / 89 플래그');
  });

  it('disables check-in for an ineligible place', async () => {
    const ineligible = { ...spot, geometryType: 'AREA' as const, checkInEnabled: false };
    vi.mocked(fetch).mockImplementation(async (input) => {
      const url = String(input);
      if (url.includes('/me')) return successResponse(input);
      return new Response(JSON.stringify({ data: [ineligible], meta: { nextCursor: null, hasNext: false, total: 1 } }), { status: 200 });
    });
    renderPage();
    const button = await screen.findByRole('button', { name: '현장 인증하기' });
    expect((button as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByText('이 장소는 현장 인증을 지원하지 않아요.')).toBeTruthy();
    fireEvent.click(button);
    expect(useUiStore.getState().activeTab).toBe('discovery');
  });
});
