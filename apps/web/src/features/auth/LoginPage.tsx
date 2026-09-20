import { Compass, LoaderCircle, Sparkles } from 'lucide-react';
import { useState } from 'react';
import { signIn, signInAsDev, signUp } from './auth';

export function LoginPage({ onSignedIn }: { onSignedIn: () => void }) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [nickname, setNickname] = useState('');
  const [email, setEmail] = useState('traveler@example.com');
  const [password, setPassword] = useState('localflag');
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
