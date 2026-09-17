import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, ChevronRight, Edit3, Flag, HelpCircle, MapPin, Megaphone, Receipt, Sparkles } from 'lucide-react';
import { useState } from 'react';
import { getMe, getMyMap, type MeProfile, type MyFlagMap } from '../../api/client';
import { signOut } from '../auth/auth';
import { useUiStore } from '../../store/ui-store';

interface ProfilePageProps {
  onSignOut?: () => void;
}

export function ProfilePage({ onSignOut }: ProfilePageProps) {
  const queryClient = useQueryClient();
  const closeProfile = useUiStore((state) => state.closeProfile);
  const openShop = useUiStore((state) => state.openShop);
  const navigateToMyFlagSection = useUiStore((state) => state.navigateToMyFlagSection);
  const [toast, setToast] = useState('');

  const showToast = (message: string = '준비 중입니다.') => {
    setToast(message);
    setTimeout(() => {
      setToast('');
    }, 2200);
  };

  const profileQuery = useQuery<{ data: MeProfile }>({
    queryKey: ['me'],
    queryFn: getMe,
    retry: false,
  });

  const mapQuery = useQuery<{ data: MyFlagMap }>({
    queryKey: ['my-map'],
    queryFn: getMyMap,
    retry: false,
  });

  const profile = profileQuery.data?.data;
  const visits = mapQuery.data?.data.visits ?? [];

  const points = profileQuery.isSuccess ? (profile?.pointBalance ?? 0) : null;
  const uniqueSpotsCount = mapQuery.isSuccess ? new Set(visits.map((v) => v.spotId)).size : null;
  const completedVisits = mapQuery.isSuccess ? visits.length : null;

  const hasError = profileQuery.isError || mapQuery.isError;

  const handleRetry = () => {
    queryClient.invalidateQueries({ queryKey: ['me'] });
    queryClient.invalidateQueries({ queryKey: ['my-map'] });
  };

  const handleSignOut = () => {
    signOut();
    if (onSignOut) {
      onSignOut();
    }
  };

  return (
    <main className="profile-page">
      {/* 64px 고정 상단 헤더 */}
      <header className="profile-header">
        <button
          type="button"
          className="profile-header__back-btn"
          aria-label="뒤로가기"
          onClick={closeProfile}
        >
          <ArrowLeft size={20} color="#183B33" strokeWidth={2.2} />
        </button>
      </header>

      {/* 에러 상태 안내 배너 */}
      {hasError && (
        <div className="profile-error-banner" role="alert">
          <span>일부 정보를 불러오지 못했습니다.</span>
          <button type="button" className="profile-error-retry" onClick={handleRetry}>
            다시 시도
          </button>
        </div>
      )}

      {/* 프로필 카드 */}
      <section className="profile-card" aria-label="사용자 프로필">
        <div className="profile-card__bg-blob" aria-hidden="true" />
        <div className="profile-card__body">
          <div className="profile-card__user-row">
            <div className="profile-card__avatar-wrap">
              <div className="profile-card__avatar" aria-label="프로필 일러스트">
                {/* 로컬 자산 기본 캐릭터 일러스트 SVG */}
                <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className="profile-card__avatar-svg">
                  <circle cx="32" cy="32" r="32" fill="#CAF0E4" />
                  {/* 모자/베레모 */}
                  <path d="M18 28C18 19.5 24 14 32 14C40 14 46 19.5 46 28C46 30 43 31 32 31C21 31 18 30 18 28Z" fill="#173F35" />
                  <circle cx="32" cy="13" r="3" fill="#D54D35" />
                  {/* 얼굴 */}
                  <ellipse cx="32" cy="34" rx="13" ry="12" fill="#FFDFC7" />
                  {/* 볼터치 */}
                  <circle cx="24" cy="36" r="2.5" fill="#FFAAA6" opacity="0.6" />
                  <circle cx="40" cy="36" r="2.5" fill="#FFAAA6" opacity="0.6" />
                  {/* 눈 & 미소 */}
                  <circle cx="27" cy="33" r="1.5" fill="#173F35" />
                  <circle cx="37" cy="33" r="1.5" fill="#173F35" />
                  <path d="M30 37C31 38.5 33 38.5 34 37" stroke="#173F35" strokeWidth="1.2" strokeLinecap="round" />
                  {/* 옷 */}
                  <path d="M19 46C20 40 25 38 32 38C39 38 44 40 45 46L47 56H17L19 46Z" fill="#C8553D" />
                  <path d="M29 41L32 46L35 41" stroke="#FFF8E9" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <div className="profile-card__flag-badge" aria-hidden="true">
                <Flag size={12} color="white" fill="white" />
              </div>
            </div>

            <div className="profile-card__info">
              <div className="profile-card__level-badge">
                <Sparkles size={11} color="#D54D35" />
                <span>Lv.3 골목 탐험가</span>
              </div>
              <h2 className="profile-card__nickname">
                {profile?.nickname || '종로의 모험가 김로컬'}
              </h2>
            </div>
          </div>

          <button
            type="button"
            className="profile-card__edit-btn"
            aria-label="프로필 편집"
            onClick={() => showToast('프로필 편집 기능은 준비 중입니다.')}
          >
            <Edit3 size={18} color="#525252" />
          </button>
        </div>
      </section>

      {/* 3열 스탯 카드 */}
      <section className="profile-stats-row" aria-label="활동 통계">
        {/* 포인트 카드 */}
        <div className="profile-stat-card profile-stat-card--points">
          <div className="profile-stat-card__points-val">
            <strong>{points !== null ? points.toLocaleString() : '—'}</strong>
            <span>P</span>
          </div>
          <button
            type="button"
            className="profile-stat-card__shop-btn"
            onClick={openShop}
          >
            <span>상점 가기</span>
            <ChevronRight size={12} color="#F0C75E" />
          </button>
        </div>

        {/* 꽂은 깃발 카드 */}
        <div className="profile-stat-card">
          <div className="profile-stat-card__header">
            <span className="profile-stat-card__label">꽂은 깃발</span>
            <Flag size={13} color="#F05D3F" fill="#F05D3F" />
          </div>
          <div className="profile-stat-card__value-row">
            <strong>{uniqueSpotsCount !== null ? uniqueSpotsCount : '—'}</strong>
            <span className="profile-stat-card__unit">개</span>
          </div>
        </div>

        {/* 탐험 지역 카드 (목업값) */}
        <div className="profile-stat-card">
          <div className="profile-stat-card__header">
            <span className="profile-stat-card__label">탐험 지역</span>
            <svg width="14" height="14" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M4.125 10.875L9.375 9.375L10.875 4.125L5.625 5.625L4.125 10.875ZM7.5 8.625C7.1875 8.625 6.92188 8.51562 6.70312 8.29688C6.48438 8.07812 6.375 7.8125 6.375 7.5C6.375 7.1875 6.48438 6.92188 6.70312 6.70312C6.92188 6.48438 7.1875 6.375 7.5 6.375C7.8125 6.375 8.07812 6.48438 8.29688 6.70312C8.51562 6.92188 8.625 7.1875 8.625 7.5C8.625 7.8125 8.51562 8.07812 8.29688 8.29688C8.07812 8.51562 7.8125 8.625 7.5 8.625ZM7.5 15C6.4625 15 5.4875 14.8031 4.575 14.4094C3.6625 14.0156 2.86875 13.4812 2.19375 12.8062C1.51875 12.1312 0.984375 11.3375 0.590625 10.425C0.196875 9.5125 0 8.5375 0 7.5C0 6.4625 0.196875 5.4875 0.590625 4.575C0.984375 3.6625 1.51875 2.86875 2.19375 2.19375C2.86875 1.51875 3.6625 0.984375 4.575 0.590625C5.4875 0.196875 6.4625 0 7.5 0C8.5375 0 9.5125 0.196875 10.425 0.590625C11.3375 0.984375 12.1312 1.51875 12.8062 2.19375C13.4812 2.86875 14.0156 3.6625 14.4094 4.575C14.8031 5.4875 15 6.4625 15 7.5C15 8.5375 14.8031 9.5125 14.4094 10.425C14.0156 11.3375 13.4812 12.1312 12.8062 12.8062C12.1312 13.4812 11.3375 14.0156 10.425 14.4094C9.5125 14.8031 8.5375 15 7.5 15ZM7.5 13.5C9.1625 13.5 10.5781 12.9156 11.7469 11.7469C12.9156 10.5781 13.5 9.1625 13.5 7.5C13.5 5.8375 12.9156 4.42188 11.7469 3.25312C10.5781 2.08437 9.1625 1.5 7.5 1.5C5.8375 1.5 4.42188 2.08437 3.25312 3.25312C2.08437 4.42188 1.5 5.8375 1.5 7.5C1.5 9.1625 2.08437 10.5781 3.25312 11.7469C4.42188 12.9156 5.8375 13.5 7.5 13.5Z" fill="#183B33"/>
            </svg>
          </div>
          <div className="profile-stat-card__value-row">
            <strong>7</strong>
            <span className="profile-stat-card__unit">곳</span>
          </div>
        </div>
      </section>

      {/* 탐험 성취 배지 섹션 */}
      <section className="profile-achievements-section" aria-label="탐험 성취 배지">
        <div className="profile-achievements-header">
          <div className="profile-achievements-title">
            <Sparkles size={16} color="#D54D35" />
            <h3>탐험 성취</h3>
          </div>
          <button
            type="button"
            className="profile-achievements-more"
            onClick={() => showToast('준비 중입니다.')}
          >
            <span>전체보기 (4/18)</span>
            <ChevronRight size={13} color="#718079" />
          </button>
        </div>

        <div className="profile-achievements-scroll" role="region" aria-label="성취 배지 목록">
          {/* 배지 카드 1 */}
          <div className="profile-badge-card">
            <div className="profile-badge-card__icon-wrap" style={{ background: '#FFF3DC' }}>
              <Sparkles size={22} color="#D54D35" />
            </div>
            <strong className="profile-badge-card__name">골목길 개척자</strong>
            <span className="profile-badge-card__status" style={{ color: '#2B9A6F' }}>
              완료 100%
            </span>
            <div className="profile-badge-card__bar">
              <div className="profile-badge-card__fill" style={{ width: '100%', background: '#2B9A6F' }} />
            </div>
          </div>

          {/* 배지 카드 2 */}
          <div className="profile-badge-card">
            <div className="profile-badge-card__icon-wrap" style={{ background: '#FFDAD3' }}>
              <Flag size={20} color="#F05D3F" fill="#F05D3F" />
            </div>
            <strong className="profile-badge-card__name">종로 완주</strong>
            <span className="profile-badge-card__status" style={{ color: '#F05D3F' }}>
              진행 중 60%
            </span>
            <div className="profile-badge-card__bar">
              <div className="profile-badge-card__fill" style={{ width: '60%', background: '#F05D3F' }} />
            </div>
          </div>

          {/* 배지 카드 3 */}
          <div className="profile-badge-card">
            <div className="profile-badge-card__icon-wrap" style={{ background: '#D0F6EA' }}>
              <MapPin size={20} color="#173F35" fill="#173F35" />
            </div>
            <strong className="profile-badge-card__name">첫 발자국</strong>
            <span className="profile-badge-card__status" style={{ color: '#173F35' }}>
              완료 100%
            </span>
            <div className="profile-badge-card__bar">
              <div className="profile-badge-card__fill" style={{ width: '100%', background: '#173F35' }} />
            </div>
          </div>
        </div>
      </section>

      {/* 활동 및 알림 목록 */}
      <section className="profile-menu-section" aria-label="활동 및 알림">
        <h3 className="profile-menu-section__title">활동 및 알림</h3>
        <div className="profile-menu-card">
          {/* 방문 인증 기록 / 포토로그 */}
          <button
            type="button"
            className="profile-menu-item"
            onClick={() => navigateToMyFlagSection('photolog')}
          >
            <div className="profile-menu-item__left">
              <div className="profile-menu-item__icon" style={{ background: '#D0F6EA' }}>
                <svg width="18" height="18" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M15.5 19.67H23.83L20.96 15.92L19.04 18.42L17.75 16.75L15.5 19.67ZM14.67 23C14.21 23 13.82 22.84 13.49 22.51C13.16 22.18 13 21.79 13 21.33V11.33C13 10.88 13.16 10.48 13.49 10.16C13.82 9.83 14.21 9.67 14.67 9.67H24.67C25.13 9.67 25.52 9.83 25.84 10.16C26.17 10.48 26.33 10.88 26.33 11.33V21.33C26.33 21.79 26.17 22.18 25.84 22.51C25.52 22.84 25.13 23 24.67 23H14.67ZM11.33 26.33C10.88 26.33 10.48 26.17 10.16 25.84C9.83 25.52 9.67 25.13 9.67 24.67V13H11.33V24.67H23V26.33H11.33Z" fill="#173F35"/>
                </svg>
              </div>
              <div className="profile-menu-item__text">
                <strong>방문 인증 기록 / 포토로그</strong>
                <span>내가 담은 사진과 발자취</span>
              </div>
            </div>
            <div className="profile-menu-item__right">
              <span className="profile-menu-item__badge">
                {completedVisits !== null ? `${completedVisits}건 완료` : '—'}
              </span>
              <ChevronRight size={14} color="#718079" />
            </div>
          </button>

          {/* 내 주변 스팟 알림 */}
          <div className="profile-menu-item" onClick={() => showToast('준비 중입니다.')} role="button" tabIndex={0}>
            <div className="profile-menu-item__left">
              <div className="profile-menu-item__icon" style={{ background: '#FFF3DC' }}>
                <svg width="18" height="18" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M18 26.35C17.54 26.35 17.15 26.19 16.82 25.86C16.5 25.54 16.33 25.15 16.33 24.69H19.67C19.67 25.15 19.5 25.54 19.18 25.86C18.85 26.19 18.46 26.35 18 26.35ZM11.33 23.85V22.19H13V16.35C13 15.2 13.35 14.18 14.04 13.28C14.74 12.39 15.64 11.8 16.75 11.52V10.94C16.75 10.59 16.87 10.3 17.11 10.05C17.36 9.81 17.65 9.69 18 9.69C18.35 9.69 18.64 9.81 18.89 10.05C19.13 10.3 19.25 10.59 19.25 10.94V11.52C20.36 11.8 21.26 12.39 21.96 13.28C22.65 14.18 23 15.2 23 16.35V22.19H24.67V23.85H11.33Z" fill="#D54D35"/>
                </svg>
              </div>
              <div className="profile-menu-item__text">
                <strong>내 주변 스팟 알림</strong>
                <span>숨은 보물 발견 시 진동 푸시</span>
              </div>
            </div>
            <div className="profile-menu-item__right">
              {/* 스위치 토글 (디자인 재현) */}
              <div className="profile-switch" aria-hidden="true">
                <div className="profile-switch__handle" />
              </div>
            </div>
          </div>

          {/* GPS 위치 권한 설정 */}
          <button
            type="button"
            className="profile-menu-item"
            onClick={() => showToast('준비 중입니다.')}
          >
            <div className="profile-menu-item__left">
              <div className="profile-menu-item__icon" style={{ background: '#D0F6EA' }}>
                <MapPin size={18} color="#173F35" />
              </div>
              <div className="profile-menu-item__text">
                <strong>GPS 위치 권한 설정</strong>
                <span>정확한 위치 허용됨</span>
              </div>
            </div>
            <div className="profile-menu-item__right">
              <span className="profile-menu-item__subtext">정상 연동</span>
              <ChevronRight size={14} color="#718079" />
            </div>
          </button>
        </div>
      </section>

      {/* 계정 및 서비스 목록 */}
      <section className="profile-menu-section" aria-label="계정 및 서비스">
        <h3 className="profile-menu-section__title">계정 및 서비스</h3>
        <div className="profile-menu-card">
          {/* 포인트 충전 / 교환 내역 */}
          <button
            type="button"
            className="profile-menu-item"
            onClick={() => showToast('준비 중입니다.')}
          >
            <div className="profile-menu-item__left">
              <div className="profile-menu-item__icon" style={{ background: '#FFF3DC' }}>
                <Receipt size={18} color="#F0C75E" />
              </div>
              <div className="profile-menu-item__text">
                <strong>포인트 충전 / 교환 내역</strong>
              </div>
            </div>
            <ChevronRight size={14} color="#718079" />
          </button>

          {/* 공지사항 및 이벤트 */}
          <button
            type="button"
            className="profile-menu-item"
            onClick={() => showToast('준비 중입니다.')}
          >
            <div className="profile-menu-item__left">
              <div className="profile-menu-item__icon" style={{ background: '#F2EDE2' }}>
                <Megaphone size={18} color="#183B33" />
              </div>
              <div className="profile-menu-item__text">
                <strong>공지사항 및 이벤트</strong>
              </div>
            </div>
            <div className="profile-menu-item__right">
              <span className="profile-menu-item__dot" aria-hidden="true" />
              <ChevronRight size={14} color="#718079" />
            </div>
          </button>

          {/* 고객센터 / 문의하기 */}
          <button
            type="button"
            className="profile-menu-item"
            onClick={() => showToast('준비 중입니다.')}
          >
            <div className="profile-menu-item__left">
              <div className="profile-menu-item__icon" style={{ background: '#F2EDE2' }}>
                <HelpCircle size={18} color="#183B33" />
              </div>
              <div className="profile-menu-item__text">
                <strong>고객센터 / 문의하기</strong>
              </div>
            </div>
            <ChevronRight size={14} color="#718079" />
          </button>

          {/* 서비스 이용약관 및 개인정보 처리방침 */}
          <button
            type="button"
            className="profile-menu-item"
            onClick={() => showToast('준비 중입니다.')}
          >
            <div className="profile-menu-item__left">
              <div className="profile-menu-item__icon" style={{ background: '#F2EDE2' }}>
                <svg width="18" height="18" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M10.5 25.92V24.25H20.5V25.92H10.5ZM15.21 21.88L10.5 17.17L12.25 15.38L17 20.08L15.21 21.88ZM20.5 16.58L15.79 11.83L17.58 10.08L22.29 14.79L20.5 16.58ZM24.33 25.08L13.46 14.21L14.63 13.04L25.5 23.92L24.33 25.08Z" fill="#183B33"/>
                </svg>
              </div>
              <div className="profile-menu-item__text">
                <strong>서비스 이용약관 및 개인정보 처리방침</strong>
              </div>
            </div>
            <ChevronRight size={14} color="#718079" />
          </button>
        </div>
      </section>

      {/* 하단 로그아웃 및 버전 정보 */}
      <footer className="profile-footer">
        <button type="button" className="profile-logout-btn" onClick={handleSignOut}>
          로그아웃
        </button>
        <p className="profile-version-text">Local Flag v1.2.0 · 종로구 골목길 투어 에디션</p>
      </footer>

      {/* 토스트 알림 */}
      {toast && (
        <div className="profile-toast" role="status" aria-live="polite">
          {toast}
        </div>
      )}
    </main>
  );
}

