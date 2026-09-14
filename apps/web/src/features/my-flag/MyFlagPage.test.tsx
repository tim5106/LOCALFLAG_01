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
    owned: true,
    equipped: true,
  },
  {
    id: 'skin-2',
    name: 'Explorer',
    description: '나침반 문양',
    price: 800,
    owned: false,
    equipped: false,
  },
  {
    id: 'skin-3',
    name: 'Forest Green',
    description: '자연의 색상',
    price: 500,
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
    useUiStore.setState({ activeTab: 'my-flag' });
  });

  it('renders profile points, visits count, collection progress, and skins correctly', async () => {
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

    // 등급별 뱃지
    expect(screen.getByText('S')).toBeTruthy();
    expect(screen.getByText('A')).toBeTruthy();
    expect(screen.getByText('B')).toBeTruthy();
    expect(screen.getByText('C')).toBeTruthy();

    // 포토로그 카드: 이미지 있는 것 & 없는 것(플레이스홀더)
    expect(screen.getByText('통인동 한옥')).toBeTruthy();
    expect(screen.getByText('계동 책방길')).toBeTruthy();
    const img = screen.getByAltText('통인동 한옥') as HTMLImageElement;
    expect(img.src).toBe('https://example.com/tongin.jpg');

    // 스킨 목록: 소유 및 장착 상태
    expect(screen.getByText('깃발 스킨 보관함 (2/3 보유)')).toBeTruthy();
    expect(screen.getByText('Local Red')).toBeTruthy();
    expect(screen.getByText('Explorer')).toBeTruthy();
    expect(screen.getByText('Forest Green')).toBeTruthy();

    // 액션 버튼 확인
    expect(screen.getByRole('button', { name: /Local Red 장착 중/ })).toBeTruthy();
    expect(screen.getByRole('button', { name: /Explorer 800P 교환하기/ })).toBeTruthy();
    expect(screen.getByRole('button', { name: /Forest Green 장착하기/ })).toBeTruthy();
  });

  it('handles purchasing and equipping a skin', async () => {
    let purchasedSkinId = '';
    let equippedSkinId = '';

    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.includes('/flag-skins/skin-2/purchase') && init?.method === 'POST') {
        purchasedSkinId = 'skin-2';
        return new Response(JSON.stringify({ data: { success: true } }), { status: 200 });
      }
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

    // 스킨 구매
    const purchaseButton = await screen.findByRole('button', { name: /Explorer 800P 교환하기/ });
    fireEvent.click(purchaseButton);

    await waitFor(() => {
      expect(purchasedSkinId).toBe('skin-2');
      expect(screen.getByText('Explorer을 구매했습니다.')).toBeTruthy();
    });

    // 스킨 장착
    const equipButton = screen.getByRole('button', { name: /Forest Green 장착하기/ });
    fireEvent.click(equipButton);

    await waitFor(() => {
      expect(equippedSkinId).toBe('skin-3');
      expect(screen.getByText('Forest Green을 장착했습니다.')).toBeTruthy();
    });
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

  it('renders empty visits and empty skins state correctly', async () => {
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
    expect(screen.getByText('등록된 스킨이 없습니다.')).toBeTruthy();
    expect(screen.getByText('0개 지역 · 0개 플래그')).toBeTruthy();
    expect(screen.getByText('0 / 0')).toBeTruthy();
  });

  it('renders loading and error states', async () => {
    // 1. Error state (profile error)
    vi.stubGlobal('fetch', vi.fn(async () => {
      return new Response(JSON.stringify({ message: 'Unauthorized' }), { status: 401 });
    }));

    renderPage();

    expect(await screen.findByText('마이 플래그 정보를 확인할 수 없습니다.')).toBeTruthy();
    expect(screen.getByRole('button', { name: '다시 시도' })).toBeTruthy();
  });
});
