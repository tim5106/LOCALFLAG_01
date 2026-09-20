import { webEnv } from '../../config/env';

export interface AuthUser { id: string; email: string; accessToken?: string; }
const storageKey = 'local-flag-user';
const devTestToken = 'dev-test-token';

function canUseDevelopmentAuth() {
  return import.meta.env.DEV || import.meta.env.MODE === 'test';
}

function shouldUseSupabaseAuth() {
  return Boolean(webEnv.supabaseUrl && webEnv.supabaseAnonKey) && import.meta.env.MODE !== 'test';
}

export async function signIn(email: string, password: string): Promise<AuthUser> {
  if (!email.includes('@') || password.length < 4) throw new Error('이메일과 4자 이상의 비밀번호를 입력해주세요.');
  if (shouldUseSupabaseAuth()) {
    const response = await fetch(`${webEnv.supabaseUrl}/auth/v1/token?grant_type=password`, { method: 'POST', headers: { apikey: webEnv.supabaseAnonKey, 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) });
    const body = await response.json() as { access_token?: string; user?: { id: string; email?: string }; error_description?: string; msg?: string };
    if (!response.ok || !body.access_token || !body.user) throw new Error(body.error_description ?? body.msg ?? '로그인에 실패했어요.');
    const user = { id: body.user.id, email: body.user.email ?? email, accessToken: body.access_token };
    localStorage.setItem(storageKey, JSON.stringify(user));
    return user;
  }
  if (!canUseDevelopmentAuth()) throw new Error('로그인 설정이 완료되지 않았습니다.');
  const user = { id: 'dev-user', email, accessToken: devTestToken };
  localStorage.setItem(storageKey, JSON.stringify(user));
  return user;
}

export async function signUp(email: string, password: string, nickname?: string): Promise<AuthUser> {
  if (!email.includes('@') || password.length < 6) throw new Error('올바른 이메일과 6자 이상의 비밀번호를 입력해주세요.');
  if (shouldUseSupabaseAuth()) {
    const response = await fetch(`${webEnv.supabaseUrl}/auth/v1/signup`, {
      method: 'POST',
      headers: { apikey: webEnv.supabaseAnonKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, data: nickname ? { nickname } : undefined }),
    });
    const body = await response.json() as {
      access_token?: string;
      user?: { id: string; email?: string };
      id?: string;
      error_description?: string;
      msg?: string;
    };
    if (!response.ok) throw new Error(body.error_description ?? body.msg ?? '회원가입에 실패했어요.');
    if (body.access_token && body.user) {
      const user = { id: body.user.id, email: body.user.email ?? email, accessToken: body.access_token };
      localStorage.setItem(storageKey, JSON.stringify(user));
      return user;
    }
    // Supabase auto-login if token was not returned immediately
    try {
      return await signIn(email, password);
    } catch {
      return { id: body.id ?? body.user?.id ?? 'pending', email };
    }
  }
  if (!canUseDevelopmentAuth()) throw new Error('회원가입 설정이 완료되지 않았습니다.');
  const user = { id: 'dev-user', email, accessToken: devTestToken };
  localStorage.setItem(storageKey, JSON.stringify(user));
  return user;
}

export const JUDGE_ACCOUNT = {
  email: 'traveler@example.com',
  password: 'localflag',
};

export async function signInAsJudge(): Promise<AuthUser> {
  return signIn(JUDGE_ACCOUNT.email, JUDGE_ACCOUNT.password);
}

export function signInAsDev(): AuthUser {
  if (!canUseDevelopmentAuth()) throw new Error('Development authentication is disabled.');
  const user = { id: 'dev-user', email: 'dev@localflag.dev', accessToken: devTestToken };
  localStorage.setItem(storageKey, JSON.stringify(user));
  return user;
}

export function getStoredUser(): AuthUser | null {
  try { return JSON.parse(localStorage.getItem(storageKey) ?? 'null') as AuthUser | null; }
  catch { return null; }
}
export function getAccessToken() { return getStoredUser()?.accessToken; }
export function ensureTestAuthToken() {
  if (!canUseDevelopmentAuth()) throw new Error('Development authentication is disabled.');
  const existing = getAccessToken();
  if (existing) return existing;
  localStorage.setItem(storageKey, JSON.stringify({ id: 'dev-test-user', email: 'check-in-test@local-flag.dev', accessToken: devTestToken }));
  return devTestToken;
}
export function signOut() { localStorage.removeItem(storageKey); }
