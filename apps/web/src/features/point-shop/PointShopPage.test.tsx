// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useUiStore } from '../../store/ui-store';
import { PointShopPage } from './PointShopPage';
import type { FlagSkin, MeProfile } from '../../api/client';

const mockProfile: MeProfile = {
  id: 'user-1',
  nickname: '로컬탐험가',
  pointBalance: 1000,
  equippedFlagSkinId: 'skin-1',
};

const mockSkins: FlagSkin[] = [
  {
    id: 'skin-1',
    name: '오리지널 레드',
    description: '로컬 플래그 시그니처 깃발 스킨',
    price: 0,
    assetUrl: 'https://example.com/red.png',
    owned: true,
    equipped: true,
  },
  {
    id: 'skin-2',
    name: '골목길 탐험가',
    description: '골목을 누비는 탐험가를 위한 스킨',
    price: 500,
    assetUrl: 'https://example.com/explorer.png',
    owned: true,
    equipped: false,
  },
  {
    id: 'skin-3',
    name: '포레스트 그린',
    description: '자연 친화적 로컬 감성 스킨',
    price: 800,
    assetUrl: 'https://example.com/green.png',
    owned: false,
    equipped: false,
  },
  {
    id: 'skin-4',
    name: '골드 마스터',
    description: '최고 등급의 황금빛 깃발 스킨',
    price: 2000,
    assetUrl: 'https://example.com/gold.png',
    owned: false,
    equipped: false,
  },
];

function renderShop() {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });
  return render(
    <QueryClientProvider client={client}>
      <PointShopPage />
    </QueryClientProvider>
  );
}

describe('PointShopPage', () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  beforeEach(() => {
    useUiStore.setState({ shopOpen: true, activeTab: 'discovery' });
  });

  it('renders skeleton UI during loading state', () => {
    vi.stubGlobal('fetch', vi.fn(() => new Promise(() => {})));
    renderShop();

    expect(screen.getByTestId('point-shop-skeleton')).toBeTruthy();
    expect(screen.getByText('포인트 상점')).toBeTruthy();
  });

  it('renders empty catalog when no skins are returned', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.includes('/me')) {
          return new Response(JSON.stringify({ data: mockProfile }), { status: 200 });
        }
        if (url.includes('/flag-skins')) {
          return new Response(JSON.stringify({ data: [] }), { status: 200 });
        }
        return new Response(JSON.stringify({}), { status: 404 });
      })
    );

    renderShop();

    expect(await screen.findByText('등록된 상품이 없습니다.')).toBeTruthy();
    expect(screen.getByText('새로운 리워드 준비 중')).toBeTruthy();
  });

  it('renders error state and retries when fetch fails', async () => {
    let attempts = 0;
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.includes('/me')) {
          return new Response(JSON.stringify({ data: mockProfile }), { status: 200 });
        }
        if (url.includes('/flag-skins')) {
          attempts += 1;
          if (attempts === 1) {
            return new Response(JSON.stringify({ message: 'Server error' }), { status: 500 });
          }
          return new Response(JSON.stringify({ data: mockSkins }), { status: 200 });
        }
        return new Response(JSON.stringify({}), { status: 404 });
      })
    );

    renderShop();

    expect(await screen.findByText('상점 정보를 불러오지 못했습니다.')).toBeTruthy();
    const retryBtn = screen.getByRole('button', { name: '다시 시도' });
    fireEvent.click(retryBtn);

    expect(await screen.findByText('오리지널 레드')).toBeTruthy();
  });

  it('displays 4 card status labels: 장착 중, 보유 중, 구매 가능, 포인트 부족 correctly', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.includes('/me')) {
          return new Response(JSON.stringify({ data: mockProfile }), { status: 200 });
        }
        if (url.includes('/flag-skins')) {
          return new Response(JSON.stringify({ data: mockSkins }), { status: 200 });
        }
        return new Response(JSON.stringify({}), { status: 404 });
      })
    );

    renderShop();

    // 데이터 로딩 완료 대기
    expect(await screen.findByText('오리지널 레드')).toBeTruthy();

    // 헤더 및 타이틀, 보유 포인트 (1,000 P)
    expect(screen.getByText('포인트 상점')).toBeTruthy();
    expect(screen.getByText('1,000 P')).toBeTruthy();

    // 4가지 상태 라벨 검증
    expect(screen.getByText('장착 중')).toBeTruthy();
    expect(screen.getByText('보유 중')).toBeTruthy();
    expect(screen.getByText('구매 가능')).toBeTruthy();
    expect(screen.getByText('포인트 부족')).toBeTruthy();

    // 상품명 및 가격 확인
    expect(screen.getByText('골목길 탐험가')).toBeTruthy();
    expect(screen.getByText('포레스트 그린')).toBeTruthy();
    expect(screen.getByText('골드 마스터')).toBeTruthy();
    expect(screen.getByText('800 P')).toBeTruthy();
    expect(screen.getByText('2,000 P')).toBeTruthy();
  });

  it('renders "확인 불가" and disables purchase button when balance query fails', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.includes('/me')) {
          return new Response(JSON.stringify({ message: 'Auth failed' }), { status: 401 });
        }
        if (url.includes('/flag-skins')) {
          return new Response(JSON.stringify({ data: mockSkins }), { status: 200 });
        }
        return new Response(JSON.stringify({}), { status: 404 });
      })
    );

    renderShop();

    expect(await screen.findByText('확인 불가')).toBeTruthy();

    // 구매 가능한 가격(800P) 스킨 카드 클릭하여 시트 열기
    const affordableCard = screen.getByLabelText('포레스트 그린 상세 보기');
    fireEvent.click(affordableCard);

    // 잔액 확인 불가로 인해 구매 버튼 비활성화
    const purchaseBtn = await screen.findByRole('button', { name: '잔액 확인 불가' });
    expect(purchaseBtn).toBeTruthy();
    expect(purchaseBtn.hasAttribute('disabled')).toBe(true);
  });

  it('opens and closes bottom sheet via close button, backdrop, and Escape key', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.includes('/me')) {
          return new Response(JSON.stringify({ data: mockProfile }), { status: 200 });
        }
        if (url.includes('/flag-skins')) {
          return new Response(JSON.stringify({ data: mockSkins }), { status: 200 });
        }
        return new Response(JSON.stringify({}), { status: 404 });
      })
    );

    renderShop();

    // 카드 클릭하여 바텀시트 열기
    const card = await screen.findByLabelText('포레스트 그린 상세 보기');
    fireEvent.click(card);

    const dialog = screen.getByRole('dialog', { name: '포레스트 그린' });
    expect(dialog).toBeTruthy();
    expect(within(dialog).getByText('자연 친화적 로컬 감성 스킨')).toBeTruthy();
    expect(within(dialog).getByText('800 P')).toBeTruthy();
    expect(within(dialog).getByText('1,000 P')).toBeTruthy();
    expect(within(dialog).getByText('200 P')).toBeTruthy(); // 구매 후 잔액 (1000 - 800)

    // 1. 닫기 버튼으로 닫기
    const closeBtn = screen.getByRole('button', { name: '닫기' });
    fireEvent.click(closeBtn);
    expect(screen.queryByRole('dialog')).toBeNull();

    // 2. 배경 클릭으로 닫기
    fireEvent.click(card);
    expect(screen.getByRole('dialog')).toBeTruthy();
    fireEvent.click(screen.getByTestId('point-shop-backdrop'));
    expect(screen.queryByRole('dialog')).toBeNull();

    // 3. Escape 키로 닫기
    fireEvent.click(card);
    expect(screen.getByRole('dialog')).toBeTruthy();
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('disables purchase button when points are insufficient', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.includes('/me')) {
          return new Response(JSON.stringify({ data: mockProfile }), { status: 200 });
        }
        if (url.includes('/flag-skins')) {
          return new Response(JSON.stringify({ data: mockSkins }), { status: 200 });
        }
        return new Response(JSON.stringify({}), { status: 404 });
      })
    );

    renderShop();

    // 2000P 골드 마스터 카드 클릭 (보유 1000P로 부족)
    const card = await screen.findByLabelText('골드 마스터 상세 보기');
    fireEvent.click(card);

    const insufficientBtn = screen.getByRole('button', { name: '포인트 부족' });
    expect(insufficientBtn).toBeTruthy();
    expect(insufficientBtn.hasAttribute('disabled')).toBe(true);
  });

  it('handles purchasing and post-purchase actions (바로 장착, 계속 둘러보기)', async () => {
    let purchasePayloadCalled = false;
    let equipPayloadCalled = false;

    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);
        if (url.includes('/flag-skins/skin-3/purchase') && init?.method === 'POST') {
          purchasePayloadCalled = true;
          return new Response(
            JSON.stringify({ data: { skinId: 'skin-3', balance: 200, acquiredAt: new Date().toISOString() } }),
            { status: 200 }
          );
        }
        if (url.includes('/me/equipped-flag-skin') && init?.method === 'PUT') {
          equipPayloadCalled = true;
          return new Response(JSON.stringify({ data: { success: true } }), { status: 200 });
        }
        if (url.includes('/me')) {
          return new Response(JSON.stringify({ data: mockProfile }), { status: 200 });
        }
        if (url.includes('/flag-skins')) {
          return new Response(JSON.stringify({ data: mockSkins }), { status: 200 });
        }
        return new Response(JSON.stringify({}), { status: 404 });
      })
    );

    renderShop();

    const card = await screen.findByLabelText('포레스트 그린 상세 보기');
    fireEvent.click(card);

    const purchaseBtn = screen.getByRole('button', { name: '800P로 구매하기' });
    fireEvent.click(purchaseBtn);

    // 구매 성공 후 '바로 장착' 및 '계속 둘러보기' 버튼 출현 확인
    expect(await screen.findByRole('button', { name: '바로 장착' })).toBeTruthy();
    expect(screen.getByRole('button', { name: '계속 둘러보기' })).toBeTruthy();
    expect(purchasePayloadCalled).toBe(true);

    // '바로 장착' 클릭
    const equipBtn = screen.getByRole('button', { name: '바로 장착' });
    fireEvent.click(equipBtn);

    await waitFor(() => {
      expect(equipPayloadCalled).toBe(true);
      expect(screen.queryByRole('dialog')).toBeNull(); // 장착 완료 후 시트 닫힘
    });
  });

  it('keeps sheet open and shows error message on purchase failure, allowing retry', async () => {
    let attempts = 0;
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);
        if (url.includes('/flag-skins/skin-3/purchase') && init?.method === 'POST') {
          attempts += 1;
          if (attempts === 1) {
            return new Response(
              JSON.stringify({ error: { code: 'PURCHASE_FAILED', message: '잔액이 부족하거나 일시적인 오류입니다.' } }),
              { status: 400 }
            );
          }
          return new Response(
            JSON.stringify({ data: { skinId: 'skin-3', balance: 200, acquiredAt: new Date().toISOString() } }),
            { status: 200 }
          );
        }
        if (url.includes('/me')) {
          return new Response(JSON.stringify({ data: mockProfile }), { status: 200 });
        }
        if (url.includes('/flag-skins')) {
          return new Response(JSON.stringify({ data: mockSkins }), { status: 200 });
        }
        return new Response(JSON.stringify({}), { status: 404 });
      })
    );

    renderShop();

    const card = await screen.findByLabelText('포레스트 그린 상세 보기');
    fireEvent.click(card);

    const purchaseBtn = screen.getByRole('button', { name: '800P로 구매하기' });
    fireEvent.click(purchaseBtn);

    // 에러 메시지 확인 및 시트 유지 확인
    expect(await screen.findByRole('alert')).toBeTruthy();
    expect(screen.getByText('잔액이 부족하거나 일시적인 오류입니다.')).toBeTruthy();
    expect(screen.getByRole('dialog')).toBeTruthy();

    // 재시도
    const retryPurchaseBtn = screen.getByRole('button', { name: '800P로 구매하기' });
    fireEvent.click(retryPurchaseBtn);

    expect(await screen.findByRole('button', { name: '바로 장착' })).toBeTruthy();
  });

  it('closes shop when clicking the back button in header', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.includes('/me')) {
          return new Response(JSON.stringify({ data: mockProfile }), { status: 200 });
        }
        if (url.includes('/flag-skins')) {
          return new Response(JSON.stringify({ data: mockSkins }), { status: 200 });
        }
        return new Response(JSON.stringify({}), { status: 404 });
      })
    );

    renderShop();

    const backBtn = await screen.findByRole('button', { name: '뒤로가기' });
    fireEvent.click(backBtn);

    expect(useUiStore.getState().shopOpen).toBe(false);
  });
});
