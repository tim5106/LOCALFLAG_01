// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useUiStore } from '../../store/ui-store';
import { MyFlagPage } from './MyFlagPage';

const mockProfile = {
  id: 'user-1',
  nickname: '로컬탐험가',
  pointBalance: 1250,
  equippedFlagSkinId: 'skin-1',
};

const mockVisits = [
  {
    spotId: 1,
    spotTitle: '통인동 한옥',
    location: { lat: 37.58, lng: 126.97 },
    visitedAt: '2026-09-10T10:00:00Z',
    rewardPoints: 100,
    status: 'SUCCESS' as const,
    imageUrl: 'https://example.com/tongin.jpg',
  },
  {
    spotId: 2,
    spotTitle: '계동 책방길',
    location: { lat: 37.58, lng: 126.98 },
    visitedAt: '2026-09-11T14:30:00Z',
    rewardPoints: 100,
    status: 'SUCCESS' as const,
    imageUrl: null,
  },
];

const mockSkins = [
  {
    id: 'skin-1',
    name: 'Local Red',
    description: '기본 오리지널',
    price: 0,
    assetUrl: 'https://example.com/red.svg',
    owned: true,
    equipped: true,
  },
  {
    id: 'skin-2',
    name: 'Explorer',
    description: '나침반 문양',
    price: 800,
    assetUrl: 'https://example.com/explorer.svg',
    owned: false,
    equipped: false,
  },
  {
    id: 'skin-3',
    name: 'Forest Green',
    description: '자연의 색상',
    price: 500,
    assetUrl: 'https://example.com/green.svg',
    owned: true,
    equipped: false,
  },
];

function renderPage() {
  const client = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
  return render(
    <QueryClientProvider client={client}>
      <MyFlagPage />
    </QueryClientProvider>
  );
}

describe('MyFlagPage collection dashboard', () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  beforeEach(() => {
    useUiStore.setState({ activeTab: 'my-flag', shopOpen: false });
  });

  it('renders profile points, visits count, collection progress, and ONLY owned skins', async () => {
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('/me/map')) {
        return new Response(JSON.stringify({ data: { equippedFlagSkinId: 'skin-1', visits: mockVisits } }), { status: 200 });
      }
      if (url.includes('/me')) {
        return new Response(JSON.stringify({ data: mockProfile }), { status: 200 });
      }
      if (url.includes('/flag-skins')) {
        return new Response(JSON.stringify({ data: mockSkins }), { status: 200 });
      }
      return new Response(JSON.stringify({}), { status: 404 });
    }));

    renderPage();

    // 헤더 및 인트로 (로딩 완료 대기)
    expect(await screen.findByRole('heading', { name: /나만의 로컬 지도를/ })).toBeTruthy();
    expect(screen.getByText('Local Flag')).toBeTruthy();

    // 히어로 카드: 지역 및 플래그 수치, 보유 포인트
    expect(screen.getByText('0개 지역 · 2개 플래그')).toBeTruthy();
    expect(screen.getByText('1,250')).toBeTruthy();
    expect(screen.getByText('COLLECTION LEVEL 03')).toBeTruthy();

    // 플래그 진행률 카드: 2 / 0
    expect(screen.getByText('2 / 0')).toBeTruthy();

    // 포토로그 카드
    expect(screen.getByText('통인동 한옥')).toBeTruthy();
    expect(screen.getByText('계동 책방길')).toBeTruthy();
    const img = screen.getByAltText('통인동 한옥') as HTMLImageElement;
    expect(img.src).toBe('https://example.com/tongin.jpg');

    // 스킨 목록: 오직 소유한 스킨만 노출 (2/3)
    expect(screen.getByText('깃발 스킨 보관함 (2/3 보유)')).toBeTruthy();
    expect(screen.getByText('Local Red')).toBeTruthy();
    expect(screen.getByText('Forest Green')).toBeTruthy();
    // 미보유 스킨인 Explorer는 마이 플래그 보관함에 노출되지 않음
    expect(screen.queryByText('Explorer')).toBeNull();

    // 액션 버튼: 장착 중 및 장착하기
    expect(screen.getByRole('button', { name: /Local Red 장착 중/ })).toBeTruthy();
    expect(screen.getByRole('button', { name: /Forest Green 장착하기/ })).toBeTruthy();
    expect(screen.queryByRole('button', { name: /교환하기/ })).toBeNull();
  });

  it('handles equipping an owned skin', async () => {
    let equippedSkinId = '';

    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.includes('/me/equipped-flag-skin') && init?.method === 'PUT') {
        const body = JSON.parse(String(init.body));
        equippedSkinId = body.skinId;
        return new Response(JSON.stringify({ data: { success: true } }), { status: 200 });
      }
      if (url.includes('/me/map')) {
        return new Response(JSON.stringify({ data: { equippedFlagSkinId: 'skin-1', visits: mockVisits } }), { status: 200 });
      }
      if (url.includes('/me')) {
        return new Response(JSON.stringify({ data: mockProfile }), { status: 200 });
      }
      if (url.includes('/flag-skins')) {
        return new Response(JSON.stringify({ data: mockSkins }), { status: 200 });
      }
      return new Response(JSON.stringify({}), { status: 404 });
    }));

    renderPage();

    // 스킨 장착
    const equipButton = await screen.findByRole('button', { name: /Forest Green 장착하기/ });
    fireEvent.click(equipButton);

    await waitFor(() => {
      expect(equippedSkinId).toBe('skin-3');
      expect(screen.getByText('Forest Green을 장착했습니다.')).toBeTruthy();
    });
  });

  it('opens shop when clicking balance chip, hero card, or section shop button', async () => {
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('/me/map')) return new Response(JSON.stringify({ data: { equippedFlagSkinId: 'skin-1', visits: mockVisits } }), { status: 200 });
      if (url.includes('/me')) return new Response(JSON.stringify({ data: mockProfile }), { status: 200 });
      if (url.includes('/flag-skins')) return new Response(JSON.stringify({ data: mockSkins }), { status: 200 });
      return new Response(JSON.stringify({}), { status: 404 });
    }));

    renderPage();

    // 1. 헤더 포인트 칩 클릭
    const balanceChip = await screen.findByRole('button', { name: '보유 포인트' });
    fireEvent.click(balanceChip);
    expect(useUiStore.getState().shopOpen).toBe(true);

    useUiStore.setState({ shopOpen: false });

    // 2. 히어로 카드 클릭
    const heroCard = screen.getByRole('button', { name: '컬렉션 레벨 및 포인트' });
    fireEvent.click(heroCard);
    expect(useUiStore.getState().shopOpen).toBe(true);

    useUiStore.setState({ shopOpen: false });

    // 3. 스킨 섹션 헤더 '상점 보기' 버튼 클릭
    const shopBtn = screen.getByRole('button', { name: '스킨 상점 보기' });
    fireEvent.click(shopBtn);
    expect(useUiStore.getState().shopOpen).toBe(true);
  });

  it('navigates to discovery tab when clicking "새로운 발견"', async () => {
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('/me/map')) {
        return new Response(JSON.stringify({ data: { equippedFlagSkinId: null, visits: [] } }), { status: 200 });
      }
      if (url.includes('/me')) {
        return new Response(JSON.stringify({ data: mockProfile }), { status: 200 });
      }
      if (url.includes('/flag-skins')) {
        return new Response(JSON.stringify({ data: [] }), { status: 200 });
      }
      return new Response(JSON.stringify({}), { status: 404 });
    }));

    renderPage();

    const discoverButton = await screen.findByRole('button', { name: /새로운 발견 탐색하기/ });
    fireEvent.click(discoverButton);

    expect(useUiStore.getState().activeTab).toBe('discovery');
  });

  it('renders empty visits and empty owned skins state with CTA to shop', async () => {
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('/me/map')) {
        return new Response(JSON.stringify({ data: { equippedFlagSkinId: null, visits: [] } }), { status: 200 });
      }
      if (url.includes('/me')) {
        return new Response(JSON.stringify({ data: mockProfile }), { status: 200 });
      }
      if (url.includes('/flag-skins')) {
        return new Response(JSON.stringify({ data: [] }), { status: 200 });
      }
      return new Response(JSON.stringify({}), { status: 404 });
    }));

    renderPage();

    expect(await screen.findByText('아직 방문한 장소가 없습니다.')).toBeTruthy();
    expect(screen.getByText('보유한 스킨이 없습니다.')).toBeTruthy();
    expect(screen.getByText('0개 지역 · 0개 플래그')).toBeTruthy();
    expect(screen.getByText('0 / 0')).toBeTruthy();

    // CTA 클릭 시 상점 열림
    const ctaBtn = screen.getByRole('button', { name: '스킨 상점 둘러보기' });
    fireEvent.click(ctaBtn);
    expect(useUiStore.getState().shopOpen).toBe(true);
  });

  it('renders skeleton UI during loading state', () => {
    vi.stubGlobal('fetch', vi.fn(() => new Promise(() => {})));

    renderPage();

    expect(screen.getByTestId('my-flag-skeleton')).toBeTruthy();
  });

  it('renders loading and error states', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => {
      return new Response(JSON.stringify({ message: 'Unauthorized' }), { status: 401 });
    }));

    renderPage();

    expect(await screen.findByText('마이 플래그 정보를 확인할 수 없습니다.')).toBeTruthy();
    expect(screen.getByRole('button', { name: '다시 시도' })).toBeTruthy();
  });
});
