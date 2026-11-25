# VidaCare — Google Apps Script Backend Setup & Deployment Guide

This directory contains the modular Google Apps Script backend that powers the VidaCare medical crowdfunding platform, using Google Sheets as the relational database and Google Drive for secure verification document storage.

---

## 1. Google Sheets Database Setup

1. Open [Google Sheets](https://sheets.new) in your Google browser account.
2. Name the spreadsheet: **`VIDACARE_DATABASE`**.
3. Note the **Spreadsheet ID** from the URL:
   `https://docs.google.com/spreadsheets/d/{SPREADSHEET_ID}/edit`

---

## 2. Google Drive Verification Storage Setup

1. Open [Google Drive](https://drive.google.com).
2. Create a folder named: **`VIDACARE_VERIFICATION_DOCUMENTS`**.
3. Note the **Folder ID** from the folder URL:
   `https://drive.google.com/drive/folders/{DRIVE_FOLDER_ID}`
4. Ensure access permissions for this folder remain **Restricted** (accessible only by the account owner and authorized administrators).

---

## 3. Creating & Populating the Apps Script Project

1. Inside your `VIDACARE_DATABASE` spreadsheet, navigate to **Extensions > Apps Script** (or visit [script.google.com](https://script.google.com) to create a standalone script).
2. Title the script project: **`VidaCare_API`**.
3. In the Apps Script editor, create 12 separate script files matching the `.gs` files in this directory:
   - `Code.gs`
   - `Config.gs`
   - `Database.gs`
   - `SheetsService.gs`
   - `Auth.gs`
   - `Admin.gs`
   - `Users.gs`
   - `Verification.gs`
   - `Campaigns.gs`
   - `Donations.gs`
   - `Validation.gs`
   - `Response.gs`
4. Copy and paste the corresponding code into each file.

---

## 4. Configuring Script Properties (Secrets & IDs)

In the Apps Script editor:
1. Click the **Project Settings** (gear icon) on the left sidebar.
2. Scroll down to **Script Properties** and click **Add script property**.
3. Add the following key-value pairs:

| Property Key | Value | Purpose |
| :--- | :--- | :--- |
| `SPREADSHEET_ID` | `{YOUR_GOOGLE_SHEET_ID}` | Target database spreadsheet |
| `DRIVE_FOLDER_ID` | `{YOUR_GOOGLE_DRIVE_FOLDER_ID}` | Secure document storage folder |
| `HMAC_SECRET` | `{STRONG_RANDOM_UUID_STRING}` | Secret key used to sign HMAC-SHA256 session tokens |

*Note: If `HMAC_SECRET` is left blank, the script automatically generates and saves a cryptographically random UUID on first execution.*

---

## 5. One-Time Database Initialization

1. Return to the **Editor** (`< >` icon) in Apps Script.
2. Select the `Database.gs` file.
3. In the function dropdown at the top, select **`initDatabase`** and click **Run**.
4. Grant the required Google Workspace permissions (Spreadsheet & Drive access) when prompted.
5. Check your `VIDACARE_DATABASE` spreadsheet:
   - You will see 6 sheets initialized with VidaCare forest-green headers:
     - `Admins` (seeded with initial admin: `admin@vidacare.org` / password: `VidaAdmin@2026`)
     - `Users`
     - `Verification_Requests`
     - `Campaigns`
     - `Donations`
     - `Activity_Logs`

---

## 6. Deploying as a Web App

1. Click the blue **Deploy** button in the top right corner and select **New deployment**.
2. Click the gear icon next to "Select type" and choose **Web app**.
3. Fill in the deployment configuration:
   - **Description:** `VidaCare Production API v1.0`
   - **Execute as:** `Me (your-email@gmail.com)`
   - **Who has access:** `Anyone` (Essential: allows the React frontend to communicate with the endpoint without requiring Google account sign-in popups).
4. Click **Deploy**.
5. Copy the generated **Web App URL**:
   `https://script.google.com/macros/s/{DEPLOYMENT_ID}/exec`

---

## 7. Connecting to the React Frontend

1. Inside your React project directory, copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
2. Set the `VITE_APPS_SCRIPT_URL` variable:
   ```env
   VITE_APPS_SCRIPT_URL="https://script.google.com/macros/s/{DEPLOYMENT_ID}/exec"
   ```
3. Start the development server:
   ```bash
   npm run dev
   ```
4. The React application will now send live authentication, campaign, and verification requests to your Google Apps Script backend and record all transactions directly in Google Sheets!
