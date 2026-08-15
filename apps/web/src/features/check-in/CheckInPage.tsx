import { Crosshair, LocateFixed, ShieldCheck } from 'lucide-react';

export function CheckInPage() {
  return (
    <main className="page check-in-page">
      <header className="simple-header">
        <p className="eyebrow"><Crosshair size={15} /> 현장 인증</p>
        <h1>가까운 플래그를 찾아볼게요.</h1>
        <p>위치는 인증 순간에만 사용하며 이동 경로를 저장하지 않습니다.</p>
      </header>

      <section className="check-in-radar">
        <div className="radar-ring radar-ring--outer" />
        <div className="radar-ring radar-ring--inner" />
        <div className="radar-center"><LocateFixed size={32} /></div>
        <div className="nearby-flag">A</div>
      </section>

      <section className="check-in-card">
        <div>
          <span className="status-dot" />
          <small>위치 권한 확인 전</small>
        </div>
        <h2>100m 안에 들어오면<br />인증 버튼이 활성화됩니다.</h2>
        <button type="button" className="primary-button">
          <Crosshair size={19} /> 내 주변 인증 가능 장소 찾기
        </button>
        <p className="privacy-note"><ShieldCheck size={15} /> GPS 정확도·거리·중복 인증을 서버에서 확인합니다.</p>
      </section>
    </main>
  );
}

