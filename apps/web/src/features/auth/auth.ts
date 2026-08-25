import { webEnv } from '../../config/env';

export interface AuthUser { id: string; email: string; }
const storageKey = 'local-flag-dev-user';

export async function signIn(email: string, password: string): Promise<AuthUser> {
  if (!email.includes('@') || password.length < 4) throw new Error('이메일과 4자 이상의 비밀번호를 입력해주세요.');
  // Supabase SDK를 설치하면 이 지점에서 supabase.auth.signInWithPassword를 호출합니다.
  if (webEnv.supabaseUrl && webEnv.supabaseAnonKey) throw new Error('Supabase Auth 연결 준비 중입니다. 개발 모드로 로그인해주세요.');
  const user = { id: 'dev-user', email };
  localStorage.setItem(storageKey, JSON.stringify(user));
  return user;
}

export function getStoredUser(): AuthUser | null {
  try { return JSON.parse(localStorage.getItem(storageKey) ?? 'null') as AuthUser | null; } catch { return null; }
}
export function signOut() { localStorage.removeItem(storageKey); }
