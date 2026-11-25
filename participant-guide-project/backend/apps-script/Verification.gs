/**
 * Verification.gs - Patient/Organizer Verification & Document Management in Google Drive
 */

var VerificationService = {
  /**
   * Uploads base64 encoded document to a restricted Google Drive folder
   */
  uploadDocumentToDrive: function(fileName, base64Data, mimeType, userId) {
    try {
      var folderId = CONFIG.DRIVE_FOLDER_ID;
      var folder;

      if (folderId) {
        folder = DriveApp.getFolderById(folderId);
      } else {
        // Fallback: search or create VidaCare_Verification folder in user's root Drive
        var folders = DriveApp.getFoldersByName('VIDACARE_VERIFICATION_DOCUMENTS');
        if (folders.hasNext()) {
          folder = folders.next();
        } else {
          folder = DriveApp.createFolder('VIDACARE_VERIFICATION_DOCUMENTS');
        }
      }

      var decoded = Utilities.base64Decode(base64Data);
      var safeName = userId + '_' + Date.now() + '_' + fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
      var blob = Utilities.newBlob(decoded, mimeType || 'application/pdf', safeName);

      var file = folder.createFile(blob);

      // Keep file private to Drive owner and administrators
      file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

      return {
        success: true,
        fileId: file.getId(),
        fileUrl: file.getUrl()
      };
    } catch (err) {
      return {
        success: false,
        error: err.message
      };
    }
  },

  /**
   * Submits a new verification request
   */
  submitRequest: function(userId, data) {
    var user = SheetsService.findOne(CONFIG.SHEETS.USERS, 'user_id', userId);
    if (!user) {
      return errorResponse('User account not found', 'NOT_FOUND', 404);
    }

    var documentType = Validation.sanitizeString(data.documentType, 100);
    var documentLink = '';

    // Handle base64 document upload if provided
    if (data.fileBase64 && data.fileName) {
      var uploadRes = this.uploadDocumentToDrive(data.fileName, data.fileBase64, data.mimeType, userId);
      if (!uploadRes.success) {
        return errorResponse('Could not upload verification file to Google Drive: ' + uploadRes.error, 'DRIVE_ERROR', 500);
      }
      documentLink = uploadRes.fileUrl;
    } else if (data.documentLink) {
      documentLink = Validation.sanitizeString(data.documentLink, 500);
    } else {
      return errorResponse('A verification document (file upload or verified document link) is required', 'MISSING_DOCUMENT', 400);
    }

    var requestId = 'ver-' + Utilities.getUuid().slice(0, 8);
    var now = new Date().toISOString();

    var record = {
      request_id: requestId,
      user_id: userId,
      full_name: user.full_name,
      email: user.email,
      mobile: user.mobile,
      document_type: documentType || 'Government ID / Medical Estimate',
      document_link: documentLink,
      submitted_at: now,
      status: CONFIG.VERIFICATION_STATUSES.PENDING,
      reviewed_by: '',
      reviewed_at: '',
      remarks: data.remarks ? Validation.sanitizeString(data.remarks, 500) : ''
    };

    SheetsService.insert(CONFIG.SHEETS.VERIFICATION_REQUESTS, record);

    // Update user's verification status to Pending
    SheetsService.update(CONFIG.SHEETS.USERS, 'user_id', userId, {
      verification_status: CONFIG.VERIFICATION_STATUSES.PENDING
    });

    AdminService.logActivity(userId, 'SUBMIT_VERIFICATION', requestId, 'Verification request submitted for ' + user.email);

    return successResponse(record, 'Verification documents submitted successfully for administrative review');
  },

  /**
   * Retrieves all verification requests (Admin only)
   */
  getAllRequests: function(statusFilter) {
    var all = SheetsService.getAll(CONFIG.SHEETS.VERIFICATION_REQUESTS);
    if (!statusFilter || statusFilter === 'All') return all;

    return all.filter(function(r) {
      return String(r.status).toLowerCase() === String(statusFilter).toLowerCase();
    });
  },

  /**
   * Reviews and decides on a verification request (Approve, Reject, Resubmission)
   */
  reviewRequest: function(adminId, requestId, decision, remarks) {
    if (!Validation.isValidVerificationStatus(decision)) {
      return errorResponse('Invalid verification decision status: ' + decision, 'INVALID_STATUS', 400);
    }

    var req = SheetsService.findOne(CONFIG.SHEETS.VERIFICATION_REQUESTS, 'request_id', requestId);
    if (!req) {
      return errorResponse('Verification request not found', 'NOT_FOUND', 404);
    }

    var now = new Date().toISOString();
    var cleanRemarks = remarks ? Validation.sanitizeString(remarks, 500) : '';

    // Update Verification_Requests record
    SheetsService.update(CONFIG.SHEETS.VERIFICATION_REQUESTS, 'request_id', requestId, {
      status: decision,
      reviewed_by: adminId,
      reviewed_at: now,
      remarks: cleanRemarks
    });

    // Update Users record
    SheetsService.update(CONFIG.SHEETS.USERS, 'user_id', req.user_id, {
      verification_status: decision
    });

    // Log decision
    AdminService.logActivity(
      adminId,
      'DECIDE_VERIFICATION',
      requestId,
      'Decision: ' + decision + ' for user ' + req.email + '. Remarks: ' + (cleanRemarks || 'None')
    );

    return successResponse({
      requestId: requestId,
      userId: req.user_id,
      status: decision,
      reviewedBy: adminId,
      reviewedAt: now,
      remarks: cleanRemarks
    }, 'Verification request has been ' + decision.toLowerCase());
  }
};
