import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { apiClient, setAccessToken, setUnauthorizedHandler, getErrorMessage } from '@/lib/api-client';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string | null;
  role: string;
  permissions: string[];
}

interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  hasPermission: (...perms: string[]) => boolean;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const bootstrap = async () => {
    try {
      const refreshResponse = await apiClient.post('/auth/refresh');
      setAccessToken(refreshResponse.data.accessToken);
      setUser(refreshResponse.data.user);
    } catch {
      setAccessToken(null);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    setUnauthorizedHandler(() => setUser(null));
    bootstrap();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const login = async (email: string, password: string) => {
    const response = await apiClient.post('/auth/login', { email, password });
    setAccessToken(response.data.accessToken);
    setUser(response.data.user);
  };

  const logout = async () => {
    try {
      await apiClient.post('/auth/logout');
    } catch {
      // ignore network errors on logout
    }
    setAccessToken(null);
    setUser(null);
  };

  const refreshUser = async () => {
    try {
      const response = await apiClient.get('/auth/me');
      setUser(response.data);
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  };

  const hasPermission = useCallback(
    (...perms: string[]) => {
      if (!user) return false;
      if (user.role === 'Super Admin') return true;
      return perms.every((p) => user.permissions.includes(p));
    },
    [user],
  );

  const value = useMemo(
    () => ({ user, isLoading, login, logout, hasPermission, refreshUser }),
    [user, isLoading, hasPermission],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
