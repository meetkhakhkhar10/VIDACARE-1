# VidaCare — Database Structure Specification (Google Sheets)

The database for the VidaCare Medical Crowdfunding Platform is hosted on Google Sheets under the spreadsheet title: **`VIDACARE_DATABASE`**.

---

## Sheet 1: `Admins`
Stores authorized platform administrators who possess oversight permissions for campaign moderation, verification review, and user management.

| Column Header | Data Type | Nullable | Description / Validation |
| :--- | :--- | :--- | :--- |
| `admin_id` | String | No | Unique identifier (e.g. `adm-001`, `adm-uuid`) |
| `email` | String | No | Admin login email (Unique, case-insensitive) |
| `password_hash` | String | No | HMAC-SHA256 salted password hash |
| `salt` | String | No | Cryptographically random unique salt |
| `role` | String | No | Fixed: `'Admin'` |
| `status` | String | No | Enum: `'Active'`, `'Inactive'`, `'Suspended'` |
| `created_at` | ISO 8601 String | No | Account creation timestamp |

---

## Sheet 2: `Users`
Stores registered patient fundraisers and donors.

| Column Header | Data Type | Nullable | Description / Validation |
| :--- | :--- | :--- | :--- |
| `user_id` | String | No | Unique identifier (e.g. `usr-a1b2c3d4`) |
| `full_name` | String | No | User's full legal name |
| `email` | String | No | User's email address (Unique, validated) |
| `mobile` | String | No | 10 to 15 digit phone number |
| `password_hash` | String | No | HMAC-SHA256 salted password hash |
| `salt` | String | No | Cryptographically random unique salt |
| `role` | String | No | Enum: `'Patient/Fundraiser'`, `'Donor'` |
| `account_status` | String | No | Enum: `'Active'`, `'Blocked'`, `'Suspended'` |
| `verification_status` | String | No | Enum: `'Pending'`, `'Under Review'`, `'Verified'`, `'Rejected'`, `'Resubmission Required'` |
| `created_at` | ISO 8601 String | No | Account registration timestamp |

---

## Sheet 3: `Verification_Requests`
Tracks identity and medical documentation submitted by patient fundraisers for clinical verification.

| Column Header | Data Type | Nullable | Description / Validation |
| :--- | :--- | :--- | :--- |
| `request_id` | String | No | Unique identifier (e.g. `ver-e5f6g7h8`) |
| `user_id` | String | No | Foreign Key references `Users.user_id` |
| `full_name` | String | No | Submitter's full name |
| `email` | String | No | Submitter's email |
| `mobile` | String | No | Submitter's mobile |
| `document_type` | String | No | e.g. `'Government ID'`, `'Hospital Cost Estimate'`, `'Pathology Report'` |
| `document_link` | String | No | Restricted Google Drive file link |
| `submitted_at` | ISO 8601 String | No | Submission timestamp |
| `status` | String | No | Enum: `'Pending'`, `'Under Review'`, `'Verified'`, `'Rejected'`, `'Resubmission Required'` |
| `reviewed_by` | String | Yes | Foreign Key references `Admins.admin_id` |
| `reviewed_at` | ISO 8601 String | Yes | Review timestamp |
| `remarks` | String | Yes | Clinical reviewer notes or rejection reasons |

---

## Sheet 4: `Campaigns`
Stores medical fundraisers created by verified organizers.

| Column Header | Data Type | Nullable | Description / Validation |
| :--- | :--- | :--- | :--- |
| `campaign_id` | String | No | Unique identifier (e.g. `cmp-12345678`) |
| `user_id` | String | No | Foreign Key references `Users.user_id` (Creator) |
| `campaign_title` | String | No | Campaign headline |
| `patient_name` | String | No | Patient's full name |
| `category` | String | No | Medical specialty (e.g. `'Heart Surgery'`, `'Cancer'`) |
| `target_amount` | Number | No | Total goal in INR (₹) |
| `collected_amount` | Number | No | Total funds collected in INR (computed from Donations) |
| `description` | String | No | Patient narrative & clinical background |
| `document_link` | String | Yes | Reference verification document |
| `status` | String | No | Enum: `'pending'`, `'approved'`, `'rejected'` |
| `created_at` | ISO 8601 String | No | Campaign creation timestamp |

---

## Sheet 5: `Donations`
Simulated and real donation records.

| Column Header | Data Type | Nullable | Description / Validation |
| :--- | :--- | :--- | :--- |
| `donation_id` | String | No | Unique identifier (e.g. `don-98765432`) |
| `campaign_id` | String | No | Foreign Key references `Campaigns.campaign_id` |
| `user_id` | String | No | Donor user ID or `'guest'` |
| `donor_name` | String | No | Supporter name or `'Anonymous Donor'` |
| `amount` | Number | No | Contribution amount in INR (₹) |
| `payment_status` | String | No | Enum: `'Completed'`, `'Pending'`, `'Failed'` |
| `donation_date` | ISO 8601 String | No | Contribution timestamp |

---

## Sheet 6: `Activity_Logs`
Immutable administrative audit log recording all privileged and sensitive operations.

| Column Header | Data Type | Nullable | Description / Validation |
| :--- | :--- | :--- | :--- |
| `log_id` | String | No | Unique identifier (e.g. `log-abcdef12`) |
| `admin_id` | String | No | Performing actor (`Admins.admin_id` or user ID) |
| `action` | String | No | Action type (e.g. `'ADMIN_LOGIN'`, `'DECIDE_VERIFICATION'`) |
| `target_id` | String | Yes | Entity operated on |
| `details` | String | Yes | Contextual description or JSON payload |
| `timestamp` | ISO 8601 String | No | Timestamp of the event |
