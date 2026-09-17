const trimTrailingSlash = (value: string) => value.replace(/\/$/, '');

export const webEnv = {
  apiBaseUrl: trimTrailingSlash(import.meta.env.VITE_API_BASE_URL ?? '/api/v1'),
  kakaoMapAppKey: import.meta.env.VITE_KAKAO_MAP_APP_KEY ?? '',
  maptilerApiKey: import.meta.env.VITE_MAPTILER_API_KEY ?? '',
  maptilerStyleId: import.meta.env.VITE_MAPTILER_STYLE_ID ?? '01a0af18-7f5e-7fd3-a65b-00648fb439ea',
  supabaseUrl: import.meta.env.VITE_SUPABASE_URL ?? '',
  supabaseAnonKey: import.meta.env.VITE_SUPABASE_ANON_KEY ?? '',
} as const;

export const getMapTilerStyleUrl = () => {
  if (webEnv.maptilerStyleId) {
    if (webEnv.maptilerStyleId.startsWith('http://') || webEnv.maptilerStyleId.startsWith('https://')) {
      return webEnv.maptilerStyleId;
    }
    return `https://api.maptiler.com/maps/${webEnv.maptilerStyleId}/style.json?key=${webEnv.maptilerApiKey}`;
  }
  return 'streets-v2';
};
