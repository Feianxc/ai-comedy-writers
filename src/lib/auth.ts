// 认证工具
// 待实现: Session管理、用户信息存储

const AUTH_COOKIE = 'ai-comedy-session';
const USER_STORAGE_KEY = 'ai-comedy-user';

export function setSession(token: string, user: unknown): void {
  document.cookie = `${AUTH_COOKIE}=${token}; path=/; max-age=604800`;
  localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
}

export function getSession(): string | null {
  const match = document.cookie.match(new RegExp(`(^| )${AUTH_COOKIE}=([^;]+)`));
  return match ? match[2] : null;
}

export function getUser(): unknown | null {
  try {
    const stored = localStorage.getItem(USER_STORAGE_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}

export function clearSession(): void {
  document.cookie = `${AUTH_COOKIE}=; path=/; max-age=0`;
  localStorage.removeItem(USER_STORAGE_KEY);
}

export function isAuthenticated(): boolean {
  return !!getSession();
}
