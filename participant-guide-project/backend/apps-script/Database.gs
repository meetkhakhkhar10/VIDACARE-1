/**
 * Database.gs - Spreadsheet Initialization and Sheet Schema Provisioning
 */

/**
 * Returns the open Spreadsheet instance
 * @return {Spreadsheet}
 */
function getSpreadsheet() {
  var id = CONFIG.SPREADSHEET_ID;
  if (id) {
    return SpreadsheetApp.openById(id);
  }
  return SpreadsheetApp.getActiveSpreadsheet();
}

/**
 * Automatically initializes all required database sheets with their exact headers.
 * Safe to call repeatedly; will not overwrite existing rows.
 */
function initDatabase() {
  var ss = getSpreadsheet();
  var sheetNames = Object.keys(CONFIG.HEADERS);
  var created = [];

  sheetNames.forEach(function(sheetName) {
    var sheet = ss.getSheetByName(sheetName);
    var expectedHeaders = CONFIG.HEADERS[sheetName];

    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
      sheet.appendRow(expectedHeaders);
      formatHeaderRow(sheet, expectedHeaders.length);
      created.push(sheetName);
    } else {
      // Check if header row exists
      if (sheet.getLastRow() === 0) {
        sheet.appendRow(expectedHeaders);
        formatHeaderRow(sheet, expectedHeaders.length);
        created.push(sheetName + ' (headers seeded)');
      }
    }
  });

  // Seed default admin account if Admins table has no records
  var adminsSheet = ss.getSheetByName(CONFIG.SHEETS.ADMINS);
  if (adminsSheet && adminsSheet.getLastRow() <= 1) {
    seedDefaultAdmin(adminsSheet);
    created.push('Admins default record seeded');
  }

  // Remove default 'Sheet1' if it is empty and other sheets exist
  var defaultSheet = ss.getSheetByName('Sheet1');
  if (defaultSheet && ss.getSheets().length > 1 && defaultSheet.getLastRow() === 0) {
    try {
      ss.deleteSheet(defaultSheet);
    } catch (e) {
      // Ignore if cannot delete
    }
  }

  return {
    success: true,
    message: 'Database initialized successfully',
    sheetsProvisioned: created
  };
}

/**
 * Formats table header row with VidaCare brand styling
 */
function formatHeaderRow(sheet, numCols) {
  var headerRange = sheet.getRange(1, 1, 1, numCols);
  headerRange.setFontWeight('bold');
  headerRange.setBackground('#123C35'); // VidaCare Deep Forest Green
  headerRange.setFontColor('#FFFFFF');
  headerRange.setHorizontalAlignment('center');
  sheet.setFrozenRows(1);
  for (var i = 1; i <= numCols; i++) {
    sheet.autoResizeColumn(i);
  }
}

/**
 * Seeds initial demo administrator account
 */
function seedDefaultAdmin(adminsSheet) {
  var salt = Utilities.getUuid();
  var defaultPassword = 'VidaAdmin@2026';
  var hash = hashPassword(defaultPassword, salt);
  var createdAt = new Date().toISOString();

  adminsSheet.appendRow([
    'adm-001',
    'admin@vidacare.org',
    hash,
    salt,
    'Admin',
    'Active',
    createdAt
  ]);
}
