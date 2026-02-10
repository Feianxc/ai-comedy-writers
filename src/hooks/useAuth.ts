import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSession, getUser, clearSession } from '@/lib/storage';
import type { User } from '@/types';

export interface UseAuthReturn {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: () => void;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

export function useAuth(): UseAuthReturn {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const checkSession = async () => {
    try {
      const session = getSession();
      if (!session) {
        setUser(null);
        setIsLoading(false);
        return;
      }

      const storedUser = getUser();
      if (storedUser) {
        // 验证token是否过期
        const expiresAt = storedUser.expiresAt ? new Date(storedUser.expiresAt) : storedUser.tokenExpiresAt ? new Date(storedUser.tokenExpiresAt) : new Date();
        if (expiresAt > new Date()) {
          setUser(storedUser);
        } else {
          clearSession();
          setUser(null);
        }
      }
    } catch (error) {
      console.error('Failed to check session:', error);
      clearSession();
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    checkSession();
  }, []);

  const login = () => {
    window.location.href = '/api/auth/login';
  };

  const logout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      clearSession();
      setUser(null);
      router.push('/');
    }
  };

  const refreshUser = async () => {
    setIsLoading(true);
    await checkSession();
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
