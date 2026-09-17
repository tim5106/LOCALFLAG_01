// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useUiStore } from '../../store/ui-store';
import { ProfilePage } from './ProfilePage';

const mockProfile = {
  id: 'user-1',
  nickname: '모험가 김로컬',
  pointBalance: 1250,
  equippedFlagSkinId: 'skin-1',
};

const mockVisits = [
  {
    spotId: 101,
    spotTitle: '북촌 한옥',
    location: { lat: 37.58, lng: 126.98 },
    visitedAt: '2026-09-10T10:00:00Z',
    rewardPoints: 100,
    status: 'SUCCESS' as const,
  },
  {
    spotId: 102,
    spotTitle: '계동 골목',
    location: { lat: 37.58, lng: 126.98 },
    visitedAt: '2026-09-11T12:00:00Z',
    rewardPoints: 100,
    status: 'SUCCESS' as const,
  },
  {
    spotId: 101, // 같은 spotId 재방문
    spotTitle: '북촌 한옥',
    location: { lat: 37.58, lng: 126.98 },
    visitedAt: '2026-09-12T14:00:00Z',
    rewardPoints: 50,
    status: 'SUCCESS' as const,
  },
];

function renderPage(props: { onSignOut?: () => void } = {}) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <ProfilePage {...props} />
    </QueryClientProvider>
  );
}

describe('ProfilePage', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem(
      'local-flag-user',
      JSON.stringify({ id: 'user-1', email: 'test@local-flag.dev', accessToken: 'token' })
    );
    useUiStore.setState({
      activeTab: 'discovery',
      profileOpen: true,
      profileOrigin: 'discovery',
      myFlagTarget: null,
    });
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    useUiStore.setState({
      activeTab: 'discovery',
      profileOpen: false,
      profileOrigin: 'discovery',
      myFlagTarget: null,
    });
  });

  it('renders profile nickname, points, unique flag count, completed visits, and mockup badges correctly', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.includes('/me/map')) {
          return new Response(JSON.stringify({ data: { visits: mockVisits } }), { status: 200 });
        }
        if (url.includes('/me')) {
          return new Response(JSON.stringify({ data: mockProfile }), { status: 200 });
        }
        return new Response(JSON.stringify({}), { status: 404 });
      })
    );

    renderPage();

    // 닉네임 및 레벨 뱃지
    expect(await screen.findByText('모험가 김로컬')).toBeTruthy();
    expect(screen.getByText('Lv.3 골목 탐험가')).toBeTruthy();

    // 포인트 (1,250 P)
    expect(screen.getByText('1,250')).toBeTruthy();
    expect(screen.getByText('P')).toBeTruthy();

    // 꽂은 깃발 고유 장소 수 (3건의 방문 중 2곳의 고유 장소)
    expect(screen.getByText('2')).toBeTruthy();
    expect(screen.getByText('개')).toBeTruthy();

    // 탐험 지역 (목업 7곳)
    expect(screen.getByText('7')).toBeTruthy();
    expect(screen.getByText('곳')).toBeTruthy();

    // 성취 배지
    expect(screen.getByText('골목길 개척자')).toBeTruthy();
    expect(screen.getByText('종로 완주')).toBeTruthy();
    expect(screen.getByText('첫 발자국')).toBeTruthy();

    // 방문 완료 건수 (총 3건 완료)
    expect(screen.getByText('3건 완료')).toBeTruthy();
  });

  it('displays dash (—) instead of zero and shows retry banner when API queries fail', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        return new Response(JSON.stringify({ message: 'Internal Server Error' }), { status: 500 });
      })
    );

    renderPage();

    // 에러 배너와 다시 시도 버튼
    expect(await screen.findByText('일부 정보를 불러오지 못했습니다.')).toBeTruthy();
    expect(screen.getByRole('button', { name: '다시 시도' })).toBeTruthy();

    // 0이 아닌 '—' 대시가 렌더링되어야 함
    const dashes = screen.getAllByText('—');
    expect(dashes.length).toBeGreaterThanOrEqual(1);
    expect(screen.queryByText('0P')).toBeNull();
  });

  it('closes profile and returns to origin tab on back button click', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.includes('/me/map')) return new Response(JSON.stringify({ data: { visits: [] } }), { status: 200 });
        if (url.includes('/me')) return new Response(JSON.stringify({ data: mockProfile }), { status: 200 });
        return new Response(JSON.stringify({}), { status: 404 });
      })
    );

    useUiStore.setState({ profileOpen: true, profileOrigin: 'my-flag', activeTab: 'my-flag' });
    renderPage();

    const backButton = await screen.findByRole('button', { name: '뒤로가기' });
    fireEvent.click(backButton);

    expect(useUiStore.getState().profileOpen).toBe(false);
    expect(useUiStore.getState().activeTab).toBe('my-flag');
  });

  it('opens shop when clicking "상점 가기"', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.includes('/me/map')) return new Response(JSON.stringify({ data: { visits: [] } }), { status: 200 });
        if (url.includes('/me')) return new Response(JSON.stringify({ data: mockProfile }), { status: 200 });
        return new Response(JSON.stringify({}), { status: 404 });
      })
    );

    renderPage();

    const shopButton = await screen.findByRole('button', { name: /상점 가기/ });
    fireEvent.click(shopButton);

    expect(useUiStore.getState().shopOpen).toBe(true);
  });

  it('navigates to My Flag photolog section when clicking "방문 인증 기록 / 포토로그"', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.includes('/me/map')) return new Response(JSON.stringify({ data: { visits: [] } }), { status: 200 });
        if (url.includes('/me')) return new Response(JSON.stringify({ data: mockProfile }), { status: 200 });
        return new Response(JSON.stringify({}), { status: 404 });
      })
    );

    renderPage();

    const photologItem = await screen.findByRole('button', { name: /방문 인증 기록 \/ 포토로그/ });
    fireEvent.click(photologItem);

    expect(useUiStore.getState().activeTab).toBe('my-flag');
    expect(useUiStore.getState().profileOpen).toBe(false);
    expect(useUiStore.getState().myFlagTarget).toBe('photolog');
  });

  it('shows toast for unimplemented menus and profile edit button', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.includes('/me/map')) return new Response(JSON.stringify({ data: { visits: [] } }), { status: 200 });
        if (url.includes('/me')) return new Response(JSON.stringify({ data: mockProfile }), { status: 200 });
        return new Response(JSON.stringify({}), { status: 404 });
      })
    );

    renderPage();

    const editBtn = await screen.findByRole('button', { name: '프로필 편집' });
    fireEvent.click(editBtn);
    expect((await screen.findByRole('status')).textContent).toContain('프로필 편집 기능은 준비 중입니다.');

    const gpsBtn = screen.getByRole('button', { name: /GPS 위치 권한 설정/ });
    fireEvent.click(gpsBtn);
    expect((await screen.findByRole('status')).textContent).toContain('준비 중입니다.');
  });

  it('removes stored credentials and triggers onSignOut callback on logout click', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.includes('/me/map')) return new Response(JSON.stringify({ data: { visits: [] } }), { status: 200 });
        if (url.includes('/me')) return new Response(JSON.stringify({ data: mockProfile }), { status: 200 });
        return new Response(JSON.stringify({}), { status: 404 });
      })
    );

    const onSignOut = vi.fn();
    renderPage({ onSignOut });

    const logoutBtn = await screen.findByRole('button', { name: '로그아웃' });
    fireEvent.click(logoutBtn);

    expect(localStorage.getItem('local-flag-user')).toBeNull();
    expect(onSignOut).toHaveBeenCalledTimes(1);
  });
});
