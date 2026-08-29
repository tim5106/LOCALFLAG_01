import { webEnv } from '../../config/env';

export interface AuthUser { id: string; email: string; accessToken?: string; }
const storageKey = 'local-flag-user';

export async function signIn(email: string, password: string): Promise<AuthUser> {
  if (!email.includes('@') || password.length < 4) throw new Error('이메일과 4자 이상의 비밀번호를 입력해주세요.');
  if (webEnv.supabaseUrl && webEnv.supabaseAnonKey) {
    const response = await fetch(`${webEnv.supabaseUrl}/auth/v1/token?grant_type=password`, { method: 'POST', headers: { apikey: webEnv.supabaseAnonKey, 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) });
    const body = await response.json() as { access_token?: string; user?: { id: string; email?: string }; error_description?: string; msg?: string };
    if (!response.ok || !body.access_token || !body.user) throw new Error(body.error_description ?? body.msg ?? '로그인에 실패했어요.');
    const user = { id: body.user.id, email: body.user.email ?? email, accessToken: body.access_token }; localStorage.setItem(storageKey, JSON.stringify(user)); return user;
  }
  const user = { id: 'dev-user', email }; localStorage.setItem(storageKey, JSON.stringify(user)); return user;
}
export function getStoredUser(): AuthUser | null { try { return JSON.parse(localStorage.getItem(storageKey) ?? 'null') as AuthUser | null; } catch { return null; } }
export function getAccessToken() { return getStoredUser()?.accessToken; }
export function signOut() { localStorage.removeItem(storageKey); }
