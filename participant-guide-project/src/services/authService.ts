/**
 * authService.ts - Client Authentication Service for VidaCare
 */

import { apiRequest, setStoredToken, getStoredToken } from './api';
import { ApiResponse, AuthSession, UserAccount, AdminAccount } from '../types/api';

export const authService = {
  /**
   * Admin email/password login
   */
  async adminLogin(email: string, password: string): Promise<ApiResponse<{ token: string; admin: AdminAccount }>> {
    const res = await apiRequest<{ token: string; admin: AdminAccount }>('auth_admin_login', {
      email,
      password
    });
    if (res.success && res.data?.token) {
      setStoredToken(res.data.token, 'Admin');
    }
    return res;
  },

  /**
   * User registration
   */
  async userRegister(
    fullName: string,
    email: string,
    mobile: string,
    password: string,
    role: 'Patient/Fundraiser' | 'Donor'
  ): Promise<ApiResponse<{ token: string; user: UserAccount }>> {
    const res = await apiRequest<{ token: string; user: UserAccount }>('auth_user_register', {
      fullName,
      email,
      mobile,
      password,
      role
    });
    if (res.success && res.data?.token) {
      setStoredToken(res.data.token, role);
    }
    return res;
  },

  /**
   * User login with email or 10-digit mobile number
   */
  async userLogin(
    identifier: string,
    password: string
  ): Promise<ApiResponse<{ token: string; user: UserAccount }>> {
    const res = await apiRequest<{ token: string; user: UserAccount }>('auth_user_login', {
      identifier,
      password
    });
    if (res.success && res.data?.token) {
      setStoredToken(res.data.token, res.data.user.role);
    }
    return res;
  },

  /**
   * Validates active session token with the backend
   */
  async validateSession(): Promise<ApiResponse<{ session: any; profile: any }>> {
    const token = getStoredToken();
    if (!token) {
      return {
        success: false,
        message: 'No active session token',
        data: null,
        error: 'NO_TOKEN',
        statusCode: 401
      };
    }
    const res = await apiRequest<{ session: any; profile: any }>('auth_validate_session');
    if (!res.success) {
      setStoredToken(null);
    }
    return res;
  },

  /**
   * Logs out the active user or administrator
   */
  logout(): void {
    setStoredToken(null);
  },

  /**
   * Password reset workflow
   */
  async resetPassword(email: string, newPassword: string): Promise<ApiResponse<null>> {
    return apiRequest<null>('auth_reset_password', {
      email,
      newPassword
    });
  }
};
