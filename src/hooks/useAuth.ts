import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { User } from '@/types';

interface AuthMeResponse {
  user: {
    id: string;
    secondmeUserId?: string;
    displayName: string;
    bio?: string;
    image?: string;
    interests?: string[];
  };
}

export interface UseAuthReturn {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (redirectUrl?: string) => void;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AUTH_CACHE_TTL_MS = 12_000;

interface AuthCacheState {
  user: User | null;
  expiresAt: number;
}

let authCacheState: AuthCacheState | null = null;
let authRequestPromise: Promise<User | null> | null = null;

function mapAuthUserToUser(payload: AuthMeResponse['user']): User {
  const secondmeUserId = payload.secondmeUserId ?? payload.id;
  return {
    id: payload.id,
    secondmeUserId,
    accessToken: '',
    refreshToken: '',
    tokenExpiresAt: new Date(),
    expiresAt: new Date(),
    displayName: payload.displayName,
    bio: payload.bio ?? null,
    avatar: payload.image ?? null,
    interests: payload.interests ?? [],
    createdAt: new Date(),
    updatedAt: new Date(),
    lastLoginAt: new Date(),
    userAgent: {
      id: payload.id,
      displayName: payload.displayName,
      bio: payload.bio,
      interests: payload.interests,
      avatar: payload.image,
    },
  };
}

function getCachedSessionUser(): User | null | undefined {
  if (!authCacheState) {
    return undefined;
  }

  if (Date.now() > authCacheState.expiresAt) {
    authCacheState = null;
    return undefined;
  }

  return authCacheState.user;
}

function setCachedSessionUser(user: User | null): void {
  authCacheState = {
    user,
    expiresAt: Date.now() + AUTH_CACHE_TTL_MS,
  };
}

async function fetchSessionUser(): Promise<User | null> {
  const response = await fetch('/api/auth/me', {
    method: 'GET',
    credentials: 'include',
    cache: 'no-store',
  });

  if (!response.ok) {
    return null;
  }

  const result = (await response.json()) as {
    code: number;
    data?: AuthMeResponse;
  };

  if (result.code !== 0 || !result.data?.user) {
    return null;
  }

  return mapAuthUserToUser(result.data.user);
}

async function resolveSessionUser(force = false): Promise<User | null> {
  if (!force) {
    const cached = getCachedSessionUser();
    if (cached !== undefined) {
      return cached;
    }
  }

  if (authRequestPromise) {
    return authRequestPromise;
  }

  authRequestPromise = fetchSessionUser()
    .then((nextUser) => {
      setCachedSessionUser(nextUser);
      return nextUser;
    })
    .catch((error) => {
      setCachedSessionUser(null);
      throw error;
    })
    .finally(() => {
      authRequestPromise = null;
    });

  return authRequestPromise;
}

export function useAuth(): UseAuthReturn {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(() => {
    const cached = getCachedSessionUser();
    return cached === undefined ? null : cached;
  });
  const [isLoading, setIsLoading] = useState(() => getCachedSessionUser() === undefined);

  useEffect(() => {
    let mounted = true;
    const cached = getCachedSessionUser();

    if (cached !== undefined) {
      setUser(cached);
      setIsLoading(false);
      return () => {
        mounted = false;
      };
    }

    setIsLoading(true);
    void resolveSessionUser(false)
      .then((nextUser) => {
        if (!mounted) {
          return;
        }
        setUser(nextUser);
      })
      .catch((error) => {
        console.error('Failed to check session:', error);
        if (!mounted) {
          return;
        }
        setUser(null);
      })
      .finally(() => {
        if (mounted) {
          setIsLoading(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, []);

  const login = (redirectUrl?: string) => {
    const target = redirectUrl && redirectUrl.startsWith('/') ? redirectUrl : '/battle';
    window.location.href = `/api/auth/login?redirect_url=${encodeURIComponent(target)}`;
  };

  const logout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setCachedSessionUser(null);
      setUser(null);
      router.push('/');
    }
  };

  const refreshUser = async () => {
    setIsLoading(true);
    try {
      const nextUser = await resolveSessionUser(true);
      setUser(nextUser);
    } catch (error) {
      console.error('Failed to refresh session:', error);
      setCachedSessionUser(null);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  return {
    user,
    isAuthenticated: !!user,
    isLoading,
    login,
    logout,
    refreshUser,
  };
}
