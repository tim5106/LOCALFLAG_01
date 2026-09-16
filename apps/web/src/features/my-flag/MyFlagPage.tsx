import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Camera, Check, CircleUserRound, Compass, Flag, Info, RefreshCw } from 'lucide-react';
import { useEffect, useState } from 'react';
import { equipFlagSkin, getFlagSkins, getMe, getMyMap, purchaseFlagSkin } from '../../api/client';
import { useUiStore } from '../../store/ui-store';

type Profile = { nickname?: string | null; pointBalance?: number; equippedFlagSkinId?: string | null };
type Skin = { id: string; name?: string; description?: string; price?: number; owned?: boolean; equipped?: boolean; isEquipped?: boolean };
type Visit = { spotId: number; spotTitle: string; location: { lat: number; lng: number }; visitedAt: string; rewardPoints: number; status: 'SUCCESS'; imageUrl?: string | null };
type MyMap = { equippedFlagSkinId: string | null; visits: Visit[] };

export function MyFlagPage() {
  const queryClient = useQueryClient();
  const setActiveTab = useUiStore((state) => state.setActiveTab);
  const openProfile = useUiStore((state) => state.openProfile);
  const myFlagTarget = useUiStore((state) => state.myFlagTarget);
  const clearMyFlagTarget = useUiStore((state) => state.clearMyFlagTarget);
  const [toast, setToast] = useState('');

  useEffect(() => {
    if (!myFlagTarget) return;
    if (myFlagTarget === 'photolog') {
      const el = document.getElementById('photolog-heading');
      el?.scrollIntoView({ behavior: 'smooth' });
    } else if (myFlagTarget === 'skins') {
      const el = document.getElementById('skins-heading');
      el?.scrollIntoView({ behavior: 'smooth' });
    }
    clearMyFlagTarget();
  }, [myFlagTarget, clearMyFlagTarget]);

  const profileQuery = useQuery({ queryKey: ['me'], queryFn: getMe, retry: false });
  const skinsQuery = useQuery({ queryKey: ['flag-skins'], queryFn: getFlagSkins, retry: false });
  const mapQuery = useQuery({ queryKey: ['my-map'], queryFn: getMyMap, retry: false });

  const profile = (profileQuery.data as { data?: Profile } | undefined)?.data;
  const skins = ((skinsQuery.data as { data?: Skin[] } | undefined)?.data ?? []);
  const myMap = (mapQuery.data as { data?: MyMap } | undefined)?.data;
  const visits = myMap?.visits ?? [];

  const ownedSkins = skins.filter((skin) => skin.owned === true).length;
  const equippedSkinId = profile?.equippedFlagSkinId ?? myMap?.equippedFlagSkinId ?? null;

  const isLoading = profileQuery.isPending || skinsQuery.isPending || mapQuery.isPending;
  const hasError = profileQuery.isError || skinsQuery.isError || mapQuery.isError;

  const refreshAccount = async () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: ['me'] }),
      queryClient.invalidateQueries({ queryKey: ['flag-skins'] }),
      queryClient.invalidateQueries({ queryKey: ['my-map'] }),
    ]);

  const handlePurchase = async (skin: Skin) => {
    try {
      await purchaseFlagSkin(skin.id);
      await refreshAccount();
      setToast(`${skin.name ?? '스킨'}을 구매했습니다.`);
    } catch (error) {
      setToast(error instanceof Error ? error.message : '스킨 구매에 실패했습니다.');
    }
  };

  const handleEquip = async (skin: Skin) => {
    try {
      await equipFlagSkin(skin.id);
      await refreshAccount();
      setToast(`${skin.name ?? '스킨'}을 장착했습니다.`);
    } catch (error) {
      setToast(error instanceof Error ? error.message : '스킨 장착에 실패했습니다.');
    }
  };

  if (isLoading) {
    return (
      <main className="my-flag-page">
        <header className="my-flag-header">
          <div className="my-flag-header__brand">
            <h1>Local Flag</h1>
          </div>
        </header>
        <div className="my-flag-status-card" role="status">
          <RefreshCw className="spin" size={20} />
          <span>마이 플래그 정보를 불러오는 중입니다.</span>
        </div>
      </main>
    );
  }

  if (hasError && !profile) {
    return (
      <main className="my-flag-page">
        <header className="my-flag-header">
          <div className="my-flag-header__brand">
            <h1>Local Flag</h1>
          </div>
        </header>
        <div className="my-flag-status-card my-flag-status-card--error" role="alert">
          <p>마이 플래그 정보를 확인할 수 없습니다.</p>
          <button type="button" className="my-flag-retry-btn" onClick={() => refreshAccount()}>
            다시 시도
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="my-flag-page">
      {/* 64px 고정 헤더 */}
      <header className="my-flag-header">
        <div className="my-flag-header__brand">
          <h1>Local Flag</h1>
        </div>
        <div className="discovery-header__actions">
          <strong className="discovery-balance" aria-label="보유 포인트">
            {profileQuery.isPending ? '— P' : profileQuery.isError ? '확인 불가' : `${(profile?.pointBalance ?? 0).toLocaleString()} P`}
          </strong>
          <button
            type="button"
            className="discovery-profile"
            aria-label="내 프로필"
            onClick={() => openProfile('my-flag')}
          >
            <CircleUserRound size={20} />
          </button>
        </div>
      </header>

      {hasError && (
        <div className="my-flag-error-banner" role="alert">
          일부 마이 플래그 정보를 불러오지 못했습니다.
        </div>
      )}

      {/* 소개 문구 */}
      <div className="my-flag-intro">
        <h2>
          나만의 로컬 지도를
          <br />
          조금씩 채워가고 있어요.
        </h2>
      </div>

      {/* 컬렉션 레벨 & 포인트 카드 */}
      <section className="my-flag-hero-card" aria-label="컬렉션 레벨 및 포인트">
        <div className="my-flag-hero-card__left">
          <div className="my-flag-hero-card__badge">
            <span className="my-flag-hero-card__badge-icon">
              <Flag size={14} color="#F05D3F" />
            </span>
            <span className="my-flag-hero-card__level">COLLECTION LEVEL 03</span>
          </div>
          <p className="my-flag-hero-card__title">0개 지역 · {visits.length}개 플래그</p>
        </div>
        <div className="my-flag-hero-card__right">
          <span className="my-flag-hero-card__points-label">보유 포인트</span>
          <div className="my-flag-hero-card__points-value">
            <strong>{(profile?.pointBalance ?? 0).toLocaleString()}</strong>
            <span>P</span>
          </div>
        </div>
      </section>

      {/* 플래그 진행률 카드 */}
      <section className="my-flag-progress-card" aria-label="플래그 수집 현황">
        <div className="my-flag-progress-card__header">
          <div className="my-flag-progress-card__title">
            <Compass size={18} color="#002920" />
            <h3>플래그</h3>
          </div>
          <span className="my-flag-progress-card__percent">0%</span>
        </div>

        <div className="my-flag-progress-card__bar-wrap">
          <div className="my-flag-progress-card__bar" role="progressbar" aria-valuenow={0} aria-valuemin={0} aria-valuemax={100}>
            <div className="my-flag-progress-card__fill" style={{ width: '0%' }}>
              <span className="my-flag-progress-card__knob" />
            </div>
          </div>
          <div className="my-flag-progress-card__count">
            <span>{visits.length} / 0</span>
          </div>
        </div>

        <div className="my-flag-progress-card__grades">
          <div className="my-flag-grade-badge my-flag-grade-badge--s">
            <div className="my-flag-grade-badge__icon">S</div>
            <div className="my-flag-grade-badge__val">
              <strong>0</strong>
              <small>개</small>
            </div>
          </div>
          <div className="my-flag-grade-badge my-flag-grade-badge--a">
            <div className="my-flag-grade-badge__icon">A</div>
            <div className="my-flag-grade-badge__val">
              <strong>0</strong>
              <small>개</small>
            </div>
          </div>
          <div className="my-flag-grade-badge my-flag-grade-badge--b">
            <div className="my-flag-grade-badge__icon">B</div>
            <div className="my-flag-grade-badge__val">
              <strong>0</strong>
              <small>개</small>
            </div>
          </div>
          <div className="my-flag-grade-badge my-flag-grade-badge--c">
            <div className="my-flag-grade-badge__icon">C</div>
            <div className="my-flag-grade-badge__val">
              <strong>0</strong>
              <small>개</small>
            </div>
          </div>
        </div>
      </section>

      {/* 필드 인증 포토로그 */}
      <section className="my-flag-section" aria-labelledby="photolog-heading">
        <div className="my-flag-section__heading">
          <Camera size={18} color="#D54D35" />
          <h3 id="photolog-heading">필드 인증 포토로그</h3>
        </div>

        <div className="my-flag-photolog-grid">
          {visits.length === 0 ? (
            <div className="my-flag-empty-card">아직 방문한 장소가 없습니다.</div>
          ) : (
            visits.map((visit) => (
              <article key={`${visit.spotId}-${visit.visitedAt}`} className="my-flag-photolog-card">
                {visit.imageUrl ? (
                  <img src={visit.imageUrl} alt={visit.spotTitle} className="my-flag-photolog-card__img" />
                ) : (
                  <div className="my-flag-photolog-card__placeholder">
                    <Flag size={24} color="rgba(255, 255, 255, 0.4)" />
                  </div>
                )}
                <div className="my-flag-photolog-card__overlay" />
                <span className="my-flag-photolog-card__title">{visit.spotTitle}</span>
              </article>
            ))
          )}

          <button
            type="button"
            className="my-flag-photolog-discover"
            onClick={() => setActiveTab('discovery')}
            aria-label="새로운 발견 탐색하기"
          >
            <div className="my-flag-photolog-discover__icon">
              <Camera size={20} color="#718079" />
            </div>
            <strong className="my-flag-photolog-discover__title">새로운 발견</strong>
            <span className="my-flag-photolog-discover__sub">발자국 남기기</span>
          </button>
        </div>
      </section>

      {/* 깃발 스킨 보관함 */}
      <section className="my-flag-section" aria-labelledby="skins-heading">
        <div className="my-flag-section__heading my-flag-section__heading--between">
          <div className="my-flag-section__heading-title">
            <h3 id="skins-heading">
              깃발 스킨 보관함 ({ownedSkins}/{skins.length} 보유)
            </h3>
          </div>
          <span className="my-flag-section__info-icon" title="보유 포인트로 스킨을 구매하고 장착할 수 있습니다.">
            <Info size={16} color="#718079" />
          </span>
        </div>

        {skins.length === 0 ? (
          <div className="my-flag-empty-card" role="status">
            등록된 스킨이 없습니다.
          </div>
        ) : (
          <div className="my-flag-skin-grid">
            {skins.map((skin) => {
              const owned = skin.owned === true;
              const equipped = skin.equipped === true || skin.isEquipped === true || equippedSkinId === skin.id;

              return (
                <article
                  key={skin.id}
                  className={`my-flag-skin-card ${equipped ? 'my-flag-skin-card--equipped' : ''} ${
                    !owned ? 'my-flag-skin-card--locked' : ''
                  }`}
                >
                  <div className="my-flag-skin-card__preview">
                    <div className="my-flag-skin-card__icon-circle">
                      <Flag size={20} />
                    </div>
                    {equipped && <span className="my-flag-skin-card__badge-dot" />}
                  </div>

                  <div className="my-flag-skin-card__info">
                    <strong className="my-flag-skin-card__name">{skin.name ?? skin.id}</strong>
                    <span className="my-flag-skin-card__desc">
                      {equipped ? '장착 중' : owned ? (skin.description ?? '보유 중') : `${skin.price ?? 0}P`}
                    </span>
                  </div>

                  <div className="my-flag-skin-card__action">
                    {equipped ? (
                      <button
                        type="button"
                        className="my-flag-skin-btn my-flag-skin-btn--equipped"
                        disabled
                        aria-label={`${skin.name ?? '스킨'} 장착 중`}
                      >
                        <Check size={12} />
                        <span>장착 중</span>
                      </button>
                    ) : owned ? (
                      <button
                        type="button"
                        className="my-flag-skin-btn my-flag-skin-btn--equip"
                        onClick={() => handleEquip(skin)}
                        aria-label={`${skin.name ?? '스킨'} 장착하기`}
                      >
                        <span>장착하기</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="my-flag-skin-btn my-flag-skin-btn--purchase"
                        onClick={() => handlePurchase(skin)}
                        aria-label={`${skin.name ?? '스킨'} ${skin.price ?? 0}P 교환하기`}
                      >
                        <strong>{skin.price ?? 0}</strong>
                        <span>P 교환</span>
                      </button>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {/* 토스트 알림 */}
      {toast && (
        <div className="check-in-map__range-notice my-flag-toast" role="status" aria-live="polite">
          {toast}
        </div>
      )}
    </main>
  );
}
