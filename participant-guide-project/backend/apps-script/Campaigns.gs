/**
 * Campaigns.gs - Medical Campaign Lifecycle and Public/Admin APIs
 */

var CampaignService = {
  /**
   * Creates a new medical campaign in Pending status
   */
  createCampaign: function(userId, data) {
    var title = Validation.sanitizeString(data.title, 150);
    var patientName = Validation.sanitizeString(data.patientName, 100);
    var category = Validation.sanitizeString(data.category, 50) || 'General Medical';
    var targetAmount = Number(data.targetAmount);
    var description = Validation.sanitizeString(data.description, 2000);
    var documentLink = Validation.sanitizeString(data.documentLink, 500);

    if (!title || title.length < 5) {
      return errorResponse('Campaign title must be at least 5 characters long', 'INVALID_TITLE', 400);
    }
    if (!patientName) {
      return errorResponse('Patient name is required', 'INVALID_PATIENT_NAME', 400);
    }
    if (!Validation.isValidAmount(targetAmount)) {
      return errorResponse('Please provide a valid target fundraising goal amount', 'INVALID_TARGET_AMOUNT', 400);
    }

    var campaignId = 'cmp-' + Utilities.getUuid().slice(0, 8);
    var createdAt = new Date().toISOString();

    var record = {
      campaign_id: campaignId,
      user_id: userId,
      campaign_title: title,
      patient_name: patientName,
      category: category,
      target_amount: Math.round(targetAmount),
      collected_amount: 0,
      description: description,
      document_link: documentLink,
      status: CONFIG.CAMPAIGN_STATUSES.PENDING,
      created_at: createdAt
    };

    SheetsService.insert(CONFIG.SHEETS.CAMPAIGNS, record);

    AdminService.logActivity(userId, 'CREATE_CAMPAIGN', campaignId, 'Campaign created: ' + title);

    return successResponse(record, 'Medical campaign submitted successfully. It is now pending administrative verification before public listing.');
  },

  /**
   * Retrieves all publicly approved campaigns
   */
  getApprovedCampaigns: function(categoryFilter) {
    var all = SheetsService.getAll(CONFIG.SHEETS.CAMPAIGNS);
    var approved = all.filter(function(c) {
      if (c.status !== CONFIG.CAMPAIGN_STATUSES.APPROVED) return false;
      if (categoryFilter && categoryFilter !== 'All') {
        return String(c.category).toLowerCase() === String(categoryFilter).toLowerCase();
      }
      return true;
    });

    return approved.map(function(c) {
      return {
        campaignId: c.campaign_id,
        campaignTitle: c.campaign_title,
        patientName: c.patient_name,
        category: c.category,
        targetAmount: Number(c.target_amount) || 0,
        collectedAmount: Number(c.collected_amount) || 0,
        description: c.description,
        status: c.status,
        createdAt: c.created_at
      };
    });
  },

  /**
   * Retrieves single campaign by ID
   */
  getCampaignDetails: function(campaignId, requestingUser) {
    var c = SheetsService.findOne(CONFIG.SHEETS.CAMPAIGNS, 'campaign_id', campaignId);
    if (!c) return null;

    // Non-approved campaigns can only be inspected by their creator or an Admin
    if (c.status !== CONFIG.CAMPAIGN_STATUSES.APPROVED) {
      if (!requestingUser || (requestingUser.role !== 'Admin' && requestingUser.sub !== c.user_id)) {
        return null;
      }
    }

    return {
      campaignId: c.campaign_id,
      userId: c.user_id,
      campaignTitle: c.campaign_title,
      patientName: c.patient_name,
      category: c.category,
      targetAmount: Number(c.target_amount) || 0,
      collectedAmount: Number(c.collected_amount) || 0,
      description: c.description,
      documentLink: requestingUser && (requestingUser.role === 'Admin' || requestingUser.sub === c.user_id) ? c.document_link : undefined,
      status: c.status,
      createdAt: c.created_at
    };
  },

  /**
   * Approves a campaign (Admin only)
   */
  approveCampaign: function(adminId, campaignId) {
    var c = SheetsService.findOne(CONFIG.SHEETS.CAMPAIGNS, 'campaign_id', campaignId);
    if (!c) return errorResponse('Campaign not found', 'NOT_FOUND', 404);

    SheetsService.update(CONFIG.SHEETS.CAMPAIGNS, 'campaign_id', campaignId, {
      status: CONFIG.CAMPAIGN_STATUSES.APPROVED
    });

    AdminService.logActivity(adminId, 'APPROVE_CAMPAIGN', campaignId, 'Approved campaign: ' + c.campaign_title);

    return successResponse({ campaignId: campaignId, status: 'approved' }, 'Campaign has been approved for public listing');
  },

  /**
   * Rejects a campaign (Admin only)
   */
  rejectCampaign: function(adminId, campaignId, reason) {
    var c = SheetsService.findOne(CONFIG.SHEETS.CAMPAIGNS, 'campaign_id', campaignId);
    if (!c) return errorResponse('Campaign not found', 'NOT_FOUND', 404);

    SheetsService.update(CONFIG.SHEETS.CAMPAIGNS, 'campaign_id', campaignId, {
      status: CONFIG.CAMPAIGN_STATUSES.REJECTED
    });

    AdminService.logActivity(adminId, 'REJECT_CAMPAIGN', campaignId, 'Rejected: ' + (reason || 'No specific reason given'));

    return successResponse({ campaignId: campaignId, status: 'rejected' }, 'Campaign has been declined');
  },

  /**
   * Deletes a campaign (Admin only)
   */
  deleteCampaign: function(adminId, campaignId) {
    var c = SheetsService.findOne(CONFIG.SHEETS.CAMPAIGNS, 'campaign_id', campaignId);
    if (!c) return errorResponse('Campaign not found', 'NOT_FOUND', 404);

    SheetsService.deleteRow(CONFIG.SHEETS.CAMPAIGNS, 'campaign_id', campaignId);

    AdminService.logActivity(adminId, 'DELETE_CAMPAIGN', campaignId, 'Campaign deleted permanently: ' + c.campaign_title);

    return successResponse(null, 'Campaign removed permanently');
  }
};
