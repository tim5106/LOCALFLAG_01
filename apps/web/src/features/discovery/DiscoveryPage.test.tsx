// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useUiStore } from '../../store/ui-store';
import type { Spot } from '../../types/spot';
import { App } from '../../App';
import { signIn } from '../auth/auth';
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
    useUiStore.setState({ activeTab: 'discovery', discoveryView: 'map', selectedSpot: null, mapViewport: null, profileOpen: false, profileOrigin: 'discovery', myFlagTarget: null });
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => successResponse(input)));
  });

  it('renders account progress and the active place in the map-first layout', async () => {
    renderPage();
    await screen.findAllByText('북촌 쪽염색 공방 화연당');
    await waitFor(() => expect(screen.getByLabelText('플래그 수집 현황').textContent).toContain('07 / 89 플래그'));
    expect(screen.getByText('1,250 P')).toBeTruthy();
    expect(screen.getByRole('button', { name: '현장 인증하기' })).toBeTruthy();
    const searchButton = screen.getByRole('button', { name: '장소 검색' });
    expect(searchButton.textContent).toContain('Search...');
  });

  it('navigates to DiscoverySearchPage on clicking search bar and returns to map on back button', async () => {
    renderPage();
    await screen.findAllByText('북촌 쪽염색 공방 화연당');
    const searchButton = screen.getByRole('button', { name: '장소 검색' });
    fireEvent.click(searchButton);

    expect(useUiStore.getState().discoveryView).toBe('list');
    expect(await screen.findByText('어디로 떠나볼까요?')).toBeTruthy();
    expect(screen.getByText('인기 탐험 도시')).toBeTruthy();
    expect(screen.getByText('이번 주 추천 플래그 TOP 5')).toBeTruthy();
    expect(screen.getByText('전체 로컬 스팟')).toBeTruthy();
    expect(screen.getByText('89')).toBeTruthy();
    expect(screen.getByText('서울')).toBeTruthy();
    expect(screen.getByText('24개 플래그')).toBeTruthy();
    expect(screen.queryByLabelText(/보유 포인트 .* 포인트/)).toBeNull();

    const backButton = screen.getByRole('button', { name: '지도 홈으로 돌아가기' });
    fireEvent.click(backButton);

    expect(useUiStore.getState().discoveryView).toBe('map');
    expect(await screen.findByRole('button', { name: '현장 인증하기' })).toBeTruthy();
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

  it('keeps the selected place when moving to check-in and opens profile', async () => {
    renderPage();
    await screen.findAllByText('북촌 쪽염색 공방 화연당');
    fireEvent.click(screen.getByRole('button', { name: '현장 인증하기' }));
    expect(useUiStore.getState()).toMatchObject({ activeTab: 'check-in', selectedSpot: spot });
    useUiStore.getState().setActiveTab('discovery');
    fireEvent.click(screen.getByRole('button', { name: '내 프로필' }));
    expect(useUiStore.getState().profileOpen).toBe(true);
    expect(useUiStore.getState().profileOrigin).toBe('discovery');
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

  it('resets to map view when clicking bottom navigation discovery tab in App', async () => {
    await signIn('traveler@example.com', 'localflag');
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(<QueryClientProvider client={client}><App /></QueryClientProvider>);
    await screen.findAllByText('북촌 쪽염색 공방 화연당');

    fireEvent.click(screen.getByRole('button', { name: '장소 검색' }));
    expect(useUiStore.getState().discoveryView).toBe('list');
    expect(await screen.findByText('어디로 떠나볼까요?')).toBeTruthy();

    const discoveryTab = screen.getByRole('button', { name: '탐색' });
    fireEvent.click(discoveryTab);
    expect(useUiStore.getState().discoveryView).toBe('map');
    expect(await screen.findByRole('button', { name: '현장 인증하기' })).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: '마이 플래그' }));
    expect(useUiStore.getState().activeTab).toBe('my-flag');
    useUiStore.setState({ discoveryView: 'list' });
    fireEvent.click(screen.getByRole('button', { name: '탐색' }));
    expect(useUiStore.getState().activeTab).toBe('discovery');
    expect(useUiStore.getState().discoveryView).toBe('map');
  });

  it('renders loading, error, and empty states in DiscoverySearchPage', async () => {
    useUiStore.setState({ activeTab: 'discovery', discoveryView: 'list' });

    vi.mocked(fetch).mockImplementation(async (input) => {
      const url = String(input);
      if (url.includes('/spots')) return new Response(JSON.stringify({ error: { message: 'failed' } }), { status: 400 });
      return successResponse(input);
    });
    const errorClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { unmount: unmountError } = render(<QueryClientProvider client={errorClient}><DiscoveryPage /></QueryClientProvider>);
    expect((await screen.findByRole('alert')).textContent).toContain('스팟 목록을 불러오지 못했어요.');
    unmountError();

    vi.mocked(fetch).mockImplementation(async (input) => {
      const url = String(input);
      if (url.includes('/spots')) return new Response(JSON.stringify({ data: [], meta: { nextCursor: null, hasNext: false, total: 0 } }), { status: 200 });
      return successResponse(input);
    });
    const emptyClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(<QueryClientProvider client={emptyClient}><DiscoveryPage /></QueryClientProvider>);
    expect(await screen.findByText('표시할 로컬 스팟이 없어요.')).toBeTruthy();
  });

  it('ensures unimplemented controls are disabled or non-interactive for accessibility', async () => {
    useUiStore.setState({ activeTab: 'discovery', discoveryView: 'list' });
    renderPage();
    await screen.findAllByText('북촌 쪽염색 공방 화연당');

    expect(screen.queryByRole('searchbox')).toBeNull();

    const filterGroup = screen.getByRole('group', { name: '필터 선택' });
    const buttons = filterGroup.querySelectorAll('button');
    expect(buttons.length).toBe(4);
    buttons.forEach((btn) => {
      expect((btn as HTMLButtonElement).disabled).toBe(true);
    });

    const sortBtn = screen.getByRole('button', { name: /정렬 방식: 거리순/ });
    expect((sortBtn as HTMLButtonElement).disabled).toBe(true);

    const detailBtns = screen.getAllByRole('button', { name: /상세보기 \(준비 중\)/ });
    expect(detailBtns.length).toBeGreaterThan(0);
    detailBtns.forEach((btn) => {
      expect((btn as HTMLButtonElement).disabled).toBe(true);
    });
  });
});
