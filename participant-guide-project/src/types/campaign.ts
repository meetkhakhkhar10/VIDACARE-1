export type MedicalCategory = string;

export type CampaignStatus = 'approved' | 'pending' | 'rejected';

export interface CategoryItem {
  id: string;
  name: string;
  displayTitle?: string;
  iconKey?: string;
  description: string;
  isActive: boolean;
  createdAt: string;
}

export interface ContactMessage {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  createdAt: string;
  status: 'unread' | 'read' | 'resolved';
}

export interface CampaignUpdate {
  id: string;
  date: string;
  title: string;
  summary: string;
  author: string;
}

export interface MedicalDocument {
  id: string;
  title: string;
  docType: 'Treatment Estimate' | 'Diagnostic Report' | 'Hospital Verification';
  issuedBy: string;
  issuedDate: string;
  fileSize: string;
  verified: boolean;
  summary: string;
  referenceCode: string;
  fileName?: string;
  mimeType?: string;
  previewUrl?: string;
  isTemporaryPreview?: boolean;
}

export interface MedicalCampaign {
  id: string;
  slug: string;
  creatorId?: string;
  creatorEmail?: string;
  title: string;
  patientName: string;
  ageLabel: string;
  condition: string;
  category: MedicalCategory;
  hospitalName: string;
  location: string;
  treatingDoctor?: string;
  organizerName: string;
  organizerRelation: string;
  summary: string;
  story: string[];
  treatmentDetails: string;
  imageUrl: string;
  goalAmount: number;
  raisedAmount: number;
  donorCount: number;
  daysRemaining: number;
  verifiedBy: string;
  hospitalVerified?: boolean;
  eligible80G?: boolean;
  settlementPreference?: 'Direct Hospital Billing' | 'Patient Reimbursement';
  status: CampaignStatus;
  rejectionReason?: string;
  featured: boolean;
  isUrgent?: boolean;
  createdAt: string;
  updates: CampaignUpdate[];
  documents?: MedicalDocument[];
}

export type PaymentMethodType =
  | 'UPI'
  | 'Debit/Credit Card'
  | 'Net Banking'
  | 'International Card';

export interface DonationRecord {
  id: string;
  campaignId: string;
  campaignTitle: string;
  donorId?: string;
  donorName: string;
  donorEmail?: string;
  donorPhone?: string;
  isAnonymous?: boolean;
  amount: number;
  platformTipAmount?: number;
  wants80GReceipt?: boolean;
  panNumber?: string;
  paymentMethod?: PaymentMethodType;
  paymentStatus?: 'Completed' | 'Pending' | 'Failed';
  transactionRef?: string;
  message?: string;
  timestamp: string;
}

export type UserRole =
  | 'Donor'
  | 'Patient/Fundraiser'
  | 'Care Coordinator'
  | 'Admin';

export interface UserSession {
  id: string;
  fullName: string;
  email: string;
  phone?: string;
  location?: string;
  avatarUrl?: string;
  role: UserRole;
  joinedAt: string;
}

export interface RegisteredAccount {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  location?: string;
  avatarUrl?: string;
  password: string;
  role: 'Donor' | 'Patient/Fundraiser' | 'Admin';
  blocked?: boolean;
  blockedReason?: string;
  createdAt: string;
}

export interface DashboardNotification {
  id: string;
  userId: string;
  type: 'approval' | 'rejection' | 'donation' | 'info';
  title: string;
  message: string;
  campaignId?: string;
  createdAt: string;
  read: boolean;
}

export interface AdminAuditEntry {
  id: string;
  campaignId: string;
  action: 'approved' | 'rejected' | 'resubmission_requested' | 'removed';
  actor: string;
  note: string;
  timestamp: string;
}

export interface VidaCareStore {
  schemaVersion?: number;
  campaigns: MedicalCampaign[];
  donations: DonationRecord[];
  savedCampaignIds: string[];
  user: UserSession | null;
  accounts: RegisteredAccount[];
  notifications: DashboardNotification[];
  categories: CategoryItem[];
  contactMessages: ContactMessage[];
  auditLogs?: AdminAuditEntry[];
  rememberedIdentifier?: string;
}
