/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useState, useEffect, useMemo, useCallback, type ReactNode } from 'react';
import type { User, AuthContextType, UpdateProfileInput } from '../types/auth.types';
import { setAccessToken } from '../lib/axios';
import { updateProfileApi } from '../api/user.api';

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
    // Keep the axios in-memory token in sync so API calls work right after a page reload.
    setAccessToken(accessTokenState);
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

  const updateProfile = useCallback(async (data: UpdateProfileInput) => {
    const updatedUser = await updateProfileApi(data);
    setUser(updatedUser);
  }, []);

  const isAuthenticated = Boolean(user && accessTokenState);

  const value = useMemo(
    () => ({
      user,
      accessToken: accessTokenState,
      isAuthenticated,
      login,
      logout,
      updateProfile,
    }),
    [user, accessTokenState, isAuthenticated, updateProfile]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
