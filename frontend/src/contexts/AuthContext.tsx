/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useState, useEffect, useMemo, type ReactNode } from 'react';
import type { User, AuthContextType } from '../types/auth.types';
import { setAccessToken } from '../lib/axios';

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

const USER_STORAGE_KEY = 'studysync_user';
const TOKEN_STORAGE_KEY = 'studysync_token';

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    try {
      const stored = localStorage.getItem(USER_STORAGE_KEY);
      return stored ? (JSON.parse(stored) as User) : null;
    } catch {
      return null;
    }
  });

  const [accessTokenState, setAccessTokenState] = useState<string | null>(() => {
    try {
      return localStorage.getItem(TOKEN_STORAGE_KEY);
    } catch {
      return null;
    }
  });

  useEffect(() => {
    try {
      if (user) {
        localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
      } else {
        localStorage.removeItem(USER_STORAGE_KEY);
      }
    } catch {
      // Ignore localStorage errors
    }
  }, [user]);

  useEffect(() => {
    try {
      if (accessTokenState) {
        localStorage.setItem(TOKEN_STORAGE_KEY, accessTokenState);
      } else {
        localStorage.removeItem(TOKEN_STORAGE_KEY);
      }
    } catch {
      // Ignore localStorage errors
    }
  }, [accessTokenState]);

  const login = (userData: User, token: string) => {
    setAccessToken(token); // Lưu token vào RAM cho Axios interceptor
    setAccessTokenState(token); // Cập nhật React state
    setUser(userData);
  };

  const logout = () => {
    setAccessToken(null); // Xóa token khỏi RAM
    setAccessTokenState(null); // Xóa token khỏi React state
    setUser(null);
    localStorage.removeItem(USER_STORAGE_KEY);
    localStorage.removeItem(TOKEN_STORAGE_KEY);
  };

  const isAuthenticated = Boolean(user && accessTokenState);

  const value = useMemo(
    () => ({
      user,
      accessToken: accessTokenState,
      isAuthenticated,
      login,
      logout,
    }),
    [user, accessTokenState, isAuthenticated]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
