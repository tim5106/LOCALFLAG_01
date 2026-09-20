import { Compass, LoaderCircle, Sparkles } from 'lucide-react';
import { useState } from 'react';
import { JUDGE_ACCOUNT, signIn, signInAsDev, signInAsJudge, signUp } from './auth';

export function LoginPage({ onSignedIn }: { onSignedIn: () => void }) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [nickname, setNickname] = useState('');
  const [email, setEmail] = useState(JUDGE_ACCOUNT.email);
  const [password, setPassword] = useState(JUDGE_ACCOUNT.password);
  const [isLoading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (isSignUp) {
        await signUp(email.trim(), password, nickname.trim() || undefined);
      } else {
        await signIn(email.trim(), password);
      }
      onSignedIn();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : (isSignUp ? '회원가입에 실패했어요.' : '로그인에 실패했어요.'));
    } finally {
      setLoading(false);
    }
  };

  const handleJudgeLogin = async () => {
    setError('');
    setLoading(true);
    try {
      await signInAsJudge();
      onSignedIn();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '심사용 계정 로그인에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleDevLogin = () => {
    signInAsDev();
    onSignedIn();
  };

  return (
    <main className="auth-page">
      <div className="auth-brand">
        <div className="auth-logo"><Compass size={30} /></div>
        <p className="eyebrow"><Sparkles size={14} /> Local Flag</p>
        <h1>숨은 장소를 발견하고<br />나만의 깃발을 모아보세요</h1>
        <p>전국의 조용한 여행지를 탐색하고 방문 기록을 남겨보세요.</p>
      </div>

      <form className="auth-form" onSubmit={submit}>
        <div className="auth-tabs" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={!isSignUp}
            className={`auth-tab ${!isSignUp ? 'auth-tab--active' : ''}`}
            onClick={() => { setIsSignUp(false); setError(''); }}
          >
            로그인
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={isSignUp}
            className={`auth-tab ${isSignUp ? 'auth-tab--active' : ''}`}
            onClick={() => { setIsSignUp(true); setError(''); }}
          >
            회원가입
          </button>
        </div>

        {isSignUp && (
          <label>
            닉네임
            <input
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="종로의 모험가 (선택)"
              maxLength={20}
            />
          </label>
        )}

        <label>
          이메일
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            required
          />
        </label>

        <label>
          비밀번호
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete={isSignUp ? 'new-password' : 'current-password'}
            required
            minLength={isSignUp ? 6 : 4}
            placeholder={isSignUp ? '6자 이상 입력해주세요' : ''}
          />
        </label>

        {error && <p className="auth-error" role="alert">{error}</p>}

        <button className="primary-button" type="submit" disabled={isLoading}>
          {isLoading ? (
            <><LoaderCircle className="spin" size={17} /> 처리 중...</>
          ) : isSignUp ? (
            '회원가입하고 1,000P 받기'
          ) : (
            '로그인하기'
          )}
        </button>

        <div className="auth-judge-card" style={{ margin: '14px 0 6px', padding: '12px 14px', background: '#F4EFEB', borderRadius: '12px', border: '1px solid #D5C8B8', textAlign: 'center' }}>
          <p style={{ margin: '0 0 6px', fontSize: '12px', fontWeight: 700, color: '#173F35' }}>
            🏛️ 심사위원 전용 평가 모드
          </p>
          <button
            type="button"
            className="primary-button"
            style={{ width: '100%', background: '#173F35', color: '#FFF8E9', fontSize: '13px', padding: '10px 12px', borderRadius: '8px', cursor: 'pointer', fontWeight: 700, border: 'none' }}
            disabled={isLoading}
            onClick={handleJudgeLogin}
          >
            🚀 1초 만에 심사위원 계정으로 시작하기
          </button>
          <div style={{ marginTop: '8px', padding: '6px 8px', background: '#EAE2D8', borderRadius: '6px', fontSize: '11px', color: '#485651' }}>
            <span>테스트 계정: <strong>{JUDGE_ACCOUNT.email}</strong> / PW: <strong>{JUDGE_ACCOUNT.password}</strong></span>
          </div>
          <small style={{ display: 'block', marginTop: '6px', color: '#6A7873', fontSize: '10.5px', lineHeight: 1.3 }}>
            * 버튼 클릭 시 공식 심사용 계정으로 즉시 자동 로그인됩니다.
          </small>
        </div>

        {import.meta.env.DEV && (
          <button
            type="button"
            className="auth-dev-link"
            onClick={handleDevLogin}
          >
            🛠️ 개발 모드로 바로 둘러보기 (게스트)
          </button>
        )}

        <small>
          {isSignUp
            ? '가입 즉시 신규 모험가 1,000P와 기본 깃발이 자동 지급됩니다.'
            : 'Supabase Auth 계정으로 안전하게 로그인합니다.'}
        </small>
      </form>
    </main>
  );
}
