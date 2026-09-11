import { useQuery } from '@tanstack/react-query';
import { ArrowRight, CircleUserRound, Flag, ListFilter, Map, Search, Sparkles } from 'lucide-react';
import { useCallback, useState } from 'react';
import { getSpots } from '../../api/client';
import { useMe } from '../../hooks/useMe';
import { MapPreview } from '../../components/MapPreview';
import { SpotCard } from '../../components/SpotCard';
import { SpotDetail } from '../../components/SpotDetail';
import { SpotMapSheet } from '../../components/SpotMapSheet';
import { useUiStore } from '../../store/ui-store';
import type { ApiListResponse } from '../../types/api';
import type { Spot } from '../../types/spot';

const grades = ['S', 'A', 'B', 'C'] as const;

export function DiscoveryPage() {
  const { discoveryView, discoveryFilters, mapViewport, selectedSpot, setActiveTab, setDiscoveryView, setDiscoveryFilters, setSelectedSpot, setMapViewport } = useUiStore();
  const [isFilterOpen, setFilterOpen] = useState(false);
  const [searchInput, setSearchInput] = useState(discoveryFilters.query);
  const [detailSpot, setDetailSpot] = useState<Spot | null>(null);
  const meQuery = useMe();
  const hasActiveFilters = discoveryFilters.query.trim().length > 0
    || discoveryFilters.grades.length > 0
    || discoveryFilters.decliningArea;
  const spotsQuery = useQuery<ApiListResponse<Spot>>({
    queryKey: ['spots', discoveryFilters, mapViewport],
    placeholderData: (previous) => previous,
    queryFn: ({ signal }) => getSpots({
      areaCode: '1', sigunguCode: '23', limit: 20,
      q: discoveryFilters.query || undefined,
      grades: discoveryFilters.grades,
      decliningArea: discoveryFilters.decliningArea || undefined,
      ...(hasActiveFilters ? mapViewport ?? {} : {}),
    }, signal),
  });
  const spots = (spotsQuery.data?.data ?? []).filter((spot) => spot.geometryType !== 'EXCLUDE');
  if (detailSpot) return <SpotDetail spot={detailSpot} onClose={() => setDetailSpot(null)} />;

  const submitSearch = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setDiscoveryFilters({ query: searchInput.trim() });
  };

  const toggleGrade = (grade: (typeof grades)[number]) => {
    const next = discoveryFilters.grades.includes(grade)
      ? discoveryFilters.grades.filter((item) => item !== grade)
      : [...discoveryFilters.grades, grade];
    setDiscoveryFilters({ grades: next });
  };
  const handleViewportChange = useCallback((viewport: { minLat: number; minLng: number; maxLat: number; maxLng: number }) => {
    setMapViewport(viewport);
  }, [setMapViewport]);

  const source = spotsQuery.data?.meta.source;
  const mapSpots = spots;
  const activeSpot = selectedSpot ?? mapSpots[0] ?? null;
  return (
    <main className="page discovery-page">
      <header className="discovery-header">
        <div className="discovery-brand">
          <span className="discovery-brand__mark"><Sparkles size={16} /></span>
          <strong>Local Flag</strong>
        </div>
        <div className="discovery-header__actions">
          <div className="hero__balance"><small>보유 포인트</small><strong>{meQuery.isPending ? '...' : `${(meQuery.profile?.pointBalance ?? 0).toLocaleString()}P`}</strong></div>
          <button type="button" className="discovery-profile" aria-label="내 프로필"><CircleUserRound size={19} /></button>
        </div>
      </header>

      <section className="discovery-count" aria-label="플래그 수">
        <strong>{String(mapSpots.length).padStart(2, '0')}</strong>
        <span>/ {mapSpots.length ? '발견 장소' : '플래그'}</span>
      </section>

      <form className="search-row" onSubmit={submitSearch} role="search">
        <label className="search-box">
          <Search size={18} aria-hidden="true" />
          <span className="sr-only">장소 검색</span>
          <input value={searchInput} onChange={(event) => setSearchInput(event.target.value)} placeholder="지역이나 장소를 검색해보세요" />
        </label>
        <button type="button" className="icon-button" aria-label="필터 열기" aria-expanded={isFilterOpen} onClick={() => setFilterOpen((open) => !open)}>
          <ListFilter size={19} />
        </button>
      </form>

      {isFilterOpen && (
        <section className="filter-panel" aria-label="장소 필터">
          <div className="filter-panel__header"><strong>탐색 필터</strong><button type="button" onClick={() => setDiscoveryFilters({ grades: [], decliningArea: false })}>초기화</button></div>
          <div className="filter-chips" aria-label="등급 필터">
            {grades.map((grade) => <button type="button" className="filter-chip" data-active={discoveryFilters.grades.includes(grade)} key={grade} onClick={() => toggleGrade(grade)}>{grade} 등급</button>)}
          </div>
          <label className="filter-toggle"><input type="checkbox" checked={discoveryFilters.decliningArea} onChange={(event) => setDiscoveryFilters({ decliningArea: event.target.checked })} /> 인구감소지역만 보기</label>
        </section>
      )}

      <div className="discovery-view-row">
        <div className="view-toggle" role="group" aria-label="탐색 보기 방식">
          <button type="button" data-active={discoveryView === 'map'} onClick={() => setDiscoveryView('map')}><Map size={15} /> 지도</button>
          <button type="button" data-active={discoveryView === 'list'} onClick={() => setDiscoveryView('list')}>리스트</button>
        </div>
        {source && <span className="data-source" role="status">{source === 'tour-api' ? '실시간 장소' : '종로 추천 장소'}</span>}
      </div>
      {discoveryView === 'map' && <div className="discovery-map-stage">
        <div className="discovery-map-card"><MapPreview spots={mapSpots} selectedSpot={selectedSpot} onSelect={setSelectedSpot} onViewportChange={handleViewportChange} /></div>
        {activeSpot && <button type="button" className="discovery-map-callout" onClick={() => setSelectedSpot(activeSpot)}>
          <strong data-grade={activeSpot.grade ?? 'A'}>{activeSpot.grade ?? 'A'}</strong>
          <span>{activeSpot.title}</span>
          {activeSpot.estimatedReward !== undefined && <em>+{activeSpot.estimatedReward}P</em>}
        </button>}
      </div>}
      {selectedSpot && <SpotMapSheet spot={selectedSpot} onClose={() => setSelectedSpot(null)} onDetail={() => { setDetailSpot(selectedSpot); setSelectedSpot(null); }} />}

      {discoveryView === 'map' && activeSpot && <section className="discovery-selected-card" aria-label="선택된 장소">
        <div className="discovery-selected-card__icon"><Flag size={25} /></div>
        <div className="discovery-selected-card__body"><span>{activeSpot.grade ?? 'A'}등급</span><strong>{activeSpot.title}</strong><small>{activeSpot.address || '주소 정보 없음'} · {activeSpot.estimatedReward !== undefined ? `예상 ${activeSpot.estimatedReward}P` : '방문 장소'}</small></div>
        {activeSpot.estimatedReward !== undefined && <b>+{activeSpot.estimatedReward}P</b>}
      </section>}
      {discoveryView === 'map' && activeSpot && <button type="button" className="discovery-check-in-button" onClick={() => setActiveTab('check-in')}><Flag size={20} /> 현장 인증하기 <ArrowRight size={23} /></button>}

      <section className="section-block discovery-recommendations">
        <div className="section-heading"><div><p>발견 점수가 높은 곳</p><h2>{discoveryView === 'map' ? '추천 플래그' : '이번 주 추천 플래그'}</h2></div><span className="result-count">{mapSpots.length}곳</span></div>
        {spotsQuery.isPending && <StatusCard>숨은 장소를 찾고 있어요...</StatusCard>}
        {spotsQuery.isError && <StatusCard>장소를 불러오지 못했어요. 잠시 후 다시 시도해주세요.</StatusCard>}
        {!spotsQuery.isPending && !spotsQuery.isError && spots.length === 0 && <StatusCard>조건에 맞는 장소가 없어요. 필터를 바꿔보세요.</StatusCard>}
        <div className={`spot-list ${discoveryView === 'map' ? 'spot-list--carousel' : 'spot-list--vertical'}`}>{mapSpots.map((spot) => <SpotCard spot={spot} key={spot.id} onSelect={setSelectedSpot} />)}</div>
      </section>
    </main>
  );
}

function StatusCard({ children }: { children: React.ReactNode }) {
  return <div className="status-card" role="status">{children}</div>;
}
