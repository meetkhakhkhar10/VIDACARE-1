# VidaCare — Google Apps Script API Documentation

The VidaCare API is a RESTful JSON endpoint hosted via Google Apps Script Web App.

- **Base URL:** `https://script.google.com/macros/s/{DEPLOYMENT_ID}/exec`
- **Format:** All requests are sent with JSON bodies or query parameters.
- **Envelope Response Structure:**
  ```json
  {
    "success": true,
    "message": "Operation description",
    "data": { ... },
    "error": null,
    "timestamp": "2026-11-24T17:00:00.000Z",
    "statusCode": 200
  }
  ```

---

## 1. Authentication Endpoints

### 1.1 Admin Login
- **Method:** `POST`
- **Action:** `auth_admin_login`
- **Payload:**
  ```json
  {
    "action": "auth_admin_login",
    "data": {
      "email": "admin@vidacare.org",
      "password": "VidaAdmin@2026"
    }
  }
  ```
- **Response `data`:**
  ```json
  {
    "token": "eyJhbGciOiJIUzI1NiJ9...signature",
    "admin": {
      "adminId": "adm-001",
      "email": "admin@vidacare.org",
      "role": "Admin",
      "status": "Active"
    }
  }
  ```

### 1.2 User Registration
- **Method:** `POST`
- **Action:** `auth_user_register`
- **Payload:**
  ```json
  {
    "action": "auth_user_register",
    "data": {
      "fullName": "Elena Alvarez",
      "email": "elena@example.org",
      "mobile": "9876543210",
      "password": "SecurePassword@123",
      "role": "Patient/Fundraiser"
    }
  }
  ```

### 1.3 User Login
- **Method:** `POST`
- **Action:** `auth_user_login`
- **Payload:**
  ```json
  {
    "action": "auth_user_login",
    "data": {
      "identifier": "elena@example.org",
      "password": "SecurePassword@123"
    }
  }
  ```

### 1.4 Validate Session Token
- **Method:** `POST`
- **Action:** `auth_validate_session`
- **Payload:**
  ```json
  {
    "action": "auth_validate_session",
    "token": "eyJhbGciOiJIUzI1NiJ9..."
  }
  ```

### 1.5 Password Reset
- **Method:** `POST`
- **Action:** `auth_reset_password`
- **Payload:**
  ```json
  {
    "action": "auth_reset_password",
    "data": {
      "email": "user@example.org",
      "newPassword": "NewSecurePassword@2026"
    }
  }
  ```

---

## 2. Admin Dashboard Endpoints (Admin Token Required)

### 2.1 Get Dashboard Statistics
- **Method:** `POST`
- **Action:** `admin_get_dashboard_stats`
- **Returns:** Live computed financials, campaign counts, user totals, and verification queue length.

### 2.2 Get All Users
- **Method:** `POST`
- **Action:** `admin_get_all_users`
- **Returns:** Complete directory of users with password hashes and salts omitted.

### 2.3 Set User Status
- **Method:** `POST`
- **Action:** `admin_set_user_status`
- **Payload:** `{ "userId": "usr-123", "status": "Blocked", "reason": "Policy violation" }`

### 2.4 Get Verification Requests
- **Method:** `POST`
- **Action:** `admin_get_verification_requests`
- **Payload:** `{ "statusFilter": "Pending" }`

### 2.5 Review Verification Request
- **Method:** `POST`
- **Action:** `admin_review_verification`
- **Payload:**
  ```json
  {
    "requestId": "ver-abc",
    "decision": "Verified",
    "remarks": "Apollo hospital letterhead and billing verified directly"
  }
  ```

### 2.6 Campaign Moderation
- `admin_approve_campaign` — `{ "campaignId": "cmp-123" }`
- `admin_reject_campaign` — `{ "campaignId": "cmp-123", "reason": "Missing cost estimate" }`
- `admin_delete_campaign` — `{ "campaignId": "cmp-123" }`

### 2.7 Activity Logs
- **Method:** `POST`
- **Action:** `admin_get_activity_logs`
- **Payload:** `{ "limit": 50 }`

---

## 3. User & Verification Endpoints

### 3.1 Submit Verification Documents
- **Method:** `POST`
- **Action:** `verification_submit`
- **Payload:**
  ```json
  {
    "documentType": "Hospital Estimate",
    "fileName": "Apollo_Cardiac_Estimate.pdf",
    "fileBase64": "JVBERi0xLjQKJ...",
    "mimeType": "application/pdf"
  }
  ```

### 3.2 Get User Profile
- **Method:** `POST`
- **Action:** `user_get_profile`

### 3.3 Update User Profile
- **Method:** `POST`
- **Action:** `user_update_profile`
- **Payload:** `{ "fullName": "New Name", "mobile": "9998887776" }`

---

## 4. Campaign & Donation Endpoints

### 4.1 Create Campaign
- **Method:** `POST`
- **Action:** `campaign_create`
- **Payload:**
  ```json
  {
    "title": "Heart Valve Replacement for Aarav",
    "patientName": "Aarav Sharma",
    "category": "Heart Surgery",
    "targetAmount": 350000,
    "description": "Clinical details and story...",
    "documentLink": ""
  }
  ```

### 4.2 Get Approved Campaigns (Public)
- **Method:** `GET` or `POST`
- **Action:** `campaign_get_approved`
- **Returns:** Publicly viewable list of approved campaigns.

### 4.3 Record Donation (Demo Mode)
- **Method:** `POST`
- **Action:** `donation_create`
- **Payload:**
  ```json
  {
    "campaignId": "cmp-123",
    "donorName": "Dr. Vance",
    "amount": 2500
  }
  ```
