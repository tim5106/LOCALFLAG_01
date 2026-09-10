import { Flag, LockKeyhole, Palette, RefreshCw, Trophy } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { getFlagSkins, getMe, getPointLedger } from '../../api/client';

type Profile = { nickname?: string; pointBalance?: number; equippedFlagSkinId?: string | null };
type LedgerEntry = { amount?: number; balanceAfter?: number; type?: string; createdAt?: string; description?: string };
type Skin = { id?: string; name?: string; price?: number; owned?: boolean; isEquipped?: boolean };

export function MyFlagPage() {
  const profileQuery = useQuery({ queryKey: ['me'], queryFn: getMe, retry: false });
  const ledgerQuery = useQuery({ queryKey: ['point-ledger'], queryFn: getPointLedger, retry: false });
  const skinsQuery = useQuery({ queryKey: ['flag-skins'], queryFn: getFlagSkins, retry: false });
  const profile = (profileQuery.data as { data?: Profile } | undefined)?.data;
  const ledger = ((ledgerQuery.data as { data?: LedgerEntry[] } | undefined)?.data ?? []);
  const skins = ((skinsQuery.data as { data?: Skin[] } | undefined)?.data ?? []);
  const isLoading = profileQuery.isPending || ledgerQuery.isPending || skinsQuery.isPending;
  const hasError = profileQuery.isError || ledgerQuery.isError || skinsQuery.isError;

  if (isLoading) return <main className="page my-flag-page"><div className="status-card"><RefreshCw className="spin" size={18} /> 마이 플래그 정보를 불러오는 중입니다.</div></main>;
  if (hasError && !profile) return <main className="page my-flag-page"><div className="status-card" role="alert">로그인 후 마이 플래그 정보를 확인할 수 있습니다.</div></main>;

  return <main className="page my-flag-page">
    <header className="simple-header my-flag-header"><p className="eyebrow"><Flag size={15} /> 마이 플래그</p><h1>{profile?.nickname ? `${profile.nickname}님의 플래그` : '나만의 로컬 지도를 만들어가요'}</h1></header>
    {hasError && <p className="auth-error" role="alert">일부 마이 플래그 정보를 불러오지 못했습니다.</p>}
    <section className="profile-summary"><div className="profile-summary__flag"><Flag size={28} /></div><div><small>현재 포인트</small><strong>{profile?.pointBalance ?? 0}P</strong></div><div className="profile-summary__points"><small>최근 거래</small><strong>{ledger.length}건</strong></div></section>
    <section className="section-block"><div className="section-heading"><div><p>포인트 사용·적립 기록</p><h2>포인트 내역</h2></div></div>{ledger.length === 0 ? <div className="status-card">아직 포인트 내역이 없습니다.</div> : <div className="point-ledger-list">{ledger.map((entry, index) => <article className="point-ledger-row" key={`${entry.createdAt ?? 'entry'}-${index}`}><div><strong>{entry.description ?? entry.type ?? '포인트 거래'}</strong><small>{entry.createdAt ? new Date(entry.createdAt).toLocaleDateString('ko-KR') : ''}</small></div><strong className={Number(entry.amount) >= 0 ? 'point-positive' : 'point-negative'}>{Number(entry.amount) >= 0 ? '+' : ''}{entry.amount ?? 0}P</strong></article>)}</div>}</section>
    <section className="section-block"><div className="section-heading"><div><p>포인트로 꾸미는 플래그</p><h2>플래그 스킨</h2></div></div>{skins.length === 0 ? <div className="status-card">등록된 스킨이 없습니다.</div> : <div className="skin-grid">{skins.map((skin, index) => <button type="button" className={`skin-card${skin.isEquipped || skin.id === profile?.equippedFlagSkinId ? ' skin-card--active' : ''}${skin.owned === false ? ' skin-card--locked' : ''}`} key={skin.id ?? index}><>{skin.owned === false ? <LockKeyhole size={22} /> : skin.isEquipped ? <Flag size={22} /> : <Palette size={22} />}</><strong>{skin.name ?? skin.id ?? '스킨'}</strong><small>{skin.isEquipped ? '장착 중' : skin.owned === false ? `${skin.price ?? 0}P` : '보유 중'}</small></button>)}</div>}</section>
  </main>;
}
