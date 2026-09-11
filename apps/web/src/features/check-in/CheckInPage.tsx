import { Crosshair, RefreshCw, ShieldCheck } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { createCheckIn, getNearbySpots, precheckSpot, type PositionInput } from '../../api/client';
import { CheckInApiError } from '../../types/api';
import type { Spot } from '../../types/spot';
import { CheckInMap } from '../../components/CheckInMap';
import { CHECK_IN_RADIUS_METERS } from './distance';
import type { CheckInResult as ApiCheckInResult, PrecheckResult } from './api-types';

type LocationState = 'idle' | 'requesting' | 'measured' | 'denied' | 'inaccurate' | 'out-of-range' | 'unsupported';
type CheckInModal = { status: 'success' | 'pending' | 'failure'; points?: number; message: string };

export function CheckInPage() {
  const queryClient = useQueryClient();
  const [state, setState] = useState<LocationState>('idle'); const [accuracy, setAccuracy] = useState<number | null>(null); const [position, setPosition] = useState<{ lat: number; lng: number } | null>(null); const [selectedSpot, setSelectedSpot] = useState<Spot | null>(null); const [message, setMessage] = useState(''); const [precheck, setPrecheck] = useState<PrecheckResult | null>(null); const [loading, setLoading] = useState(false); const [modal, setModal] = useState<CheckInModal | null>(null); const [completedIds, setCompletedIds] = useState<number[]>([]);
  const spotsQuery = useQuery({
    queryKey: ['check-in-spots', position?.lat, position?.lng],
    queryFn: () => position ? getNearbySpots(position.lat, position.lng, 2_000, 20) : Promise.resolve({ data: [], meta: { nextCursor: null, hasNext: false } }),
    enabled: position !== null,
  });

  const requestLocation = () => { if (!navigator.geolocation) { setState('unsupported'); setMessage('이 브라우저에서는 위치 정보를 지원하지 않습니다.'); return; } setMessage(''); setState('requesting'); navigator.geolocation.getCurrentPosition(({ coords }) => { const nextAccuracy = Math.round(coords.accuracy); setAccuracy(nextAccuracy); setPosition({ lat: coords.latitude, lng: coords.longitude }); setState(nextAccuracy > 50 ? 'inaccurate' : 'measured'); }, (error) => { setState(error.code === error.PERMISSION_DENIED ? 'denied' : 'idle'); setMessage(error.code === error.PERMISSION_DENIED ? '브라우저에서 위치 권한을 허용해주세요.' : '현재 위치를 확인하지 못했습니다. 다시 시도해주세요.'); }, { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }); };
  useEffect(() => { requestLocation(); }, []);

  useEffect(() => {
    let cancelled = false;
    if (!selectedSpot || !position || accuracy === null || accuracy > 50) { setPrecheck(null); return; }
    const input: PositionInput = { ...position, accuracyM: accuracy, capturedAt: new Date().toISOString() };
    setPrecheck(null);
    precheckSpot(selectedSpot.id, input).then((response) => {
      if (cancelled) return;
      setPrecheck(response.data);
      if (!response.data.eligible) setMessage(response.data.reasons?.[0] ?? `선택한 장소에서 ${response.data.allowedRadiusM ?? CHECK_IN_RADIUS_METERS}m 이내로 이동해주세요.`);
    }).catch((caught) => { if (!cancelled) setMessage(caught instanceof Error ? caught.message : '인증 가능 여부를 확인하지 못했습니다.'); });
    return () => { cancelled = true; };
  }, [selectedSpot, position, accuracy]);

  const handleCheckIn = async () => {
    if (!position || !selectedSpot || accuracy === null || !precheck?.eligible) return;
    setLoading(true);
    const input: PositionInput = { ...position, accuracyM: accuracy, capturedAt: new Date().toISOString() };
    try {
      const precheckRes = await precheckSpot(selectedSpot.id, input);
      if (!precheckRes.data.eligible) { setPrecheck(precheckRes.data); setMessage(precheckRes.data.reasons?.[0] ?? '현장 인증 조건을 충족하지 못했습니다.'); return; }
      const checkInRes = await createCheckIn(selectedSpot.id, input); const result: ApiCheckInResult = checkInRes.data;
      setCompletedIds((ids) => ids.includes(selectedSpot.id) ? ids : [...ids, selectedSpot.id]);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['me'] }),
        queryClient.invalidateQueries({ queryKey: ['point-ledger'] }),
        queryClient.invalidateQueries({ queryKey: ['my-map'] }),
        queryClient.invalidateQueries({ queryKey: ['spots'] }),
        queryClient.invalidateQueries({ queryKey: ['check-in-spots'] }),
      ]);
      setModal({ status: result.status === 'REVIEW' ? 'pending' : 'success', points: result.reward?.points, message: result.status === 'REVIEW' ? '인증 결과를 확인하고 있어요.' : '체크인이 완료되었습니다.' });
    } catch (caught) { const err = caught instanceof CheckInApiError ? caught : null; const errorMessage = err?.status === 501 ? '현장 인증 백엔드 기능 준비 중입니다.' : err?.status === 404 ? '현재 시범 운영 등록 장소가 아닙니다. (SPOT_NOT_FOUND)' : caught instanceof Error ? caught.message : '현장 인증 처리에 실패했습니다.'; setMessage(errorMessage); } finally { setLoading(false); }
  };

  const spots = (spotsQuery.data?.data ?? []).filter((spot) => spot.geometryType !== 'EXCLUDE').map((spot) => completedIds.includes(spot.id) ? { ...spot, checkInCompleted: true } : spot);
  const copy = { idle: ['위치 권한을 확인하기 전이에요', '현재 위치를 확인하면 가까운 체크인 장소를 안내해드려요.', '위치 권한 요청하기'], requesting: ['현재 위치를 확인하고 있어요', '잠시만 기다려주세요. 정확한 위치를 측정하고 있어요.', '위치 확인 중'], measured: ['현재 위치를 확인했어요', `GPS 정확도는 ${accuracy ?? '-'}m예요. 장소를 선택해 인증 가능 여부를 확인해보세요.`, '다시 측정하기'], denied: ['위치 권한이 필요해요', '브라우저 설정에서 위치 권한을 허용한 뒤 다시 시도해주세요.', '다시 요청하기'], inaccurate: ['GPS 정확도가 부족해요', `현재 정확도는 ${accuracy ?? '-'}m예요. 50m 이내가 되도록 다시 측정해주세요.`, '다시 측정하기'], 'out-of-range': ['아직 체크인 범위 밖이에요', `선택한 장소에서 ${selectedSpot?.checkInRadiusM ?? CHECK_IN_RADIUS_METERS}m 이내로 이동하면 체크인할 수 있어요.`, '현재 위치 다시 확인'], unsupported: ['위치 기능을 사용할 수 없어요', '이 브라우저에서는 위치 정보를 지원하지 않습니다.', '다시 시도하기'] }[state];
  return <main className="page check-in-page"><header className="simple-header"><p className="eyebrow"><Crosshair size={15} /> 현장 인증</p><h1>가까운 플래그를 찾아볼까요?</h1><p>위치는 인증 순간에만 사용하며 이동 경로를 저장하지 않습니다.</p></header><CheckInMap position={position ? { ...position, accuracy } : null} spots={spots} selectedSpot={selectedSpot} onSelect={(spot) => { setSelectedSpot(spot); setPrecheck(null); setMessage(''); }} /><section className="check-in-card"><div><span className={`status-dot status-dot--${state}`} /><small>{copy[0]}</small></div><h2>{copy[1]}</h2><select aria-label="체크인 장소 선택" value={selectedSpot?.id ?? ''} onChange={(event) => { setSelectedSpot(spots.find((spot) => spot.id === Number(event.target.value)) ?? null); setPrecheck(null); setMessage(''); }}><option value="">체크인할 장소를 선택하세요</option>{spots.map((spot) => <option key={spot.id} value={spot.id}>{spot.title}</option>)}</select><button type="button" className="primary-button" disabled={loading} onClick={requestLocation}>{loading ? <><RefreshCw className="spin" size={19} /> 위치 확인 중</> : <><Crosshair size={19} /> {copy[2]}</>}</button>{position && selectedSpot && accuracy !== null && accuracy <= 50 && <button type="button" className="primary-button check-in-submit" disabled={loading || !precheck?.eligible} onClick={handleCheckIn}>{loading ? '인증 처리 중...' : precheck ? '현장 인증' : '인증 가능 여부 확인 중...'}</button>}{message && <p className="auth-error" role="alert">{message}</p>}<p className="privacy-note"><ShieldCheck size={15} /> GPS 정확도와 거리를 서버에서 확인합니다.</p></section>{modal && <div className="check-in-modal-backdrop"><section className={`check-in-modal check-in-modal--${modal.status}`} role="dialog" aria-modal="true"><h2>{modal.status === 'success' ? '체크인 완료' : '인증 확인 중'}</h2><p>{modal.message}</p>{modal.points !== undefined && <strong className="check-in-modal__points">+{modal.points}P</strong>}<button type="button" className="primary-button" onClick={() => setModal(null)}>확인</button></section></div>}</main>;
}
