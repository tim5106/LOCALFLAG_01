import { Skeleton } from '../../components/Skeleton';

export function MyFlagSkeleton() {
  return (
    <main className="my-flag-page" data-testid="my-flag-skeleton">
      {/* 헤더 */}
      <header className="my-flag-header">
        <div className="my-flag-header__brand">
          <h1>Local Flag</h1>
        </div>
      </header>

      {/* 인트로 문구 */}
      <div className="my-flag-intro">
        <Skeleton width="180px" height="24px" style={{ marginBottom: '8px' }} />
        <Skeleton width="140px" height="24px" />
      </div>

      {/* 컬렉션 레벨 & 포인트 카드 */}
      <div className="my-flag-hero-card">
        <div className="my-flag-hero-card__left" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <Skeleton width="140px" height="22px" borderRadius="12px" />
          <Skeleton width="120px" height="16px" />
        </div>
        <div className="my-flag-hero-card__right" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px' }}>
          <Skeleton width="56px" height="12px" />
          <Skeleton width="80px" height="24px" />
        </div>
      </div>

      {/* 플래그 진행률 카드 */}
      <div className="my-flag-progress-card">
        <div className="my-flag-progress-card__header">
          <div className="my-flag-progress-card__title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Skeleton width="20px" height="20px" borderRadius="50%" />
            <Skeleton width="48px" height="18px" />
          </div>
          <Skeleton width="36px" height="18px" />
        </div>

        <div className="my-flag-progress-card__bar-wrap">
          <Skeleton width="100%" height="8px" borderRadius="999px" />
          <div className="my-flag-progress-card__count" style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '6px' }}>
            <Skeleton width="36px" height="14px" />
          </div>
        </div>

        <div className="my-flag-progress-card__grades">
          {[1, 2, 3, 4].map((grade) => (
            <div key={grade} className="my-flag-grade-badge" style={{ background: '#F4F5F4' }}>
              <Skeleton width="22px" height="22px" borderRadius="50%" />
              <Skeleton width="32px" height="16px" style={{ marginTop: '2px' }} />
            </div>
          ))}
        </div>
      </div>

      {/* 필드 인증 포토로그 */}
      <div className="my-flag-section">
        <div className="my-flag-section__heading" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Skeleton width="20px" height="20px" borderRadius="4px" />
          <Skeleton width="130px" height="20px" />
        </div>

        <div className="my-flag-photolog-grid">
          {[1, 2, 3].map((card) => (
            <div key={card} className="my-flag-photolog-card" style={{ background: 'transparent' }}>
              <Skeleton width="100%" height="100%" borderRadius="16px" />
            </div>
          ))}
        </div>
      </div>

      {/* 깃발 스킨 보관함 */}
      <div className="my-flag-section">
        <div className="my-flag-section__heading" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Skeleton width="160px" height="20px" />
        </div>

        <div className="my-flag-skin-grid">
          {[1, 2, 3, 4].map((skin) => (
            <div key={skin} className="my-flag-skin-card">
              <Skeleton width="100%" height="110px" borderRadius="12px" />
              <div className="my-flag-skin-card__info" style={{ alignItems: 'center', margin: '10px 0' }}>
                <Skeleton width="70%" height="14px" style={{ marginBottom: '4px' }} />
                <Skeleton width="45%" height="11px" />
              </div>
              <Skeleton width="100%" height="32px" borderRadius="12px" />
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}

