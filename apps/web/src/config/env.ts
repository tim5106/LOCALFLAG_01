const trimTrailingSlash = (value: string) => value.replace(/\/$/, '');

export const webEnv = {
  apiBaseUrl: trimTrailingSlash(import.meta.env.VITE_API_BASE_URL ?? '/api/v1'),
  kakaoMapAppKey: import.meta.env.VITE_KAKAO_MAP_APP_KEY ?? '',
  supabaseUrl: import.meta.env.VITE_SUPABASE_URL ?? '',
  supabaseAnonKey: import.meta.env.VITE_SUPABASE_ANON_KEY ?? '',
} as const;
