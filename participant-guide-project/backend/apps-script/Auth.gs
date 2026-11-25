/**
 * Auth.gs - Authentication, Password Security, Session Tokens & RBAC
 */

/**
 * Secure password hashing function combining salt with multi-round HMAC-SHA256
 */
function hashPassword(password, salt) {
  var rawBytes = Utilities.computeHmacSha256Signature(password + ':' + salt, salt);
  var hardened = Utilities.computeHmacSha256Signature(rawBytes, salt);
  return Utilities.base64EncodeWebSafe(hardened);
}

/**
 * Constant-time password verification to prevent timing attacks
 */
function verifyPassword(password, salt, storedHash) {
  if (!password || !salt || !storedHash) return false;
  var computed = hashPassword(password, salt);
  if (computed.length !== storedHash.length) return false;
  var diff = 0;
  for (var i = 0; i < computed.length; i++) {
    diff |= computed.charCodeAt(i) ^ storedHash.charCodeAt(i);
  }
  return diff === 0;
}

/**
 * Generates an HMAC-signed session token for authenticated operations
 */
function generateSessionToken(subjectId, email, role, lifetimeHours) {
  var header = { alg: 'HS256', typ: 'JWT' };
  var nowSeconds = Math.floor(Date.now() / 1000);
  var expSeconds = nowSeconds + (lifetimeHours * 3600);

  var payload = {
    sub: subjectId,
    email: email.toLowerCase(),
    role: role,
    iat: nowSeconds,
    exp: expSeconds
  };

  var encodedHeader = Utilities.base64EncodeWebSafe(JSON.stringify(header)).replace(/=+$/, '');
  var encodedPayload = Utilities.base64EncodeWebSafe(JSON.stringify(payload)).replace(/=+$/, '');
  var stringToSign = encodedHeader + '.' + encodedPayload;

  var signatureBytes = Utilities.computeHmacSha256Signature(stringToSign, CONFIG.HMAC_SECRET);
  var encodedSignature = Utilities.base64EncodeWebSafe(signatureBytes).replace(/=+$/, '');

  return stringToSign + '.' + encodedSignature;
}

/**
 * Validates and decodes a session token. Returns null if invalid or expired.
 */
function validateSessionToken(token) {
  if (!token || typeof token !== 'string') return null;
  var parts = token.split('.');
  if (parts.length !== 3) return null;

  var encodedHeader = parts[0];
  var encodedPayload = parts[1];
  var providedSig = parts[2];
  var stringToSign = encodedHeader + '.' + encodedPayload;

  var expectedSigBytes = Utilities.computeHmacSha256Signature(stringToSign, CONFIG.HMAC_SECRET);
  var expectedSig = Utilities.base64EncodeWebSafe(expectedSigBytes).replace(/=+$/, '');

  if (providedSig !== expectedSig) return null;

  try {
    var payloadJson = Utilities.newBlob(Utilities.base64DecodeWebSafe(encodedPayload)).getDataAsString();
    var payload = JSON.parse(payloadJson);
    var nowSeconds = Math.floor(Date.now() / 1000);

    if (!payload.exp || nowSeconds > payload.exp) {
      return null; // Token expired
    }

    return payload;
  } catch (e) {
    return null;
  }
}

/**
 * Extracts and verifies session token from request payload.
 * Checks for required role if specified.
 */
function authenticateRequest(payload, requiredRole) {
  var token = payload ? (payload.token || payload._token) : null;
  if (!token) return null;

  var session = validateSessionToken(token);
  if (!session) return null;

  if (requiredRole && session.role !== requiredRole) {
    return null;
  }

  return session;
}

/**
 * Admin Login Handler
 */
function handleAdminLogin(data) {
  if (!data || !data.email || !data.password) {
    return errorResponse('Email and password are required', 'MISSING_CREDENTIALS', 400);
  }

  var email = String(data.email).trim().toLowerCase();
  var password = String(data.password);

  var admin = SheetsService.findOne(CONFIG.SHEETS.ADMINS, 'email', email);
  if (!admin) {
    return errorResponse('Invalid administrator credentials', 'INVALID_CREDENTIALS', 401);
  }

  if (admin.status !== 'Active') {
    return errorResponse('Administrator account is inactive or suspended', 'ACCOUNT_INACTIVE', 403);
  }

  if (!verifyPassword(password, admin.salt, admin.password_hash)) {
    return errorResponse('Invalid administrator credentials', 'INVALID_CREDENTIALS', 401);
  }

  var token = generateSessionToken(admin.admin_id, admin.email, 'Admin', CONFIG.ADMIN_SESSION_HOURS);

  // Record login event in Activity_Logs
  AdminService.logActivity(admin.admin_id, 'ADMIN_LOGIN', admin.admin_id, 'Admin signed in successfully from ' + (data.clientIp || 'Web Client'));

  return successResponse({
    token: token,
    admin: {
      adminId: admin.admin_id,
      email: admin.email,
      role: 'Admin',
      status: admin.status
    }
  }, 'Administrator authenticated successfully');
}

/**
 * User Registration Handler
 */
function handleUserRegister(data) {
  if (!data) return errorResponse('Missing registration data', 'BAD_REQUEST', 400);

  var fullName = Validation.sanitizeString(data.fullName, 100);
  var email = String(data.email || '').trim().toLowerCase();
  var mobile = Validation.sanitizeString(data.mobile, 20);
  var password = String(data.password || '');
  var role = data.role === CONFIG.USER_ROLES.PATIENT_FUNDRAISER ? CONFIG.USER_ROLES.PATIENT_FUNDRAISER : CONFIG.USER_ROLES.DONOR;

  if (!fullName || fullName.length < 2) {
    return errorResponse('Please provide a valid full name', 'INVALID_NAME', 400);
  }
  if (!Validation.isValidEmail(email)) {
    return errorResponse('Please provide a valid email address', 'INVALID_EMAIL', 400);
  }
  if (!Validation.isValidMobile(mobile)) {
    return errorResponse('Please provide a valid 10-digit mobile number', 'INVALID_MOBILE', 400);
  }
  if (!Validation.isValidPassword(password)) {
    return errorResponse('Password must be at least 8 characters long and contain letters and numbers', 'WEAK_PASSWORD', 400);
  }

  // Prevent duplicate email registration
  var existing = SheetsService.findOne(CONFIG.SHEETS.USERS, 'email', email);
  if (existing) {
    return errorResponse('An account with this email address already exists. Please log in.', 'DUPLICATE_EMAIL', 409);
  }

  var salt = Utilities.getUuid();
  var passwordHash = hashPassword(password, salt);
  var userId = 'usr-' + Utilities.getUuid().slice(0, 8);
  var createdAt = new Date().toISOString();

  SheetsService.insert(CONFIG.SHEETS.USERS, {
    user_id: userId,
    full_name: fullName,
    email: email,
    mobile: mobile,
    password_hash: passwordHash,
    salt: salt,
    role: role,
    account_status: CONFIG.ACCOUNT_STATUSES.ACTIVE,
    verification_status: CONFIG.VERIFICATION_STATUSES.PENDING,
    created_at: createdAt
  });

  var token = generateSessionToken(userId, email, role, CONFIG.USER_SESSION_HOURS);

  return successResponse({
    token: token,
    user: {
      userId: userId,
      fullName: fullName,
      email: email,
      mobile: mobile,
      role: role,
      accountStatus: CONFIG.ACCOUNT_STATUSES.ACTIVE,
      verificationStatus: CONFIG.VERIFICATION_STATUSES.PENDING,
      createdAt: createdAt
    }
  }, 'Account registered successfully');
}

/**
 * User Login Handler (supports Email or Mobile)
 */
function handleUserLogin(data) {
  if (!data || !data.identifier || !data.password) {
    return errorResponse('Identifier (email or mobile) and password are required', 'MISSING_CREDENTIALS', 400);
  }

  var identifier = String(data.identifier).trim().toLowerCase();
  var password = String(data.password);
  var cleanDigits = identifier.replace(/[\s\-()+]/g, '');

  var allUsers = SheetsService.getAll(CONFIG.SHEETS.USERS);
  var user = null;

  for (var i = 0; i < allUsers.length; i++) {
    var u = allUsers[i];
    if (String(u.email).toLowerCase() === identifier) {
      user = u;
      break;
    }
    var userDigits = String(u.mobile).replace(/[\s\-()+]/g, '');
    if (cleanDigits.length >= 10 && userDigits === cleanDigits) {
      user = u;
      break;
    }
  }

  if (!user) {
    return errorResponse('No account found with this email or mobile number', 'USER_NOT_FOUND', 401);
  }

  if (user.account_status === CONFIG.ACCOUNT_STATUSES.BLOCKED) {
    return errorResponse('This account is suspended. Please contact support.', 'ACCOUNT_BLOCKED', 403);
  }

  if (!verifyPassword(password, user.salt, user.password_hash)) {
    return errorResponse('Incorrect password. Please verify credentials.', 'INVALID_PASSWORD', 401);
  }

  var token = generateSessionToken(user.user_id, user.email, user.role, CONFIG.USER_SESSION_HOURS);

  return successResponse({
    token: token,
    user: {
      userId: user.user_id,
      fullName: user.full_name,
      email: user.email,
      mobile: user.mobile,
      role: user.role,
      accountStatus: user.account_status,
      verificationStatus: user.verification_status,
      createdAt: user.created_at
    }
  }, 'Logged in successfully');
}

/**
 * Password Reset Handler
 */
function handlePasswordReset(data) {
  if (!data || !data.email || !data.newPassword) {
    return errorResponse('Email and new password are required', 'MISSING_DATA', 400);
  }

  var email = String(data.email).trim().toLowerCase();
  var newPassword = String(data.newPassword);

  if (!Validation.isValidPassword(newPassword)) {
    return errorResponse('Password must be at least 8 characters long and contain letters and numbers', 'WEAK_PASSWORD', 400);
  }

  var user = SheetsService.findOne(CONFIG.SHEETS.USERS, 'email', email);
  if (!user) {
    return errorResponse('No account registered with that email address', 'NOT_FOUND', 404);
  }

  var newSalt = Utilities.getUuid();
  var newHash = hashPassword(newPassword, newSalt);

  SheetsService.update(CONFIG.SHEETS.USERS, 'user_id', user.user_id, {
    password_hash: newHash,
    salt: newSalt
  });

  return successResponse(null, 'Password updated successfully. You can now log in.');
}
