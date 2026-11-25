/**
 * AuthContext.tsx - Centralized Authentication Provider connecting to Apps Script API
 */

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { authService } from '../services/authService';
import { getStoredToken, getStoredRole } from '../services/api';
import { UserAccount, AdminAccount, UserRole, ApiResponse } from '../types/api';

interface AuthContextValue {
  user: UserAccount | null;
  admin: AdminAccount | null;
  role: UserRole | null;
  token: string | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isLoading: boolean;
  login: (identifier: string, password: string) => Promise<ApiResponse<{ token: string; user: UserAccount }>>;
  adminLogin: (email: string, password: string) => Promise<ApiResponse<{ token: string; admin: AdminAccount }>>;
  register: (
    fullName: string,
    email: string,
    mobile: string,
    password: string,
    role: 'Patient/Fundraiser' | 'Donor'
  ) => Promise<ApiResponse<{ token: string; user: UserAccount }>>;
  logout: () => void;
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserAccount | null>(null);
  const [admin, setAdmin] = useState<AdminAccount | null>(null);
  const [token, setToken] = useState<string | null>(getStoredToken());
  const [role, setRole] = useState<UserRole | null>((getStoredRole() as UserRole) || null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const refreshSession = useCallback(async () => {
    const existingToken = getStoredToken();
    if (!existingToken) {
      setUser(null);
      setAdmin(null);
      setRole(null);
      setToken(null);
      setIsLoading(false);
      return;
    }

    try {
      const res = await authService.validateSession();
      if (res.success && res.data) {
        setToken(existingToken);
        const session = res.data.session;
        const profile = res.data.profile;

        if (session.role === 'Admin') {
          setRole('Admin');
          setAdmin({
            adminId: session.sub,
            email: session.email,
            role: 'Admin',
            status: 'Active'
          });
          setUser(null);
        } else {
          setRole(session.role as UserRole);
          setUser(profile || {
            userId: session.sub,
            email: session.email,
            role: session.role
          });
          setAdmin(null);
        }
      } else {
        authService.logout();
        setUser(null);
        setAdmin(null);
        setRole(null);
        setToken(null);
      }
    } catch {
      authService.logout();
      setUser(null);
      setAdmin(null);
      setRole(null);
      setToken(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshSession();
  }, [refreshSession]);

  const login = async (identifier: string, password: string) => {
    setIsLoading(true);
    try {
      const res = await authService.userLogin(identifier, password);
      if (res.success && res.data) {
        setToken(res.data.token);
        setUser(res.data.user);
        setRole(res.data.user.role);
        setAdmin(null);
      }
      return res;
    } finally {
      setIsLoading(false);
    }
  };

  const adminLogin = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const res = await authService.adminLogin(email, password);
      if (res.success && res.data) {
        setToken(res.data.token);
        setAdmin(res.data.admin);
        setRole('Admin');
        setUser(null);
      }
      return res;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (
    fullName: string,
    email: string,
    mobile: string,
    password: string,
    role: 'Patient/Fundraiser' | 'Donor'
  ) => {
    setIsLoading(true);
    try {
      const res = await authService.userRegister(fullName, email, mobile, password, role);
      if (res.success && res.data) {
        setToken(res.data.token);
        setUser(res.data.user);
        setRole(res.data.user.role);
        setAdmin(null);
      }
      return res;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    authService.logout();
    setUser(null);
    setAdmin(null);
    setRole(null);
    setToken(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        admin,
        role,
        token,
        isAuthenticated: Boolean(token && (user || admin)),
        isAdmin: role === 'Admin',
        isLoading,
        login,
        adminLogin,
        register,
        logout,
        refreshSession
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuthContext(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return ctx;
}
