import { User, AIPersona } from '@/types';

const AUTH_COOKIE = 'ai-comedy-session';
const USER_STORAGE_KEY = 'ai-comedy-user';
const PERSONA_STORAGE_KEY = 'ai-comedy-persona';
const TOPICS_STORAGE_KEY = 'ai-comedy-topics';

export function getStorageItem<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;

  try {
    const item = window.localStorage.getItem(key);
    return item ? JSON.parse(item) : fallback;
  } catch {
    return fallback;
  }
}

export function setStorageItem<T>(key: string, value: T): boolean {
  if (typeof window === 'undefined') return false;

  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

export function removeStorageItem(key: string): boolean {
  if (typeof window === 'undefined') return false;

  try {
    window.localStorage.removeItem(key);
    return true;
  } catch {
    return false;
  }
}

export function setSession(token: string, user: User): void {
  if (typeof window === 'undefined') return;
  document.cookie = `${AUTH_COOKIE}=${token}; path=/; max-age=604800; SameSite=Lax`;
  setStorageItem(USER_STORAGE_KEY, user);
}

export function getSession(): string | null {
  if (typeof window === 'undefined') return null;

  const match = document.cookie.match(new RegExp(`(^| )${AUTH_COOKIE}=([^;]+)`));
  return match ? match[2] : null;
}

export function getUser(): User | null {
  return getStorageItem<User | null>(USER_STORAGE_KEY, null);
}

export function clearSession(): void {
  if (typeof window === 'undefined') return;

  document.cookie = `${AUTH_COOKIE}=; path=/; max-age=0`;
  removeStorageItem(USER_STORAGE_KEY);
  removeStorageItem(PERSONA_STORAGE_KEY);
}

export function isAuthenticated(): boolean {
  return !!getSession();
}

export function getSelectedPersona(): AIPersona | null {
  return getStorageItem<AIPersona | null>(PERSONA_STORAGE_KEY, null);
}

export function setSelectedPersona(persona: AIPersona | null): boolean {
  if (persona === null) {
    return removeStorageItem(PERSONA_STORAGE_KEY);
  }
  return setStorageItem(PERSONA_STORAGE_KEY, persona);
}

export function getRecentTopics(): string[] {
  return getStorageItem<string[]>(TOPICS_STORAGE_KEY, []);
}

export function addRecentTopic(topic: string): void {
  const topics = getRecentTopics();
  const filtered = topics.filter((t) => t !== topic);
  setStorageItem(TOPICS_STORAGE_KEY, [topic, ...filtered].slice(0, 10));
}
