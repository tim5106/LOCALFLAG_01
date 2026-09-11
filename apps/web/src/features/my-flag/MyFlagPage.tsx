import { Flag, LockKeyhole, Palette, RefreshCw } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { equipFlagSkin, getFlagSkins, getMe, getMyMap, getPointLedger, purchaseFlagSkin } from '../../api/client';
import { MapPreview } from '../../components/MapPreview';
import type { Spot } from '../../types/spot';

type Profile = { nickname?: string | null; pointBalance?: number; equippedFlagSkinId?: string | null };
type LedgerEntry = { amount?: number; balanceAfter?: number; type?: string; createdAt?: string; description?: string };
type Skin = { id: string; name?: string; description?: string; price?: number; owned?: boolean; equipped?: boolean; isEquipped?: boolean };
type Visit = { spotId: number; spotTitle: string; location: { lat: number; lng: number }; visitedAt: string; rewardPoints: number; status: 'SUCCESS' };
type MyMap = { equippedFlagSkinId: string | null; visits: Visit[] };

function visitsToSpots(visits: Visit[]): Spot[] { return visits.map((visit) => ({ id: visit.spotId, title: visit.spotTitle, address: '', contentTypeId: 12, isDecliningArea: false, imageUrl: null, status: 'ACTIVE', checkInEnabled: false, checkInCompleted: true, location: visit.location })); }

export function MyFlagPage() {
  const queryClient = useQueryClient();
  const [toast, setToast] = useState('');
  const profileQuery = useQuery({ queryKey: ['me'], queryFn: getMe, retry: false });
  const ledgerQuery = useQuery({ queryKey: ['point-ledger'], queryFn: getPointLedger, retry: false });
  const skinsQuery = useQuery({ queryKey: ['flag-skins'], queryFn: getFlagSkins, retry: false });
  const mapQuery = useQuery({ queryKey: ['my-map'], queryFn: getMyMap, retry: false });
  const profile = (profileQuery.data as { data?: Profile } | undefined)?.data;
  const ledger = ((ledgerQuery.data as { data?: LedgerEntry[] } | undefined)?.data ?? []);
  const skins = ((skinsQuery.data as { data?: Skin[] } | undefined)?.data ?? []);
  const myMap = (mapQuery.data as { data?: MyMap } | undefined)?.data;
  const visits = myMap?.visits ?? [];
  const ownedSkins = skins.filter((skin) => skin.owned === true).length;
  const collectionProgress = skins.length ? Math.round((ownedSkins / skins.length) * 100) : 0;
  const equippedSkinId = profile?.equippedFlagSkinId ?? myMap?.equippedFlagSkinId ?? null;
  const isLoading = profileQuery.isPending || ledgerQuery.isPending || skinsQuery.isPending || mapQuery.isPending;
  const hasError = profileQuery.isError || ledgerQuery.isError || skinsQuery.isError || mapQuery.isError;
  const refreshAccount = async () => Promise.all([queryClient.invalidateQueries({ queryKey: ['me'] }), queryClient.invalidateQueries({ queryKey: ['point-ledger'] }), queryClient.invalidateQueries({ queryKey: ['flag-skins'] })]);
  const handlePurchase = async (skin: Skin) => { try { await purchaseFlagSkin(skin.id); await refreshAccount(); setToast(`${skin.name ?? '스킨'}을 구매했습니다.`); } catch (error) { setToast(error instanceof Error ? error.message : '스킨 구매에 실패했습니다.'); } };
  const handleEquip = async (skin: Skin) => { try { await equipFlagSkin(skin.id); await refreshAccount(); setToast(`${skin.name ?? '스킨'}을 장착했습니다.`); } catch (error) { setToast(error instanceof Error ? error.message : '스킨 장착에 실패했습니다.'); } };

  if (isLoading) return <main className="page my-flag-page"><div className="status-card"><RefreshCw className="spin" size={18} /> 마이 플래그 정보를 불러오는 중입니다.</div></main>;
  if (hasError && !profile) return <main className="page my-flag-page"><div className="status-card" role="alert">마이 플래그 정보를 확인할 수 없습니다.</div></main>;
  return <main className="page my-flag-page">
    <header className="simple-header my-flag-header"><p className="eyebrow"><Flag size={15} /> MY FLAG</p><h1>{profile?.nickname ? `${profile.nickname}의 플래그` : '나만의 로컬 지도를 만들어보세요'}</h1></header>
    {hasError && <p className="auth-error" role="alert">일부 마이 플래그 정보를 불러오지 못했습니다.</p>}
    <section className="profile-summary profile-summary--hero"><div className="profile-summary__flag"><Flag size={28} /></div><div><small>보유 포인트</small><strong>{(profile?.pointBalance ?? 0).toLocaleString()}P</strong></div><div className="profile-summary__points"><small>최근 거래</small><strong>{ledger.length}건</strong></div></section>
    <section className="collection-card"><div className="collection-card__top"><div><small>플래그 컬렉션</small><strong>{collectionProgress}% 수집</strong></div><span>{ownedSkins} / {skins.length || 0}</span></div><div className="progress-track"><span style={{ width: `${collectionProgress}%` }} /></div><div className="collection-stats"><span><strong>{visits.length}</strong><small>방문 장소</small></span><span><strong>{ownedSkins}</strong><small>보유 스킨</small></span><span><strong>{ledger.length}</strong><small>포인트 기록</small></span></div></section>
    <section className="section-block my-flag-section"><div className="section-heading"><div><p>나의 방문 기록</p><h2>방문 지도</h2></div><span className="result-count">{visits.length}곳</span></div>{visits.length === 0 ? <div className="status-card">아직 방문한 장소가 없습니다.</div> : <MapPreview spots={visitsToSpots(visits)} />}</section>
    <section className="section-block my-flag-section"><div className="section-heading"><div><p>포인트 사용·적립 기록</p><h2>포인트 내역</h2></div></div>{ledger.length === 0 ? <div className="status-card">아직 포인트 내역이 없습니다.</div> : <div className="point-ledger-list">{ledger.map((entry, index) => <article className="point-ledger-row" key={`${entry.createdAt ?? 'entry'}-${index}`}><div><strong>{entry.description ?? entry.type ?? '포인트 거래'}</strong><small>{entry.createdAt ? new Date(entry.createdAt).toLocaleDateString('ko-KR') : ''}</small></div><strong className={Number(entry.amount) >= 0 ? 'point-positive' : 'point-negative'}>{Number(entry.amount) >= 0 ? '+' : ''}{entry.amount ?? 0}P</strong></article>)}</div>}</section>
    <section className="section-block my-flag-section"><div className="section-heading"><div><p>포인트로 꾸미는 나만의 플래그</p><h2>플래그 스킨</h2></div><span className="result-count">{ownedSkins}/{skins.length}</span></div>{skins.length === 0 ? <div className="status-card">등록된 스킨이 없습니다.</div> : <div className="skin-grid">{skins.map((skin) => { const owned = skin.owned === true; const equipped = skin.equipped === true || skin.isEquipped === true || equippedSkinId === skin.id; return <article className={`skin-card${equipped ? ' skin-card--active' : ''}${!owned ? ' skin-card--locked' : ''}`} key={skin.id}>{!owned ? <LockKeyhole size={22} /> : equipped ? <Flag size={22} /> : <Palette size={22} />}<strong>{skin.name ?? skin.id}</strong><small>{equipped ? '장착 중' : owned ? '보유 중' : `${skin.price ?? 0}P`}</small>{!owned ? <button type="button" className="primary-button" onClick={() => handlePurchase(skin)}>구매하기</button> : !equipped ? <button type="button" className="primary-button" onClick={() => handleEquip(skin)}>장착하기</button> : <button type="button" className="primary-button" disabled>장착 됨</button>}</article>; })}</div>}</section>
    {toast && <div className="check-in-map__range-notice" role="status" aria-live="polite">{toast}</div>}
  </main>;
}
