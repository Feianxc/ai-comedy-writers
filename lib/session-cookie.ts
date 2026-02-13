export const APP_SESSION_COOKIE = 'ai-comedy.session-token';
export const APP_SESSION_COOKIE_SECURE = '__Secure-ai-comedy.session-token';

export const LEGACY_SESSION_COOKIES = [
  'next-auth.session-token',
  '__Secure-next-auth.session-token',
  'authjs.session-token',
  '__Secure-authjs.session-token',
] as const;

export const ALL_SESSION_COOKIES = [
  APP_SESSION_COOKIE,
  APP_SESSION_COOKIE_SECURE,
  ...LEGACY_SESSION_COOKIES,
] as const;

