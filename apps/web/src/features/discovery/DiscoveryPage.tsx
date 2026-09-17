import { useQuery } from '@tanstack/react-query';
import { ArrowRight, CircleUserRound, Flag, Search, Sprout } from 'lucide-react';
import { useMemo, useRef, useState } from 'react';
import { getMyMap, getSpots, type MyFlagMap } from '../../api/client';
import { MapPreview } from '../../components/MapPreview';
import { SpotDetail } from '../../components/SpotDetail';
import { useMe } from '../../hooks/useMe';
import { useUiStore } from '../../store/ui-store';
import type { ApiListResponse } from '../../types/api';
import type { Spot } from '../../types/spot';
import { calculateDistanceMeters, formatDistance } from '../check-in/distance';
import { DiscoverySearchSheet } from './DiscoverySearchSheet';

export function DiscoveryPage() {
  const selectedSpot = useUiStore((store) => store.selectedSpot);
  const setActiveTab = useUiStore((store) => store.setActiveTab);
  const setSelectedSpot = useUiStore((store) => store.setSelectedSpot);
  const openProfile = useUiStore((store) => store.openProfile);
  const openShop = useUiStore((store) => store.openShop);
  const discoveryView = useUiStore((store) => store.discoveryView);
  const setDiscoveryView = useUiStore((store) => store.setDiscoveryView);
  const [detailSpot, setDetailSpot] = useState<Spot | null>(null);
  const [userLocation, setUserLocation] = useState<Spot['location'] | null>(null);
  const searchButtonRef = useRef<HTMLButtonElement>(null);
  const meQuery = useMe();
  const spotsQuery = useQuery<ApiListResponse<Spot>>({
    queryKey: ['spots', { areaCode: '1', sigunguCode: '23' }],
    queryFn: ({ signal }) => getSpots({ areaCode: '1', sigunguCode: '23', limit: 20 }, signal),
  });
  const mapQuery = useQuery<{ data: MyFlagMap }>({ queryKey: ['my-map'], queryFn: getMyMap, retry: false });
  const spots = (spotsQuery.data?.data ?? []).filter((spot) => spot.geometryType !== 'EXCLUDE');
  const activeSpot = selectedSpot ?? spots[0] ?? null;
  const visitedSpotIds = useMemo(
    () => new Set((mapQuery.data?.data?.visits ?? []).map((visit) => visit.spotId)),
    [mapQuery.data]
  );
  const equippedSkinId = meQuery.profile?.equippedFlagSkinId ?? mapQuery.data?.data?.equippedFlagSkinId ?? null;
  const visitedCount = mapQuery.data ? visitedSpotIds.size : null;
  const totalCount = spotsQuery.data?.meta.total ?? (spotsQuery.data ? spots.length : null);
  const distance = activeSpot && userLocation
    ? formatDistance(calculateDistanceMeters(userLocation.lat, userLocation.lng, activeSpot.location.lat, activeSpot.location.lng))
    : null;
  const checkInAvailable = Boolean(activeSpot && activeSpot.geometryType === 'POINT' && activeSpot.checkInEnabled !== false);
  const isSpotVisited = Boolean(activeSpot && visitedSpotIds.has(activeSpot.id));

  if (detailSpot) return <SpotDetail spot={detailSpot} onClose={() => setDetailSpot(null)} />;
  const isSearchOpen = discoveryView === 'search';
  const closeSearch = () => {
    setDiscoveryView('map');
    searchButtonRef.current?.focus();
  };

  const startCheckIn = () => {
    if (!activeSpot || !checkInAvailable || isSpotVisited) return;
    setSelectedSpot(activeSpot);
    setActiveTab('check-in');
  };

  const accountMessage = [
    meQuery.isError ? '포인트 정보를 확인할 수 없어요.' : null,
    mapQuery.isError ? '방문 플래그 수를 확인할 수 없어요.' : null,
  ].filter(Boolean).join(' ');

  return (
    <main className="page discovery-page">
      <header className="discovery-header">
        <div className="discovery-brand">
          <h1>Local Flag</h1>
        </div>
        <div className="discovery-header__actions">
          <button
            type="button"
            className="discovery-balance"
            aria-label="보유 포인트"
            onClick={openShop}
          >
            {meQuery.isPending ? '— P' : meQuery.isError ? '확인 불가' : `${(meQuery.profile?.pointBalance ?? 0).toLocaleString()} P`}
          </button>
          <button type="button" className="discovery-profile" aria-label="내 프로필" onClick={() => openProfile('discovery')}>
            <CircleUserRound size={20} />
          </button>
        </div>
      </header>

      <div className="discovery-toolbar">
        <section className="discovery-count" aria-label="플래그 수집 현황" aria-busy={mapQuery.isPending || spotsQuery.isPending}>
          <strong>{visitedCount === null ? '--' : String(visitedCount).padStart(2, '0')}</strong>{' '}
          <span>/ {totalCount === null ? '--' : totalCount.toLocaleString()} 플래그</span>
        </section>
        <button
          type="button"
          className="discovery-search"
          aria-label="장소 검색"
          ref={searchButtonRef}
          onClick={() => setDiscoveryView('search')}
        >
          <Search size={18} aria-hidden="true" />
          <span>Search...</span>
        </button>
      </div>
      {accountMessage && <p className="discovery-account-state" role="alert">{accountMessage}</p>}

      <section className="discovery-map-stage" aria-label="플래그 탐색 지도">
        <div className="discovery-map-card">
          <MapPreview
            spots={spots}
            selectedSpot={activeSpot}
            visitedSpotIds={visitedSpotIds}
            equippedSkinId={equippedSkinId}
            onSelect={setSelectedSpot}
            onUserLocationChange={setUserLocation}
          />
        </div>
        {activeSpot && (
          <button type="button" className="discovery-map-callout" onClick={() => setSelectedSpot(activeSpot)}>
            <strong data-grade={activeSpot.grade ?? 'A'}>{activeSpot.grade ?? 'A'}</strong>
            <span>{activeSpot.title}</span>
            {activeSpot.estimatedReward !== undefined && <em>+{activeSpot.estimatedReward}P</em>}
          </button>
        )}
        {spotsQuery.isPending && <div className="discovery-map-state" role="status">플래그 지도를 불러오는 중...</div>}
        {spotsQuery.isError && <div className="discovery-map-state discovery-map-state--error" role="alert">지도를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.</div>}
        {!spotsQuery.isPending && !spotsQuery.isError && spots.length === 0 && <div className="discovery-map-state" role="status">표시할 플래그가 없어요.</div>}
      </section>

      {activeSpot && (
        <div className="discovery-actions">
          <button type="button" className="discovery-selected-card" aria-label={`${activeSpot.title} 상세 보기`} onClick={() => setDetailSpot(activeSpot)}>
            <span className="discovery-selected-card__icon"><Sprout size={27} /></span>
            <span className="discovery-selected-card__body">
              <span>{activeSpot.grade ?? 'A'}등급</span>
              <strong>{activeSpot.title}</strong>
              <small>{activeSpot.address || '주소 정보 없음'}{distance ? ` · ${distance}` : ''}</small>
            </span>
            {activeSpot.estimatedReward !== undefined && <b>+{activeSpot.estimatedReward} P</b>}
          </button>
          <button
            type="button"
            className={`discovery-check-in-button${isSpotVisited ? ' discovery-check-in-button--completed' : ''}`}
            onClick={startCheckIn}
            disabled={!checkInAvailable || isSpotVisited}
            aria-describedby={!checkInAvailable ? 'check-in-unavailable' : isSpotVisited ? 'check-in-completed' : undefined}
          >
            <Flag size={17} fill="currentColor" />
            <span>현장 인증하기</span>
            <ArrowRight size={20} />
          </button>
          {!checkInAvailable && <p id="check-in-unavailable" className="discovery-check-in-note">이 장소는 현장 인증을 지원하지 않아요.</p>}
          {checkInAvailable && isSpotVisited && <p id="check-in-completed" className="discovery-check-in-note">이미 인증한 장소입니다.</p>}
        </div>
      )}
      <DiscoverySearchSheet open={isSearchOpen} onClose={closeSearch} />
    </main>
  );
}
