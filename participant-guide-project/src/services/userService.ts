/**
 * userService.ts - Profile and Personal Data Service
 */

import { apiRequest } from './api';
import { ApiResponse, UserAccount, BackendCampaign, BackendDonation } from '../types/api';

export const userService = {
  async getProfile(): Promise<ApiResponse<UserAccount>> {
    return apiRequest<UserAccount>('user_get_profile');
  },

  async updateProfile(fullName?: string, mobile?: string): Promise<ApiResponse<UserAccount>> {
    return apiRequest<UserAccount>('user_update_profile', { fullName, mobile });
  },

  async getUserCampaigns(): Promise<ApiResponse<BackendCampaign[]>> {
    return apiRequest<BackendCampaign[]>('user_get_campaigns');
  },

  async getUserDonations(): Promise<ApiResponse<BackendDonation[]>> {
    return apiRequest<BackendDonation[]>('user_get_donations');
  }
};
