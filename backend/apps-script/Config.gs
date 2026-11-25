/**
 * Config.gs - Configuration Constants and Environment Settings for VidaCare Apps Script
 */

var CONFIG = {
  // Application details
  APP_NAME: 'VidaCare Medical Crowdfunding Platform',
  APP_VERSION: '1.0.0',
  SPREADSHEET_NAME: 'VIDACARE_DATABASE',

  // Spreadsheet ID: defaults to Active Spreadsheet if bound, or override via Script Properties
  get SPREADSHEET_ID() {
    var prop = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
    if (prop) return prop;
    try {
      return SpreadsheetApp.getActiveSpreadsheet().getId();
    } catch (e) {
      return '';
    }
  },

  // Google Drive folder ID for restricted verification documents
  get DRIVE_FOLDER_ID() {
    return PropertiesService.getScriptProperties().getProperty('DRIVE_FOLDER_ID') || '';
  },

  // HMAC Secret for signing session tokens
  get HMAC_SECRET() {
    var secret = PropertiesService.getScriptProperties().getProperty('HMAC_SECRET');
    if (!secret) {
      secret = Utilities.getUuid() + '-' + Utilities.getUuid();
      PropertiesService.getScriptProperties().setProperty('HMAC_SECRET', secret);
    }
    return secret;
  },

  // Session lifetimes in hours
  USER_SESSION_HOURS: 72,
  ADMIN_SESSION_HOURS: 8,

  // Table / Sheet Names (exact match with database specifications)
  SHEETS: {
    ADMINS: 'Admins',
    USERS: 'Users',
    VERIFICATION_REQUESTS: 'Verification_Requests',
    CAMPAIGNS: 'Campaigns',
    DONATIONS: 'Donations',
    ACTIVITY_LOGS: 'Activity_Logs'
  },

  // Headers for each sheet in the database
  HEADERS: {
    Admins: ['admin_id', 'email', 'password_hash', 'salt', 'role', 'status', 'created_at'],
    Users: ['user_id', 'full_name', 'email', 'mobile', 'password_hash', 'salt', 'role', 'account_status', 'verification_status', 'created_at'],
    Verification_Requests: ['request_id', 'user_id', 'full_name', 'email', 'mobile', 'document_type', 'document_link', 'submitted_at', 'status', 'reviewed_by', 'reviewed_at', 'remarks'],
    Campaigns: ['campaign_id', 'user_id', 'campaign_title', 'patient_name', 'category', 'target_amount', 'collected_amount', 'description', 'document_link', 'status', 'created_at'],
    Donations: ['donation_id', 'campaign_id', 'user_id', 'donor_name', 'amount', 'payment_status', 'donation_date'],
    Activity_Logs: ['log_id', 'admin_id', 'action', 'target_id', 'details', 'timestamp']
  },

  // Valid status constraints
  VERIFICATION_STATUSES: {
    PENDING: 'Pending',
    UNDER_REVIEW: 'Under Review',
    VERIFIED: 'Verified',
    REJECTED: 'Rejected',
    RESUBMISSION_REQUIRED: 'Resubmission Required'
  },

  CAMPAIGN_STATUSES: {
    PENDING: 'pending',
    APPROVED: 'approved',
    REJECTED: 'rejected'
  },

  USER_ROLES: {
    PATIENT_FUNDRAISER: 'Patient/Fundraiser',
    DONOR: 'Donor',
    ADMIN: 'Admin'
  },

  ACCOUNT_STATUSES: {
    ACTIVE: 'Active',
    BLOCKED: 'Blocked',
    SUSPENDED: 'Suspended'
  }
};
