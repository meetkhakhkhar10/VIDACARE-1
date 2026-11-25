/**
 * Donations.gs - Donation Ledger, Aggregate Recalculations & Reports
 */

var DonationService = {
  /**
   * Records a simulated DEMO contribution and recalculates the campaign total
   */
  recordDonation: function(data, sessionUser) {
    var campaignId = Validation.sanitizeString(data.campaignId, 50);
    var donorName = Validation.sanitizeString(data.donorName, 100) || (sessionUser ? sessionUser.name : 'Anonymous Donor');
    var amount = Number(data.amount);

    if (!campaignId) {
      return errorResponse('Target campaign ID is required', 'MISSING_CAMPAIGN_ID', 400);
    }
    if (!Validation.isValidAmount(amount)) {
      return errorResponse('Please provide a valid contribution amount', 'INVALID_AMOUNT', 400);
    }

    var campaign = SheetsService.findOne(CONFIG.SHEETS.CAMPAIGNS, 'campaign_id', campaignId);
    if (!campaign) {
      return errorResponse('Target campaign could not be found', 'NOT_FOUND', 404);
    }
    if (campaign.status !== CONFIG.CAMPAIGN_STATUSES.APPROVED) {
      return errorResponse('Contributions can only be directed to approved medical campaigns', 'CAMPAIGN_NOT_APPROVED', 400);
    }

    var donationId = 'don-' + Utilities.getUuid().slice(0, 8);
    var now = new Date().toISOString();
    var userId = sessionUser ? sessionUser.sub : (data.userId || 'guest');

    var donationRecord = {
      donation_id: donationId,
      campaign_id: campaignId,
      user_id: userId,
      donor_name: donorName,
      amount: Math.round(amount),
      payment_status: 'Completed', // DEMO mode simulated completion
      donation_date: now
    };

    SheetsService.insert(CONFIG.SHEETS.DONATIONS, donationRecord);

    // Recalculate campaign collected amount directly from the Donations sheet
    this.recalculateCampaignCollectedAmount(campaignId);

    return successResponse({
      donationId: donationId,
      campaignId: campaignId,
      donorName: donorName,
      amount: Math.round(amount),
      paymentStatus: 'Completed (DEMO MODE)',
      donationDate: now,
      note: 'Simulated payment transaction. Real gateway verification will be integrated separately.'
    }, 'Donation recorded successfully in demo mode');
  },

  /**
   * Recalculates total collected amount for a campaign from valid donation rows
   */
  recalculateCampaignCollectedAmount: function(campaignId) {
    var allDonations = SheetsService.getAll(CONFIG.SHEETS.DONATIONS);
    var total = 0;

    allDonations.forEach(function(d) {
      if (String(d.campaign_id) === String(campaignId) && d.payment_status === 'Completed') {
        total += Number(d.amount) || 0;
      }
    });

    SheetsService.update(CONFIG.SHEETS.CAMPAIGNS, 'campaign_id', campaignId, {
      collected_amount: total
    });

    return total;
  },

  /**
   * Retrieves donor history
   */
  getDonationsByUser: function(userId) {
    var all = SheetsService.getAll(CONFIG.SHEETS.DONATIONS);
    return all.filter(function(d) {
      return String(d.user_id) === String(userId);
    });
  },

  /**
   * Retrieves donations for a specific campaign
   */
  getDonationsByCampaign: function(campaignId) {
    var all = SheetsService.getAll(CONFIG.SHEETS.DONATIONS);
    return all.filter(function(d) {
      return String(d.campaign_id) === String(campaignId);
    });
  },

  /**
   * Retrieves all donations across the platform (Admin only)
   */
  getAllDonations: function() {
    return SheetsService.getAll(CONFIG.SHEETS.DONATIONS);
  }
};
