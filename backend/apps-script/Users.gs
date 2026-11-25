/**
 * Users.gs - User Profile and Personal Activity Services
 */

var UserService = {
  getProfile: function(userId) {
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

  updateProfile: function(userId, updates) {
    var user = SheetsService.findOne(CONFIG.SHEETS.USERS, 'user_id', userId);
    if (!user) return null;

    var payload = {};
    if (updates.fullName) payload.full_name = Validation.sanitizeString(updates.fullName, 100);
    if (updates.mobile && Validation.isValidMobile(updates.mobile)) {
      payload.mobile = Validation.sanitizeString(updates.mobile, 20);
    }

    if (Object.keys(payload).length > 0) {
      SheetsService.update(CONFIG.SHEETS.USERS, 'user_id', userId, payload);
    }

    return this.getProfile(userId);
  },

  getUserCampaigns: function(userId) {
    var all = SheetsService.getAll(CONFIG.SHEETS.CAMPAIGNS);
    return all.filter(function(c) {
      return String(c.user_id) === String(userId);
    });
  },

  getUserDonations: function(userId) {
    var all = SheetsService.getAll(CONFIG.SHEETS.DONATIONS);
    return all.filter(function(d) {
      return String(d.user_id) === String(userId);
    });
  }
};
