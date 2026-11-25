/**
 * Response.gs - Standardized API Response Builders for VidaCare Apps Script
 */

/**
 * Creates a standardized JSON response output for Apps Script Web App
 *
 * @param {boolean} success - Whether operation succeeded
 * @param {string} message - User-friendly message
 * @param {any} data - Payload data
 * @param {string} [error] - Error message or code
 * @param {number} [statusCode=200] - HTTP-like status indicator
 * @return {TextOutput}
 */
function createResponse(success, message, data, error, statusCode) {
  var output = {
    success: Boolean(success),
    message: message || (success ? 'Operation successful' : 'Operation failed'),
    data: data !== undefined && data !== null ? data : null,
    error: error || (success ? null : (message || 'Unknown error occurred')),
    timestamp: new Date().toISOString(),
    statusCode: statusCode || (success ? 200 : 400)
  };

  return ContentService.createTextOutput(JSON.stringify(output))
    .setMimeType(ContentService.MimeType.JSON);
}

function successResponse(data, message) {
  return createResponse(true, message || 'Success', data, null, 200);
}

function errorResponse(message, errorDetails, statusCode) {
  return createResponse(false, message || 'Error', null, errorDetails || message, statusCode || 400);
}

function unauthorizedResponse(message) {
  return createResponse(false, message || 'Unauthorized access: Valid session token required', null, 'UNAUTHORIZED', 401);
}

function forbiddenResponse(message) {
  return createResponse(false, message || 'Forbidden: Insufficient administrative privileges', null, 'FORBIDDEN', 403);
}

function notFoundResponse(message) {
  return createResponse(false, message || 'Resource not found', null, 'NOT_FOUND', 404);
}
