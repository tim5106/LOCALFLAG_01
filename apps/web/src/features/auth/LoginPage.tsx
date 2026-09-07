import { Compass, LoaderCircle, Sparkles } from 'lucide-react';
import { useState } from 'react';
import { signIn } from './auth';

export function LoginPage({ onSignedIn }: { onSignedIn: () => void }) {
  const [email, setEmail] = useState('traveler@example.com'); const [password, setPassword] = useState('localflag');
  const [isLoading, setLoading] = useState(false); const [error, setError] = useState('');
  const submit = async (event: React.FormEvent) => { event.preventDefault(); setError(''); setLoading(true); try { await signIn(email.trim(), password); onSignedIn(); } catch (caught) { setError(caught instanceof Error ? caught.message : '로그인에 실패했어요.'); } finally { setLoading(false); } };
  return <main className="auth-page"><div className="auth-brand"><div className="auth-logo"><Compass size={30} /></div><p className="eyebrow"><Sparkles size={14} /> Local Flag</p><h1>숨은 장소를 발견하고<br />나만의 깃발을 모아보세요</h1><p>전국의 조용한 여행지를 탐색하고 방문 기록을 남겨보세요.</p></div><form className="auth-form" onSubmit={submit}><label>이메일<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required /></label><label>비밀번호<input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required /></label>{error && <p className="auth-error" role="alert">{error}</p>}<button className="primary-button" type="submit" disabled={isLoading}>{isLoading ? <><LoaderCircle className="spin" size={17} /> 로그인 중...</> : '개발 모드로 시작하기'}</button><small>실제 Supabase Auth는 키 설정 후 연결됩니다.</small></form></main>;
}
