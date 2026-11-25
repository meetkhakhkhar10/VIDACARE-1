/**
 * api.ts - Centralized TypeScript Definitions for VidaCare Google Apps Script API
 */

export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data: T | null;
  error?: string | null;
  timestamp?: string;
  statusCode?: number;
}

export type UserRole = 'Patient/Fundraiser' | 'Donor' | 'Admin';

export type VerificationStatus =
  | 'Pending'
  | 'Under Review'
  | 'Verified'
  | 'Rejected'
  | 'Resubmission Required';

export type AccountStatus = 'Active' | 'Blocked' | 'Suspended';

export type CampaignStatus = 'pending' | 'approved' | 'rejected';

export interface UserAccount {
  userId: string;
  fullName: string;
  email: string;
  mobile: string;
  role: 'Patient/Fundraiser' | 'Donor';
  accountStatus: AccountStatus;
  verificationStatus: VerificationStatus;
  createdAt: string;
}

export interface AdminAccount {
  adminId: string;
  email: string;
  role: 'Admin';
  status: 'Active' | 'Inactive' | 'Suspended';
}

export interface AuthSession {
  token: string;
  user?: UserAccount;
  admin?: AdminAccount;
}

export interface VerificationRequest {
  requestId: string;
  userId: string;
  fullName: string;
  email: string;
  mobile: string;
  documentType: string;
  documentLink: string;
  submittedAt: string;
  status: VerificationStatus;
  reviewedBy?: string;
  reviewedAt?: string;
  remarks?: string;
}

export interface BackendCampaign {
  campaignId: string;
  userId: string;
  campaignTitle: string;
  patientName: string;
  category: string;
  targetAmount: number;
  collectedAmount: number;
  description: string;
  documentLink?: string;
  status: CampaignStatus;
  createdAt: string;
}

export interface BackendDonation {
  donationId: string;
  campaignId: string;
  userId: string;
  donorName: string;
  amount: number;
  paymentStatus: string;
  donationDate: string;
  note?: string;
}

export interface DashboardStats {
  financials: {
    totalFundsCollectedINR: number;
    totalTargetRequiredINR: number;
    completedDonationsCount: number;
  };
  campaigns: {
    total: number;
    approved: number;
    pending: number;
    rejected: number;
  };
  users: {
    total: number;
    donors: number;
    patients: number;
    verifiedUsers: number;
    pendingVerifications: number;
  };
  generatedAt: string;
}

export interface ActivityLog {
  log_id: string;
  admin_id: string;
  action: string;
  target_id: string;
  details: string;
  timestamp: string;
}
