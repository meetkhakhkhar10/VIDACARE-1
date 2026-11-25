/**
 * Admin.gs - Administrative Portal Queries, Actions, Reports & Activity Logs
 */

var AdminService = {
  /**
   * Appends an immutable record to the Activity_Logs sheet
   */
  logActivity: function(adminId, action, targetId, details) {
    try {
      SheetsService.insert(CONFIG.SHEETS.ACTIVITY_LOGS, {
        log_id: 'log-' + Utilities.getUuid().slice(0, 8),
        admin_id: adminId || 'SYSTEM',
        action: action,
        target_id: targetId || '',
        details: typeof details === 'object' ? JSON.stringify(details) : String(details || ''),
        timestamp: new Date().toISOString()
      });
    } catch (e) {
      Logger.log('Failed to write activity log: ' + e.message);
    }
  },

  /**
   * Aggregates live statistical metrics directly from Google Sheets
   */
  getDashboardStats: function() {
    var users = SheetsService.getAll(CONFIG.SHEETS.USERS);
    var campaigns = SheetsService.getAll(CONFIG.SHEETS.CAMPAIGNS);
    var donations = SheetsService.getAll(CONFIG.SHEETS.DONATIONS);
    var verifications = SheetsService.getAll(CONFIG.SHEETS.VERIFICATION_REQUESTS);

    var totalFundsCollected = 0;
    var totalTargetRequired = 0;
    var completedDonationsCount = 0;

    donations.forEach(function(d) {
      if (d.payment_status === 'Completed') {
        var amt = Number(d.amount) || 0;
        totalFundsCollected += amt;
        completedDonationsCount++;
      }
    });

    var approvedCampaignsCount = 0;
    var pendingCampaignsCount = 0;
    var rejectedCampaignsCount = 0;

    campaigns.forEach(function(c) {
      totalTargetRequired += Number(c.target_amount) || 0;
      if (c.status === 'approved') approvedCampaignsCount++;
      else if (c.status === 'pending') pendingCampaignsCount++;
      else if (c.status === 'rejected') rejectedCampaignsCount++;
    });

    var pendingVerificationsCount = 0;
    var verifiedUsersCount = 0;

    verifications.forEach(function(v) {
      if (v.status === CONFIG.VERIFICATION_STATUSES.PENDING || v.status === CONFIG.VERIFICATION_STATUSES.UNDER_REVIEW) {
        pendingVerificationsCount++;
      }
      if (v.status === CONFIG.VERIFICATION_STATUSES.VERIFIED) {
        verifiedUsersCount++;
      }
    });

    var donorsCount = users.filter(function(u) { return u.role === CONFIG.USER_ROLES.DONOR; }).length;
    var patientCount = users.filter(function(u) { return u.role === CONFIG.USER_ROLES.PATIENT_FUNDRAISER; }).length;

    return {
      financials: {
        totalFundsCollectedINR: totalFundsCollected,
        totalTargetRequiredINR: totalTargetRequired,
        completedDonationsCount: completedDonationsCount
      },
      campaigns: {
        total: campaigns.length,
        approved: approvedCampaignsCount,
        pending: pendingCampaignsCount,
        rejected: rejectedCampaignsCount
      },
      users: {
        total: users.length,
        donors: donorsCount,
        patients: patientCount,
        verifiedUsers: verifiedUsersCount,
        pendingVerifications: pendingVerificationsCount
      },
      generatedAt: new Date().toISOString()
    };
  },

  /**
   * Retrieves all registered users with password hashes and salts stripped
   */
  getAllUsers: function() {
    var raw = SheetsService.getAll(CONFIG.SHEETS.USERS);
    return raw.map(function(u) {
      return {
        userId: u.user_id,
        fullName: u.full_name,
        email: u.email,
        mobile: u.mobile,
        role: u.role,
        accountStatus: u.account_status,
        verificationStatus: u.verification_status,
        createdAt: u.created_at
      };
    });
  },

  /**
   * Retrieves single user details
   */
  getUserById: function(userId) {
    var u = SheetsService.findOne(CONFIG.SHEETS.USERS, 'user_id', userId);
    if (!u) return null;
    return {
      userId: u.user_id,
      fullName: u.full_name,
      email: u.email,
      mobile: u.mobile,
      role: u.role,
      accountStatus: u.account_status,
      verificationStatus: u.verification_status,
      createdAt: u.created_at
    };
  },

  /**
   * Toggles or updates user account status (Active, Blocked, Suspended)
   */
  setUserStatus: function(adminId, userId, newStatus, reason) {
    var u = SheetsService.findOne(CONFIG.SHEETS.USERS, 'user_id', userId);
    if (!u) return false;

    var updated = SheetsService.update(CONFIG.SHEETS.USERS, 'user_id', userId, {
      account_status: newStatus
    });

    if (updated) {
      this.logActivity(adminId, 'UPDATE_USER_STATUS', userId, 'Status set to ' + newStatus + '. Reason: ' + (reason || 'None provided'));
    }
    return updated;
  },

  /**
   * Retrieves activity audit logs sorted newest first
   */
  getActivityLogs: function(limit) {
    var logs = SheetsService.getAll(CONFIG.SHEETS.ACTIVITY_LOGS);
    logs.sort(function(a, b) {
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    });
    return limit ? logs.slice(0, limit) : logs;
  }
};
