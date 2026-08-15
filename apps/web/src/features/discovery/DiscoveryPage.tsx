import { useQuery } from '@tanstack/react-query';
import { ListFilter, Search, Sparkles } from 'lucide-react';
import { getSpots } from '../../api/client';
import { MapPreview } from '../../components/MapPreview';
import { SpotCard } from '../../components/SpotCard';

export function DiscoveryPage() {
  const spotsQuery = useQuery({
    queryKey: ['spots'],
    queryFn: ({ signal }) => getSpots(signal),
  });

  const spots = spotsQuery.data?.data ?? [];

  return (
    <main className="page discovery-page">
      <header className="hero">
        <div>
          <p className="eyebrow"><Sparkles size={15} /> 이번 주말의 로컬</p>
          <h1>사람들보다 한 발 먼저<br />숨은 장소에 깃발을 꽂아보세요.</h1>
        </div>
        <div className="hero__balance">
          <small>내 포인트</small>
          <strong>1,250P</strong>
        </div>
      </header>

      <div className="search-row">
        <label className="search-box">
          <Search size={18} />
          <span className="sr-only">장소 검색</span>
          <input placeholder="지역이나 숨은 명소 검색" />
        </label>
        <button type="button" className="icon-button" aria-label="필터 열기">
          <ListFilter size={19} />
        </button>
      </div>

      <MapPreview spots={spots} />

      <section className="section-block">
        <div className="section-heading">
          <div>
            <p>발견 점수가 높은 곳</p>
            <h2>이번 주 추천 플래그</h2>
          </div>
          <button type="button">전체 보기</button>
        </div>

        {spotsQuery.isPending && <StatusCard>숨은 장소를 찾고 있어요...</StatusCard>}
        {spotsQuery.isError && (
          <StatusCard>
            API 서버를 실행하면 추천 장소가 표시됩니다. <code>npm run dev:api</code>
          </StatusCard>
        )}
        <div className="spot-list">
          {spots.map((spot) => <SpotCard spot={spot} key={spot.id} />)}
        </div>
      </section>
    </main>
  );
}

function StatusCard({ children }: { children: React.ReactNode }) {
  return <div className="status-card">{children}</div>;
}

