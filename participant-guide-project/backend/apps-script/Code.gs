/**
 * Code.gs - Central API Router and Request Dispatcher for Google Apps Script Web App
 */

/**
 * Handles GET requests: health checks, public campaign discovery, stats
 */
function doGet(e) {
  try {
    var params = e && e.parameter ? e.parameter : {};
    var action = params.action || 'health';

    switch (action) {
      case 'health':
        return successResponse({
          status: 'online',
          version: CONFIG.APP_VERSION,
          app: CONFIG.APP_NAME,
          timestamp: new Date().toISOString()
        }, 'VidaCare Backend API is healthy and operational');

      case 'init_database':
        var initResult = initDatabase();
        return successResponse(initResult, 'Database verified and provisioned');

      case 'get_approved_campaigns':
        var campaigns = CampaignService.getApprovedCampaigns(params.category);
        return successResponse(campaigns, 'Approved campaigns retrieved successfully');

      case 'get_campaign_details':
        if (!params.campaignId) {
          return errorResponse('Missing campaignId parameter', 'BAD_REQUEST', 400);
        }
        var session = validateSessionToken(params.token);
        var details = CampaignService.getCampaignDetails(params.campaignId, session);
        if (!details) {
          return notFoundResponse('Campaign not found or access restricted');
        }
        return successResponse(details, 'Campaign details retrieved');

      case 'get_dashboard_stats':
        var statsSession = authenticateRequest(params, 'Admin');
        if (!statsSession) {
          return unauthorizedResponse('Administrator session required to read statistics');
        }
        var stats = AdminService.getDashboardStats();
        return successResponse(stats, 'Dashboard statistics aggregated');

      default:
        return errorResponse('Unrecognized GET action: ' + action, 'INVALID_ACTION', 400);
    }
  } catch (err) {
    return errorResponse('GET Execution Error: ' + err.message, 'INTERNAL_ERROR', 500);
  }
}

/**
 * Handles POST requests: authentication, mutations, verification & admin operations
 */
function doPost(e) {
  try {
    var payload;

    if (!e || !e.postData || !e.postData.contents) {
      return errorResponse('Empty request body received', 'EMPTY_BODY', 400);
    }

    try {
      payload = JSON.parse(e.postData.contents);
    } catch (parseError) {
      return errorResponse('Malformed JSON in request body', 'JSON_PARSE_ERROR', 400);
    }

    var action = payload.action;
    var data = payload.data || {};
    var token = payload.token || data.token;

    if (!action) {
      return errorResponse('Action identifier is missing from request payload', 'MISSING_ACTION', 400);
    }

    switch (action) {
      // 1. Authentication
      case 'auth_admin_login':
        return handleAdminLogin(data);

      case 'auth_user_register':
        return handleUserRegister(data);

      case 'auth_user_login':
        return handleUserLogin(data);

      case 'auth_validate_session':
        var session = validateSessionToken(token);
        if (!session) {
          return unauthorizedResponse('Session has expired or is invalid');
        }
        var profile = UserService.getProfile(session.sub);
        return successResponse({ session: session, profile: profile }, 'Session is valid');

      case 'auth_reset_password':
        return handlePasswordReset(data);

      // 2. Admin Operations (Strictly require Admin role)
      case 'admin_get_dashboard_stats':
        if (!authenticateRequest(payload, 'Admin')) return forbiddenResponse();
        return successResponse(AdminService.getDashboardStats());

      case 'admin_get_all_users':
        if (!authenticateRequest(payload, 'Admin')) return forbiddenResponse();
        return successResponse(AdminService.getAllUsers());

      case 'admin_get_user_by_id':
        if (!authenticateRequest(payload, 'Admin')) return forbiddenResponse();
        var u = AdminService.getUserById(data.userId);
        return u ? successResponse(u) : notFoundResponse('User not found');

      case 'admin_set_user_status':
        var adminSession = authenticateRequest(payload, 'Admin');
        if (!adminSession) return forbiddenResponse();
        var ok = AdminService.setUserStatus(adminSession.sub, data.userId, data.status, data.reason);
        return ok ? successResponse(null, 'User account status updated') : errorResponse('Could not update status');

      case 'admin_get_all_campaigns':
        if (!authenticateRequest(payload, 'Admin')) return forbiddenResponse();
        return successResponse(SheetsService.getAll(CONFIG.SHEETS.CAMPAIGNS));

      case 'admin_approve_campaign':
        var adm1 = authenticateRequest(payload, 'Admin');
        if (!adm1) return forbiddenResponse();
        return CampaignService.approveCampaign(adm1.sub, data.campaignId);

      case 'admin_reject_campaign':
        var adm2 = authenticateRequest(payload, 'Admin');
        if (!adm2) return forbiddenResponse();
        return CampaignService.rejectCampaign(adm2.sub, data.campaignId, data.reason);

      case 'admin_delete_campaign':
        var adm3 = authenticateRequest(payload, 'Admin');
        if (!adm3) return forbiddenResponse();
        return CampaignService.deleteCampaign(adm3.sub, data.campaignId);

      case 'admin_get_all_donations':
        if (!authenticateRequest(payload, 'Admin')) return forbiddenResponse();
        return successResponse(DonationService.getAllDonations());

      case 'admin_get_verification_requests':
        if (!authenticateRequest(payload, 'Admin')) return forbiddenResponse();
        return successResponse(VerificationService.getAllRequests(data.statusFilter));

      case 'admin_review_verification':
        var adm4 = authenticateRequest(payload, 'Admin');
        if (!adm4) return forbiddenResponse();
        return VerificationService.reviewRequest(adm4.sub, data.requestId, data.decision, data.remarks);

      case 'admin_get_activity_logs':
        if (!authenticateRequest(payload, 'Admin')) return forbiddenResponse();
        return successResponse(AdminService.getActivityLogs(data.limit || 100));

      // 3. User Dashboard
      case 'user_get_profile':
        var userAuth = authenticateRequest(payload);
        if (!userAuth) return unauthorizedResponse();
        var userProfile = UserService.getProfile(userAuth.sub);
        return userProfile ? successResponse(userProfile) : notFoundResponse('User profile not found');

      case 'user_update_profile':
        var userAuth2 = authenticateRequest(payload);
        if (!userAuth2) return unauthorizedResponse();
        var updatedProfile = UserService.updateProfile(userAuth2.sub, data);
        return successResponse(updatedProfile, 'Profile updated successfully');

      case 'user_get_campaigns':
        var userAuth3 = authenticateRequest(payload);
        if (!userAuth3) return unauthorizedResponse();
        return successResponse(UserService.getUserCampaigns(userAuth3.sub));

      case 'user_get_donations':
        var userAuth4 = authenticateRequest(payload);
        if (!userAuth4) return unauthorizedResponse();
        return successResponse(UserService.getUserDonations(userAuth4.sub));

      // 4. Verification Workflow
      case 'verification_submit':
        var verAuth = authenticateRequest(payload);
        if (!verAuth) return unauthorizedResponse();
        return VerificationService.submitRequest(verAuth.sub, data);

      // 5. Campaigns
      case 'campaign_create':
        var campAuth = authenticateRequest(payload);
        if (!campAuth) return unauthorizedResponse();
        return CampaignService.createCampaign(campAuth.sub, data);

      case 'campaign_get_approved':
        return successResponse(CampaignService.getApprovedCampaigns(data.category));

      case 'campaign_get_details':
        var optSession = validateSessionToken(token);
        var campDetails = CampaignService.getCampaignDetails(data.campaignId, optSession);
        return campDetails ? successResponse(campDetails) : notFoundResponse('Campaign not found');

      // 6. Donations
      case 'donation_create':
        var donSession = validateSessionToken(token);
        return DonationService.recordDonation(data, donSession);

      case 'donation_history':
        var donAuth = authenticateRequest(payload);
        if (!donAuth) return unauthorizedResponse();
        return successResponse(DonationService.getDonationsByUser(donAuth.sub));

      default:
        return errorResponse('Unrecognized POST action: ' + action, 'INVALID_ACTION', 400);
    }
  } catch (err) {
    return errorResponse('POST Execution Error: ' + err.message, 'INTERNAL_ERROR', 500);
  }
}
