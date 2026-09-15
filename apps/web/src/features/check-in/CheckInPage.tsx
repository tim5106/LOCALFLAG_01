import { Check, Crosshair, RefreshCw } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { createCheckIn, getNearbySpots, getSpots, precheckSpot, type PositionInput } from '../../api/client';
import { ensureTestAuthToken } from '../auth/auth';
import { CheckInApiError } from '../../types/api';
import type { Spot } from '../../types/spot';
import { useUiStore } from '../../store/ui-store';
import { calculateDistanceMeters, CHECK_IN_RADIUS_METERS, formatDistance } from './distance';
import type { CheckInResult as ApiCheckInResult, PrecheckResult } from './api-types';
import { SpotImage } from '../../components/SpotImage';
import { CheckInMap } from '../../components/CheckInMap';

type LocationState = 'idle' | 'requesting' | 'measured' | 'denied' | 'inaccurate' | 'out-of-range' | 'unsupported';
type CheckInModal = { status: 'success' | 'pending' | 'failure'; points?: number; message: string };

export function CheckInPage() {
  const queryClient = useQueryClient();
  const openProfile = useUiStore((store) => store.openProfile);
  const storedSelectedSpot = useUiStore((store) => store.selectedSpot);
  const eligibleStoredSpot =
    storedSelectedSpot?.geometryType === 'POINT' && storedSelectedSpot.checkInEnabled !== false
      ? storedSelectedSpot
      : null;

  const [state, setState] = useState<LocationState>('idle');
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [position, setPosition] = useState<{ lat: number; lng: number } | null>(null);
  const [selectedSpot, setSelectedSpot] = useState<Spot | null>(eligibleStoredSpot);
  const [message, setMessage] = useState('');
  const [precheck, setPrecheck] = useState<PrecheckResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [modal, setModal] = useState<CheckInModal | null>(null);
  const [completedIds, setCompletedIds] = useState<number[]>([]);

  const spotsQuery = useQuery({
    queryKey: ['check-in-spots', position?.lat, position?.lng],
    queryFn: async () => {
      if (!position) return { data: [], meta: { nextCursor: null, hasNext: false } };
      try {
        const nearby = await getNearbySpots(position.lat, position.lng, 2_000, 20);
        if (nearby.data.length > 0 || !import.meta.env.DEV) return nearby;
      } catch (error) {
        if (!import.meta.env.DEV) throw error;
      }
      return getSpots({ areaCode: '1', sigunguCode: '23', limit: 20 });
    },
    enabled: position !== null,
  });

  const requestLocation = () => {
    if (!navigator.geolocation) {
      setState('unsupported');
      setMessage('이 브라우저에서는 위치 정보를 지원하지 않습니다.');
      return;
    }
    setMessage('');
    setState('requesting');
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const nextAccuracy = Math.round(coords.accuracy);
        setAccuracy(nextAccuracy);
        setPosition({ lat: coords.latitude, lng: coords.longitude });
        setState(nextAccuracy > 50 ? 'inaccurate' : 'measured');
      },
      (error) => {
        setState(error.code === error.PERMISSION_DENIED ? 'denied' : 'idle');
        setMessage(
          error.code === error.PERMISSION_DENIED
            ? '브라우저에서 위치 권한을 허용해주세요.'
            : '현재 위치를 확인하지 못했습니다. 다시 시도해주세요.'
        );
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  useEffect(() => {
    if (import.meta.env.DEV) ensureTestAuthToken();
    requestLocation();
  }, []);

  useEffect(() => {
    if (import.meta.env.DEV && accuracy !== null && accuracy > 50) {
      setAccuracy(10);
      setState('measured');
    }
  }, [accuracy]);

  useEffect(() => {
    let cancelled = false;
    if (!selectedSpot || !position || accuracy === null || accuracy > 50) {
      setPrecheck(null);
      return;
    }
    const input: PositionInput = { ...position, accuracyM: accuracy, capturedAt: new Date().toISOString() };
    setPrecheck(null);
    precheckSpot(selectedSpot.id, input)
      .then((response) => {
        if (cancelled) return;
        setPrecheck(response.data);
        if (!response.data.eligible) {
          setMessage(
            response.data.reasons?.[0] ??
              `선택한 장소에서 ${response.data.allowedRadiusM ?? CHECK_IN_RADIUS_METERS}m 이내로 이동해주세요.`
          );
        }
      })
      .catch((caught) => {
        if (!cancelled) setMessage(caught instanceof Error ? caught.message : '인증 가능 여부를 확인하지 못했습니다.');
      });
    return () => {
      cancelled = true;
    };
  }, [selectedSpot, position, accuracy]);

  const handleCheckIn = async () => {
    if (!position || !selectedSpot || accuracy === null || !precheck?.eligible) return;
    setLoading(true);
    const input: PositionInput = { ...position, accuracyM: accuracy, capturedAt: new Date().toISOString() };
    try {
      const precheckRes = await precheckSpot(selectedSpot.id, input);
      if (!precheckRes.data.eligible) {
        setPrecheck(precheckRes.data);
        setMessage(precheckRes.data.reasons?.[0] ?? '현장 인증 조건을 충족하지 못했습니다.');
        return;
      }
      const checkInRes = await createCheckIn(selectedSpot.id, input);
      const result: ApiCheckInResult = checkInRes.data;
      setCompletedIds((ids) => (ids.includes(selectedSpot.id) ? ids : [...ids, selectedSpot.id]));
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['me'] }),
        queryClient.invalidateQueries({ queryKey: ['point-ledger'] }),
        queryClient.invalidateQueries({ queryKey: ['my-map'] }),
        queryClient.invalidateQueries({ queryKey: ['spots'] }),
        queryClient.invalidateQueries({ queryKey: ['check-in-spots'] }),
      ]);
      setModal({
        status: result.status === 'REVIEW' ? 'pending' : 'success',
        points: result.reward?.points,
        message: result.status === 'REVIEW' ? '인증 결과를 확인하고 있어요.' : '체크인이 완료되었습니다.',
      });
    } catch (caught) {
      const err = caught instanceof CheckInApiError ? caught : null;
      const errorMessage =
        err?.status === 501
          ? '현장 인증 백엔드 기능 준비 중입니다.'
          : err?.status === 404
          ? '현재 시범 운영 등록 장소가 아닙니다. (SPOT_NOT_FOUND)'
          : caught instanceof Error
          ? caught.message
          : '현장 인증 처리에 실패했습니다.';
      setMessage(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const nearbySpots = (spotsQuery.data?.data ?? [])
    .filter((spot) => spot.geometryType === 'POINT' && spot.checkInEnabled !== false)
    .map((spot) => (completedIds.includes(spot.id) ? { ...spot, checkInCompleted: true } : spot));
  const spots =
    selectedSpot && !nearbySpots.some((spot) => spot.id === selectedSpot.id)
      ? [selectedSpot, ...nearbySpots]
      : nearbySpots;

  // 지역명 추출 (기본: 서울 종로구)
  const currentRegion = selectedSpot?.address
    ? selectedSpot.address.split(' ').slice(0, 2).join(' ')
    : '서울 종로구';

  // 현재 선택된 장소와의 거리
  const spotDistanceMeters =
    position && selectedSpot?.location
      ? Math.round(
          calculateDistanceMeters(
            position.lat,
            position.lng,
            selectedSpot.location.lat,
            selectedSpot.location.lng
          )
        )
      : null;

  // 레이더 상에 표시할 주변 스팟들 (선택되지 않은 스팟 중 최대 2개)
  const otherRadarSpots = spots.filter((s) => s.id !== selectedSpot?.id);
  const radarSpot1 = otherRadarSpots[0];
  const radarSpot2 = otherRadarSpots[1];

  // 인증 자격 여부
  const isEligible = Boolean(precheck?.eligible && position && selectedSpot && accuracy !== null && accuracy <= 50);

  return (
    <main className="check-in-new-page">
      {/* 64px 고정 상단 네비 헤더 */}
      <header className="check-in-nav-header">
        <div className="check-in-nav-header__brand">
          <h1>Local Flag</h1>
        </div>
        <button
          type="button"
          className="check-in-nav-header__avatar"
          aria-label="내 프로필"
          onClick={() => openProfile('check-in')}
        >
          <svg width="18" height="18" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path
              d="M16 16C15.175 16 14.4688 15.7063 13.8812 15.1188C13.2937 14.5312 13 13.825 13 13C13 12.175 13.2937 11.4688 13.8812 10.8813C14.4688 10.2938 15.175 10 16 10C16.825 10 17.5312 10.2938 18.1187 10.8813C18.7062 11.4688 19 12.175 19 13C19 13.825 18.7062 14.5312 18.1187 15.1188C17.5312 15.7063 16.825 16 16 16ZM10 22V19.9C10 19.475 10.1094 19.0844 10.3281 18.7281C10.5469 18.3719 10.8375 18.1 11.2 17.9125C11.975 17.525 12.7625 17.2344 13.5625 17.0406C14.3625 16.8469 15.175 16.75 16 16.75C16.825 16.75 17.6375 16.8469 18.4375 17.0406C19.2375 17.2344 20.025 17.525 20.8 17.9125C21.1625 18.1 21.4531 18.3719 21.6719 18.7281C21.8906 19.0844 22 19.475 22 19.9V22H10ZM11.5 20.5H20.5V19.9C20.5 19.7625 20.4656 19.6375 20.3969 19.525C20.3281 19.4125 20.2375 19.325 20.125 19.2625C19.45 18.925 18.7688 18.6719 18.0813 18.5031C17.3938 18.3344 16.7 18.25 16 18.25C15.3 18.25 14.6062 18.3344 13.9188 18.5031C13.2313 18.6719 12.55 18.925 11.875 19.2625C11.7625 19.325 11.6719 19.4125 11.6031 19.525C11.5344 19.6375 11.5 19.7625 11.5 19.9V20.5ZM16 14.5C16.4125 14.5 16.7656 14.3531 17.0594 14.0594C17.3531 13.7656 17.5 13.4125 17.5 13C17.5 12.5875 17.3531 12.2344 17.0594 11.9406C16.7656 11.6469 16.4125 11.5 16 11.5C15.5875 11.5 15.2344 11.6469 14.9406 11.9406C14.6469 12.2344 14.5 12.5875 14.5 13C14.5 13.4125 14.6469 13.7656 14.9406 14.0594Z"
              fill="white"
            />
          </svg>
        </button>
      </header>

      {/* 서브 헤더 (위치 칩 + 타이틀) */}
      <div className="check-in-sub-header">
        <div className="check-in-location-chip">
          <svg width="10" height="13" viewBox="0 0 10 13" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path
              d="M5 6.25C5.34375 6.25 5.63802 6.1276 5.88281 5.88281C6.1276 5.63802 6.25 5.34375 6.25 5C6.25 4.65625 6.1276 4.36198 5.88281 4.11719C5.63802 3.8724 5.34375 3.75 5 3.75C4.65625 3.75 4.36198 3.8724 4.11719 4.11719C3.8724 4.36198 3.75 4.65625 3.75 5C3.75 5.34375 3.8724 5.63802 4.11719 5.88281C4.36198 6.1276 4.65625 6.25 5 6.25ZM5 10.8438C6.27083 9.67708 7.21354 8.61719 7.82812 7.66406C8.44271 6.71094 8.75 5.86458 8.75 5.125C8.75 3.98958 8.38802 3.0599 7.66406 2.33594C6.9401 1.61198 6.05208 1.25 5 1.25C3.94792 1.25 3.0599 1.61198 2.33594 2.33594C1.61198 3.0599 1.25 3.98958 1.25 5.125C1.25 5.86458 1.55729 6.71094 2.17188 7.66406C2.78646 8.61719 3.72917 9.67708 5 10.8438ZM5 12.5C3.32292 11.0729 2.07031 9.7474 1.24219 8.52344C0.414062 7.29948 0 6.16667 0 5.125C0 3.5625 0.502604 2.31771 1.50781 1.39062C2.51302 0.463542 3.67708 0 5 0C6.32292 0 7.48698 0.463542 8.49219 1.39062C9.4974 2.31771 10 3.5625 10 5.125C10 6.16667 9.58594 7.29948 8.75781 8.52344C7.92969 9.7474 6.67708 11.0729 5 12.5Z"
              fill="#F05D3F"
            />
          </svg>
          <span>{currentRegion}</span>
        </div>
        <h2 className="check-in-title">현장 방문 인증하기</h2>
      </div>

      {/* 390px 카카오 지도 영역 */}
      <section className="check-in-map-stage" aria-label="현재 위치 카카오 지도">
        <CheckInMap
          position={position ? { ...position, accuracy } : null}
          spots={spots}
          selectedSpot={selectedSpot}
          onSelect={(spot) => {
            setSelectedSpot(spot);
            setPrecheck(null);
            setMessage('');
          }}
        />

        {/* 우측 하단 크로스헤어 / 현재 위치 재측정 버튼 오버레이 */}
        <button
          type="button"
          className="check-in-radar-locate-btn"
          style={{ zIndex: 10 }}
          onClick={requestLocation}
          disabled={loading || state === 'requesting'}
          aria-label="현재 위치 다시 측정"
        >
          {state === 'requesting' ? (
            <RefreshCw size={20} className="spin" />
          ) : (
            <Crosshair size={20} />
          )}
        </button>
      </section>

      {/* 하단 장소 카드 및 인증 액션 */}
      <div className="check-in-content-area">
        {/* 상단 플래그 카운트 및 인디케이터 바 */}
        <div className="check-in-count-row">
          <div className="check-in-count-row__left">
            <span className="check-in-count-row__dot" />
            <span className="check-in-count-row__text">
              내 주변 1km 내 <em>{spots.length}</em>개의 플래그
            </span>
          </div>
          <svg width="60" height="6" viewBox="0 0 60 6" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect width="24" height="6" rx="3" fill="#173F35" />
            <rect x="30" width="6" height="6" rx="3" fill="#C0C8C4" />
            <rect x="42" width="6" height="6" rx="3" fill="#C0C8C4" />
            <rect x="54" width="6" height="6" rx="3" fill="#C0C8C4" />
          </svg>
        </div>

        {/* 메인 장소 카드 */}
        <article className="check-in-main-card">
          <div className="check-in-card-body">
            <div className="check-in-card-thumb">
              <SpotImage src={selectedSpot?.imageUrl} alt={selectedSpot?.title ?? '장소 썸네일'} iconSize={24} />
              <span className="check-in-card-thumb__tag">
                {selectedSpot?.grade === 'S' ? '특별 명소' : '명인 공방'}
              </span>
            </div>

            <div className="check-in-card-info">
              {/* 거리 및 인증 상태 뱃지 */}
              <div
                className={`check-in-status-badge ${
                  isEligible
                    ? 'check-in-status-badge--eligible'
                    : state === 'requesting'
                    ? 'check-in-status-badge--measuring'
                    : 'check-in-status-badge--ineligible'
                }`}
              >
                {isEligible ? (
                  <>
                    <Check size={12} strokeWidth={2.5} />
                    <span>현재 약 {spotDistanceMeters ?? 0}m (인증 범위 내)</span>
                  </>
                ) : state === 'requesting' ? (
                  <span>위치 확인 중...</span>
                ) : (
                  <span>
                    {spotDistanceMeters !== null
                      ? `현재 약 ${spotDistanceMeters}m (인증 범위 밖)`
                      : '장소를 선택해주세요'}
                  </span>
                )}
              </div>

              <h3 className="check-in-card-title">{selectedSpot?.title ?? '체크인할 장소를 선택하세요'}</h3>
              <p className="check-in-card-sub">
                {selectedSpot?.address ?? '주변 탐색권 내 장소를 선택해주세요'}
              </p>

              <div className="check-in-card-reward">
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path
                    d="M3.5 9.33333L5.83333 7.55417L8.16667 9.33333L7.29167 6.44583L9.625 4.78333H6.76667L5.83333 1.75L4.9 4.78333H2.04167L4.375 6.44583L3.5 9.33333ZM5.83333 11.6667C5.02639 11.6667 4.26806 11.5135 3.55833 11.2073C2.84861 10.901 2.23125 10.4854 1.70625 9.96042C1.18125 9.43542 0.765625 8.81806 0.459375 8.10833C0.153125 7.39861 0 6.64028 0 5.83333C0 5.02639 0.153125 4.26806 0.459375 3.55833C0.765625 2.84861 1.18125 2.23125 1.70625 1.70625C2.23125 1.18125 2.84861 0.765625 3.55833 0.459375C4.26806 0.153125 5.02639 0 5.83333 0C6.64028 0 7.39861 0.153125 8.10833 0.459375C8.81806 0.765625 9.43542 1.18125 9.96042 1.70625C10.4854 2.23125 10.901 2.84861 11.2073 3.55833C11.5135 4.26806 11.6667 5.02639 11.6667 5.83333C11.6667 6.64028 11.5135 7.39861 11.2073 8.10833C10.901 8.81806 10.4854 9.43542 9.96042 9.96042C9.43542 10.4854 8.81806 10.901 8.10833 11.2073C7.39861 11.5135 6.64028 11.6667 5.83333 11.6667Z"
                    fill="#F0C75E"
                  />
                </svg>
                <span>+{selectedSpot?.estimatedReward ?? 150} P 즉시 적립</span>
              </div>
            </div>
          </div>

          {/* 장소 선택 드롭다운 (접근성 및 자동화 테스트 지원) */}
          <div className="check-in-select-wrap">
            <select
              aria-label="체크인 장소 선택"
              className="check-in-select-dropdown"
              value={selectedSpot?.id ?? ''}
              onChange={(event) => {
                const found = spots.find((spot) => spot.id === Number(event.target.value)) ?? null;
                setSelectedSpot(found);
                setPrecheck(null);
                setMessage('');
              }}
            >
              <option value="">체크인할 장소를 선택하세요</option>
              {spots.map((spot) => (
                <option key={spot.id} value={spot.id}>
                  {spot.title}
                </option>
              ))}
            </select>
          </div>

          {/* 지금 깃발 꽂고 현장 인증하기 메인 버튼 */}
          <button
            type="button"
            className="check-in-cta-btn"
            disabled={loading || !isEligible}
            onClick={handleCheckIn}
          >
            {loading ? (
              <>
                <RefreshCw size={16} className="spin" />
                <span>인증 처리 중...</span>
              </>
            ) : (
              <>
                <svg width="13" height="15" viewBox="0 0 13 15" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path
                    d="M0 14.1667V0H7.5L7.83333 1.66667H12.5V10H6.66667L6.33333 8.33333H1.66667V14.1667H0Z"
                    fill="#FFF8E9"
                  />
                </svg>
                <span>지금 깃발 꽂고 현장 인증하기</span>
              </>
            )}
          </button>
        </article>

        {/* 에러 피드백 메시지 */}
        {message && (
          <p className="auth-error" role="alert" style={{ textAlign: 'center', marginTop: 4 }}>
            {message}
          </p>
        )}
      </div>

      {/* 완료 모달 */}
      {modal && (
        <div className="check-in-modal-backdrop">
          <section className={`check-in-modal check-in-modal--${modal.status}`} role="dialog" aria-modal="true">
            <h2>{modal.status === 'success' ? '체크인 완료' : '인증 확인 중'}</h2>
            <p>{modal.message}</p>
            {modal.points !== undefined && <strong className="check-in-modal__points">+{modal.points}P</strong>}
            <button type="button" className="primary-button" onClick={() => setModal(null)}>
              확인
            </button>
          </section>
        </div>
      )}
    </main>
  );
}
