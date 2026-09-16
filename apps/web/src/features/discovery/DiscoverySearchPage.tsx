import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Bookmark, ChevronDown, ChevronRight, Flag, Search, SlidersHorizontal } from 'lucide-react';
import { getSpots } from '../../api/client';
import { SpotImage } from '../../components/SpotImage';
import { useMe } from '../../hooks/useMe';
import type { ApiListResponse } from '../../types/api';
import type { Spot } from '../../types/spot';
import type { Ref } from 'react';

interface DiscoverySearchPageProps {
  onClose: () => void;
  closeButtonRef?: Ref<HTMLButtonElement>;
}

interface PopularCity {
  name: string;
  subtitle?: string;
  flagCount: number;
  isPopular?: boolean;
}

const POPULAR_CITIES: PopularCity[] = [
  { name: '서울', flagCount: 24, isPopular: true },
  { name: '부산', flagCount: 18 },
  { name: '양양', flagCount: 12 },
  { name: '경주', subtitle: '황리단길', flagCount: 15 },
  { name: '제주', subtitle: '구좌 · 비자림', flagCount: 20 },
  { name: '전주', subtitle: '한옥마을 고택', flagCount: 9 },
  { name: '강릉', subtitle: '초당 · 안목', flagCount: 14 },
];

export function DiscoverySearchPage({ onClose, closeButtonRef }: DiscoverySearchPageProps) {
  const meQuery = useMe();
  const spotsQuery = useQuery<ApiListResponse<Spot>>({
    queryKey: ['spots', { areaCode: '1', sigunguCode: '23' }],
    queryFn: ({ signal }) => getSpots({ areaCode: '1', sigunguCode: '23', limit: 20 }, signal),
  });

  const spots = (spotsQuery.data?.data ?? []).filter((spot) => spot.geometryType !== 'EXCLUDE');
  const topSpots = spots.slice(0, 5);
  const totalCount = spotsQuery.data?.meta.total ?? spots.length;
  const pointBalance = meQuery.isPending
    ? '— P'
    : meQuery.isError
      ? '확인 불가'
      : `${(meQuery.profile?.pointBalance ?? 0).toLocaleString()} P`;

  return (
    <div className="discovery-search-page">
      {/* 상단 고정 헤더 */}
      <header className="search-page-header">
        <div className="search-page-header__left">
          <button
            type="button"
            className="search-page-back"
            aria-label="지도 홈으로 돌아가기"
            ref={closeButtonRef}
            onClick={onClose}
          >
            <ArrowLeft size={22} />
          </button>
          <strong className="search-page-brand">Local Flag</strong>
        </div>
        <div className="search-page-header__right">
          <span className="search-page-balance-tag" aria-label="보유 포인트">
            {pointBalance}
          </span>
        </div>
      </header>

      <div className="search-page-content">
        {/* 어디로 떠나볼까요? 타이틀 & 포인트 */}
        <section className="search-title-section">
          <div className="search-title-row">
            <h1 className="search-title">어디로 떠나볼까요?</h1>
          </div>

          {/* 큰 검색 필드 (비활성) */}
          <div className="search-bar-display" role="search" aria-label="장소 검색 안내">
            <Search size={18} className="search-bar-display__icon" aria-hidden="true" />
            <span className="search-bar-display__text">가고 싶은 지역, 골목, 숨은 명소 검색</span>
            <SlidersHorizontal size={18} className="search-bar-display__filter-icon" aria-hidden="true" />
          </div>
        </section>

        {/* 인기 탐험 도시 */}
        <section className="popular-cities-section" aria-label="인기 탐험 도시">
          <div className="section-title-row">
            <h2 className="section-title">인기 탐험 도시</h2>
          </div>
          <div className="popular-cities-carousel">
            {POPULAR_CITIES.map((city) => (
              <div key={city.name} className="city-card">
                <div className="city-card__image-box">
                  <div className="city-card__placeholder-art" />
                  {city.isPopular && <span className="city-card__badge">인기</span>}
                </div>
                <strong className="city-card__name">{city.name}</strong>
                {city.subtitle && <span className="city-card__subtitle">{city.subtitle}</span>}
                <div className="city-card__flags">
                  <Flag size={10} fill="#F05D3F" stroke="none" />
                  <span>{city.flagCount}개 플래그</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 이번 주 추천 플래그 TOP 5 */}
        <section className="recommend-spots-section" aria-label="이번 주 추천 플래그 TOP 5">
          <div className="section-title-row">
            <h2 className="section-title">이번 주 추천 플래그 TOP 5</h2>
          </div>

          {topSpots.length > 0 && (
            <div className="recommend-spots-carousel">
              {topSpots.map((spot, index) => {
                const rank = index + 1;
                const specialTag =
                  index === 1
                    ? '특별 기념 깃발 증정'
                    : spot.isDecliningArea
                      ? '⚡ 인구감소지역 2.5배'
                      : null;

                return (
                  <article key={spot.id} className="recommend-card">
                    <div className="recommend-card__image-wrap">
                      <SpotImage src={spot.imageUrl} alt={`${spot.title} 이미지`} iconSize={24} />
                      <span className={`recommend-card__rank recommend-card__rank--${rank}`}>
                        {rank}위
                      </span>
                      <span className="recommend-card__bookmark" aria-hidden="true">
                        <Bookmark size={14} fill="#183B33" stroke="none" />
                      </span>
                      {specialTag && (
                        <div className="recommend-card__special-tag">
                          <span>{specialTag}</span>
                        </div>
                      )}
                    </div>

                    <div className="recommend-card__body">
                      <div className="recommend-card__meta">
                        <span className="recommend-card__grade" data-grade={spot.grade ?? 'A'}>
                          {spot.grade ?? 'A'}등급
                        </span>
                        <span className="recommend-card__address">{spot.address || '지역 정보 없음'}</span>
                      </div>
                      <h3 className="recommend-card__title">{spot.title}</h3>
                    </div>

                    <div className="recommend-card__bottom">
                      <div className="recommend-card__reward">
                        <Flag size={12} fill="#D54D35" stroke="none" />
                        <span>+{spot.estimatedReward ?? 100} P</span>
                      </div>
                      <button
                        type="button"
                        className="recommend-card__detail-btn"
                        disabled
                        aria-disabled="true"
                        aria-label={`${spot.title} 상세보기 (준비 중)`}
                      >
                        <span>상세보기</span>
                        <ChevronRight size={10} aria-hidden="true" />
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        {/* 전체 로컬 스팟 */}
        <section className="all-spots-section" aria-label="전체 로컬 스팟">
          <div className="all-spots-header">
            <div className="all-spots-title-group">
              <h2 className="section-title">전체 로컬 스팟</h2>
              <span className="all-spots-count">{totalCount}</span>
            </div>
            <button
              type="button"
              className="all-spots-sort-btn"
              disabled
              aria-disabled="true"
              aria-label="정렬 방식: 거리순 (변경 불가)"
            >
              <span>거리순</span>
              <ChevronDown size={14} aria-hidden="true" />
            </button>
          </div>

          {/* 필터 칩 (비활성) */}
          <div className="filter-chips-scroll" role="group" aria-label="필터 선택">
            <button
              type="button"
              className="search-filter-chip search-filter-chip--active"
              disabled
              aria-disabled="true"
            >
              전체
            </button>
            <button
              type="button"
              className="search-filter-chip"
              disabled
              aria-disabled="true"
            >
              <span className="filter-dot filter-dot--green" aria-hidden="true" />
              <span>인증 가능 반경</span>
            </button>
            <button
              type="button"
              className="search-filter-chip"
              disabled
              aria-disabled="true"
            >
              S·A등급
            </button>
            <button
              type="button"
              className="search-filter-chip"
              disabled
              aria-disabled="true"
            >
              <span className="filter-chip-bolt" aria-hidden="true">⚡</span>
              <span>인구감소지역 2.5배</span>
            </button>
          </div>

          {/* 상태 안내 */}
          {spotsQuery.isPending && (
            <div className="discovery-search-state" role="status">
              로컬 스팟을 불러오는 중...
            </div>
          )}
          {spotsQuery.isError && (
            <div className="discovery-search-state discovery-search-state--error" role="alert">
              스팟 목록을 불러오지 못했어요. 잠시 후 다시 시도해 주세요.
            </div>
          )}
          {!spotsQuery.isPending && !spotsQuery.isError && spots.length === 0 && (
            <div className="discovery-search-state" role="status">
              표시할 로컬 스팟이 없어요.
            </div>
          )}

          {/* 세로 카드 목록 */}
          <div className="all-spots-list">
            {spots.map((spot) => (
              <article key={spot.id} className="search-spot-card">
                <div className="search-spot-card__thumb">
                  <SpotImage src={spot.imageUrl} alt={`${spot.title} 썸네일`} iconSize={20} />
                  <span className="search-spot-card__grade" data-grade={spot.grade ?? 'A'}>
                    {spot.grade ?? 'A'}등급
                  </span>
                </div>
                <div className="search-spot-card__content">
                  <div className="search-spot-card__top">
                    <span className="search-spot-card__location">{spot.address || '주소 정보 없음'}</span>
                    <span className="search-spot-card__bookmark" aria-hidden="true">
                      <Bookmark size={14} fill="#718079" stroke="none" />
                    </span>
                  </div>
                  <h3 className="search-spot-card__title">{spot.title}</h3>
                  <div className="search-spot-card__bottom">
                    <div className="search-spot-card__reward">
                      <Flag size={10} fill="#D54D35" stroke="none" />
                      <span>+{spot.estimatedReward ?? 100} P</span>
                    </div>
                    {spot.isDecliningArea ? (
                      <span className="search-spot-card__tag search-spot-card__tag--boost">
                        ⚡ 2.5배 부스트
                      </span>
                    ) : (
                      <span className="search-spot-card__tag">
                        기념 스탬프 지급
                      </span>
                    )}
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

