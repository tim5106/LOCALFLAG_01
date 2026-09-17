import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Flag } from 'lucide-react';
import { useState } from 'react';
import { getFlagSkins, getMe, type FlagSkin, type MeProfile } from '../../api/client';
import { useUiStore } from '../../store/ui-store';
import { PointShopDetailSheet } from './PointShopDetailSheet';
import './point-shop.css';

export function PointShopPage() {
  const closeShop = useUiStore((state) => state.closeShop);
  const [selectedSkin, setSelectedSkin] = useState<FlagSkin | null>(null);
  const [brokenImages, setBrokenImages] = useState<Record<string, boolean>>({});

  const profileQuery = useQuery<{ data: MeProfile }>({
    queryKey: ['me'],
    queryFn: getMe,
    retry: false,
  });

  const skinsQuery = useQuery<{ data: FlagSkin[] }>({
    queryKey: ['flag-skins'],
    queryFn: getFlagSkins,
    retry: false,
  });

  const profile = profileQuery.data?.data;
  const skins = skinsQuery.data?.data ?? [];
  const pointBalance = profile?.pointBalance;
  const equippedSkinId = profile?.equippedFlagSkinId;

  const handleImageError = (skinId: string) => {
    setBrokenImages((prev) => ({ ...prev, [skinId]: true }));
  };

  const balanceText = profileQuery.isPending
    ? '— P'
    : profileQuery.isError || typeof pointBalance !== 'number'
      ? '확인 불가'
      : `${pointBalance.toLocaleString()} P`;

  const renderContent = () => {
    if (skinsQuery.isPending) {
      return (
        <div className="point-shop-grid" data-testid="point-shop-skeleton">
          {[1, 2, 3, 4].map((n) => (
            <div key={n} className="point-shop-skeleton-card">
              <div className="point-shop-skeleton-img" />
              <div className="point-shop-skeleton-text" style={{ width: '70%' }} />
              <div className="point-shop-skeleton-text" style={{ width: '40%' }} />
            </div>
          ))}
        </div>
      );
    }

    if (skinsQuery.isError) {
      return (
        <div className="point-shop-error-card" role="alert">
          <p>상점 정보를 불러오지 못했습니다.</p>
          <button
            type="button"
            className="point-shop-retry-btn"
            onClick={() => skinsQuery.refetch()}
          >
            다시 시도
          </button>
        </div>
      );
    }

    if (skins.length === 0) {
      return (
        <div className="point-shop-empty" role="status">
          등록된 상품이 없습니다.
        </div>
      );
    }

    return (
      <div className="point-shop-grid">
        {skins.map((skin) => {
          const isEquipped = skin.equipped === true || equippedSkinId === skin.id;
          const isOwned = skin.owned === true;
          const hasBalance = !profileQuery.isPending && !profileQuery.isError && typeof pointBalance === 'number';
          const canAfford = hasBalance && (pointBalance as number) >= skin.price;

          let badgeLabel = '구매 가능';
          let badgeClass = 'point-shop-card__badge--available';

          if (isEquipped) {
            badgeLabel = '장착 중';
            badgeClass = 'point-shop-card__badge--equipped';
          } else if (isOwned) {
            badgeLabel = '보유 중';
            badgeClass = 'point-shop-card__badge--owned';
          } else if (!canAfford) {
            badgeLabel = '포인트 부족';
            badgeClass = 'point-shop-card__badge--insufficient';
          }

          return (
            <article
              key={skin.id}
              className="point-shop-card"
              onClick={() => setSelectedSkin(skin)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setSelectedSkin(skin);
                }
              }}
              aria-label={`${skin.name} 상세 보기`}
            >
              <div className="point-shop-card__preview">
                {skin.assetUrl && !brokenImages[skin.id] ? (
                  <img
                    src={skin.assetUrl}
                    alt={skin.name}
                    className="point-shop-card__img"
                    onError={() => handleImageError(skin.id)}
                  />
                ) : (
                  <div className="point-shop-card__icon-circle">
                    <Flag size={22} color="#173F35" />
                  </div>
                )}
              </div>

              <div className="point-shop-card__info">
                <strong className="point-shop-card__name">{skin.name}</strong>
                <div className="point-shop-card__bottom">
                  <span className="point-shop-card__price">
                    {skin.price.toLocaleString()} P
                  </span>
                  <span className={`point-shop-card__badge ${badgeClass}`}>
                    {badgeLabel}
                  </span>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    );
  };

  return (
    <main className="page point-shop-page">
      {/* 상단 헤더 */}
      <header className="point-shop-header">
        <div className="point-shop-header__left">
          <button
            type="button"
            className="point-shop-header__back-btn"
            aria-label="뒤로가기"
            onClick={closeShop}
          >
            <ArrowLeft size={22} strokeWidth={2.2} />
          </button>
          <h1 className="point-shop-header__title">포인트 상점</h1>
        </div>
        <div className="point-shop-header__balance" aria-label="보유 포인트">
          {balanceText}
        </div>
      </header>

      {/* 상품 목록 */}
      {renderContent()}

      {/* 하단 새로운 리워드 준비중 배너 */}
      <section className="point-shop-reward-banner" aria-label="추가 리워드 준비 안내">
        <span className="point-shop-reward-banner__badge">COMING SOON</span>
        <h2 className="point-shop-reward-banner__title">새로운 리워드 준비 중</h2>
        <p className="point-shop-reward-banner__desc">
          새로운 리워드가 곧 찾아옵니다! 더 다양한 혜택을 준비하고 있어요.
        </p>
      </section>

      {/* 상세 바텀시트 */}
      {selectedSkin && (
        <PointShopDetailSheet
          skin={selectedSkin}
          userBalance={pointBalance}
          isBalanceLoading={profileQuery.isPending}
          isBalanceError={profileQuery.isError}
          isEquipped={selectedSkin.equipped === true || equippedSkinId === selectedSkin.id}
          onClose={() => setSelectedSkin(null)}
        />
      )}
    </main>
  );
}

