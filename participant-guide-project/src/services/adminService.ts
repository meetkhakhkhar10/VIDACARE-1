/**
 * adminService.ts - Administration Dashboard and Governance Service
 */

import { apiRequest } from './api';
import {
  ApiResponse,
  DashboardStats,
  UserAccount,
  BackendCampaign,
  BackendDonation,
  VerificationRequest,
  ActivityLog,
  VerificationStatus
} from '../types/api';

export const adminService = {
  /**
   * Aggregates real-time statistics from Google Sheets
   */
  async getDashboardStats(): Promise<ApiResponse<DashboardStats>> {
    return apiRequest<DashboardStats>('admin_get_dashboard_stats');
  },

  /**
   * Retrieves full directory of registered users
   */
  async getAllUsers(): Promise<ApiResponse<UserAccount[]>> {
    return apiRequest<UserAccount[]>('admin_get_all_users');
  },

  /**
   * Retrieves user account by ID
   */
  async getUserById(userId: string): Promise<ApiResponse<UserAccount>> {
    return apiRequest<UserAccount>('admin_get_user_by_id', { userId });
  },

  /**
   * Updates user account status (Active, Blocked, Suspended)
   */
  async setUserStatus(userId: string, status: string, reason?: string): Promise<ApiResponse<null>> {
    return apiRequest<null>('admin_set_user_status', { userId, status, reason });
  },

  /**
   * Retrieves all campaigns across all statuses
   */
  async getAllCampaigns(): Promise<ApiResponse<BackendCampaign[]>> {
    return apiRequest<BackendCampaign[]>('admin_get_all_campaigns');
  },

  /**
   * Approves a pending campaign
   */
  async approveCampaign(campaignId: string): Promise<ApiResponse<{ campaignId: string; status: string }>> {
    return apiRequest<{ campaignId: string; status: string }>('admin_approve_campaign', { campaignId });
  },

  /**
   * Rejects a campaign with feedback
   */
  async rejectCampaign(campaignId: string, reason: string): Promise<ApiResponse<{ campaignId: string; status: string }>> {
    return apiRequest<{ campaignId: string; status: string }>('admin_reject_campaign', { campaignId, reason });
  },

  /**
   * Deletes a campaign permanently
   */
  async deleteCampaign(campaignId: string): Promise<ApiResponse<null>> {
    return apiRequest<null>('admin_delete_campaign', { campaignId });
  },

  /**
   * Retrieves all donations across the platform
   */
  async getAllDonations(): Promise<ApiResponse<BackendDonation[]>> {
    return apiRequest<BackendDonation[]>('admin_get_all_donations');
  },

  /**
   * Retrieves verification requests queue
   */
  async getVerificationRequests(statusFilter?: string): Promise<ApiResponse<VerificationRequest[]>> {
    return apiRequest<VerificationRequest[]>('admin_get_verification_requests', { statusFilter });
  },

  /**
   * Reviews and decides on a verification request
   */
  async reviewVerification(
    requestId: string,
    decision: VerificationStatus,
    remarks?: string
  ): Promise<ApiResponse<any>> {
    return apiRequest('admin_review_verification', {
      requestId,
      decision,
      remarks
    });
  },

  /**
   * Retrieves chronological audit activity logs
   */
  async getActivityLogs(limit: number = 100): Promise<ApiResponse<ActivityLog[]>> {
    return apiRequest<ActivityLog[]>('admin_get_activity_logs', { limit });
  }
};
