import { Flag, LockKeyhole, Palette, Trophy } from 'lucide-react';

export function MyFlagPage() {
  return (
    <main className="page my-flag-page">
      <header className="simple-header my-flag-header">
        <p className="eyebrow"><Flag size={15} /> 마이 플래그</p>
        <h1>나만의 로컬 지도를<br />조금씩 채워가고 있어요.</h1>
      </header>

      <section className="profile-summary">
        <div className="profile-summary__flag"><Flag size={28} /></div>
        <div><small>이번 달 기록</small><strong>7개 지역 · 12개 플래그</strong></div>
        <div className="profile-summary__points"><small>보유</small><strong>1,250P</strong></div>
      </section>

      <section className="collection-card">
        <div className="collection-card__top">
          <div><small>전국 수집률</small><strong>12 / 89</strong></div>
          <span>13%</span>
        </div>
        <div className="progress-track"><span style={{ width: '13%' }} /></div>
        <div className="mini-flags" aria-label="최근 획득 깃발">
          {['A', 'B', 'S', 'A', 'B'].map((grade, index) => (
            <span key={`${grade}-${index}`} data-grade={grade}>{grade}</span>
          ))}
        </div>
      </section>

      <section className="section-block">
        <div className="section-heading">
          <div><p>포인트로 꾸미기</p><h2>깃발 스킨</h2></div>
          <button type="button">상점 보기</button>
        </div>
        <div className="skin-grid">
          <button type="button" className="skin-card skin-card--active">
            <Palette size={22} /><strong>Local Red</strong><small>장착 중</small>
          </button>
          <button type="button" className="skin-card">
            <Trophy size={22} /><strong>Explorer</strong><small>800P</small>
          </button>
          <button type="button" className="skin-card skin-card--locked">
            <LockKeyhole size={22} /><strong>Secret</strong><small>잠김</small>
          </button>
        </div>
      </section>
    </main>
  );
}

