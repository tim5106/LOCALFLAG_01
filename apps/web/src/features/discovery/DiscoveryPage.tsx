import { useQuery } from '@tanstack/react-query';
import { ListFilter, Map, Search, Sparkles } from 'lucide-react';
import { useState } from 'react';
import { getSpots } from '../../api/client';
import { MapPreview } from '../../components/MapPreview';
import { SpotCard } from '../../components/SpotCard';
import { SpotDetail } from '../../components/SpotDetail';
import { useUiStore } from '../../store/ui-store';

const grades = ['S', 'A', 'B', 'C'] as const;

export function DiscoveryPage() {
  const { discoveryView, discoveryFilters, selectedSpot, setDiscoveryView, setDiscoveryFilters, setSelectedSpot } = useUiStore();
  const [isFilterOpen, setFilterOpen] = useState(false);
  const [searchInput, setSearchInput] = useState(discoveryFilters.query);
  const spotsQuery = useQuery({
    queryKey: ['spots', discoveryFilters],
    queryFn: ({ signal }) => getSpots({
      q: discoveryFilters.query || undefined,
      grades: discoveryFilters.grades,
      decliningArea: discoveryFilters.decliningArea || undefined,
      areaCode: discoveryFilters.areaCode,
      sigunguCode: discoveryFilters.sigunguCode,
    }, signal),
  });
  const spots = spotsQuery.data?.data ?? [];
  if (selectedSpot) return <SpotDetail spot={selectedSpot} onClose={() => setSelectedSpot(null)} />;

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

  return (
    <main className="page discovery-page">
      <header className="hero">
        <div>
          <p className="eyebrow"><Sparkles size={15} /> 오늘의 로컬 발견</p>
          <h1>사람들보다 먼저<br />숨은 장소를 발견해보세요</h1>
        </div>
        <div className="hero__balance"><small>보유 포인트</small><strong>1,250P</strong></div>
      </header>

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

      <div className="view-toggle" role="group" aria-label="탐색 보기 방식">
        <button type="button" data-active={discoveryView === 'map'} onClick={() => setDiscoveryView('map')}><Map size={15} /> 지도</button>
        <button type="button" data-active={discoveryView === 'list'} onClick={() => setDiscoveryView('list')}>리스트</button>
      </div>
      {discoveryView === 'map' && <MapPreview spots={spots} onSelect={setSelectedSpot} />}

      <section className="section-block">
        <div className="section-heading"><div><p>발견 점수가 높은 곳</p><h2>이번 주 추천 플래그</h2></div><span className="result-count">{spots.length}곳</span></div>
        {spotsQuery.isPending && <StatusCard>숨은 장소를 찾고 있어요...</StatusCard>}
        {spotsQuery.isError && <StatusCard>장소를 불러오지 못했어요. 잠시 후 다시 시도해주세요.</StatusCard>}
        {!spotsQuery.isPending && !spotsQuery.isError && spots.length === 0 && <StatusCard>조건에 맞는 장소가 없어요. 필터를 바꿔보세요.</StatusCard>}
        <div className="spot-list">{spots.map((spot) => <SpotCard spot={spot} key={spot.id} onSelect={setSelectedSpot} />)}</div>
      </section>
    </main>
  );
}

function StatusCard({ children }: { children: React.ReactNode }) {
  return <div className="status-card" role="status">{children}</div>;
}
