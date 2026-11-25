/**
 * Validation.gs - Input Validation and Sanitization Utilities
 */

var Validation = {
  isValidEmail: function(email) {
    if (typeof email !== 'string') return false;
    var trimmed = email.trim().toLowerCase();
    var regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(trimmed) && trimmed.length <= 150;
  },

  isValidMobile: function(mobile) {
    if (!mobile) return false;
    var digits = String(mobile).replace(/[\s\-()+]/g, '');
    return digits.length >= 10 && digits.length <= 15 && /^\d+$/.test(digits);
  },

  isValidPassword: function(pw) {
    if (typeof pw !== 'string') return false;
    return pw.length >= 8 && /[A-Za-z]/.test(pw) && /\d/.test(pw);
  },

  sanitizeString: function(str, maxLength) {
    if (str === null || str === undefined) return '';
    var s = String(str).trim();
    if (maxLength && s.length > maxLength) {
      s = s.substring(0, maxLength);
    }
    return s;
  },

  isValidAmount: function(amount) {
    var num = Number(amount);
    return !isNaN(num) && isFinite(num) && num > 0;
  },

  isValidRole: function(role) {
    return role === CONFIG.USER_ROLES.DONOR ||
           role === CONFIG.USER_ROLES.PATIENT_FUNDRAISER ||
           role === CONFIG.USER_ROLES.ADMIN;
  },

  isValidVerificationStatus: function(status) {
    var valid = Object.values(CONFIG.VERIFICATION_STATUSES);
    return valid.indexOf(status) !== -1;
  },

  isValidCampaignStatus: function(status) {
    var valid = Object.values(CONFIG.CAMPAIGN_STATUSES);
    return valid.indexOf(status) !== -1;
  }
};
