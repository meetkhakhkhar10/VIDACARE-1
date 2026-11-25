/**
 * SheetsService.gs - Generic Spreadsheet CRUD Engine with Script Locking
 */

var SheetsService = {
  /**
   * Retrieves all rows from a sheet as an array of structured objects
   */
  getAll: function(sheetName) {
    var ss = getSpreadsheet();
    var sheet = ss.getSheetByName(sheetName);
    if (!sheet) return [];

    var lastRow = sheet.getLastRow();
    var lastCol = sheet.getLastColumn();
    if (lastRow <= 1 || lastCol === 0) return [];

    var values = sheet.getRange(1, 1, lastRow, lastCol).getValues();
    var headers = values[0];
    var results = [];

    for (var r = 1; r < values.length; r++) {
      var row = values[r];
      var item = { _rowIndex: r + 1 };
      for (var c = 0; c < headers.length; c++) {
        var key = String(headers[c]).trim();
        item[key] = row[c];
      }
      results.push(item);
    }

    return results;
  },

  /**
   * Finds a single row matching predicate
   */
  findOne: function(sheetName, idColumn, idValue) {
    var rows = this.getAll(sheetName);
    for (var i = 0; i < rows.length; i++) {
      if (String(rows[i][idColumn]).trim() === String(idValue).trim()) {
        return rows[i];
      }
    }
    return null;
  },

  /**
   * Appends an object as a new row in the target sheet
   */
  insert: function(sheetName, recordObj) {
    var lock = LockService.getScriptLock();
    lock.waitLock(10000);

    try {
      var ss = getSpreadsheet();
      var sheet = ss.getSheetByName(sheetName);
      if (!sheet) {
        throw new Error('Sheet not found: ' + sheetName);
      }

      var lastCol = sheet.getLastColumn();
      if (lastCol === 0) {
        throw new Error('Sheet has no header row: ' + sheetName);
      }

      var headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
      var rowArray = [];

      for (var c = 0; c < headers.length; c++) {
        var key = String(headers[c]).trim();
        var val = recordObj[key];
        rowArray.push(val !== undefined && val !== null ? val : '');
      }

      sheet.appendRow(rowArray);
      return recordObj;
    } finally {
      lock.releaseLock();
    }
  },

  /**
   * Updates an existing row identified by its ID column
   */
  update: function(sheetName, idColumn, idValue, updatesObj) {
    var lock = LockService.getScriptLock();
    lock.waitLock(10000);

    try {
      var ss = getSpreadsheet();
      var sheet = ss.getSheetByName(sheetName);
      if (!sheet) return false;

      var lastRow = sheet.getLastRow();
      var lastCol = sheet.getLastColumn();
      if (lastRow <= 1) return false;

      var values = sheet.getRange(1, 1, lastRow, lastCol).getValues();
      var headers = values[0];
      var idColIndex = -1;

      for (var c = 0; c < headers.length; c++) {
        if (String(headers[c]).trim() === idColumn) {
          idColIndex = c;
          break;
        }
      }

      if (idColIndex === -1) return false;

      for (var r = 1; r < values.length; r++) {
        if (String(values[r][idColIndex]).trim() === String(idValue).trim()) {
          var targetRow = r + 1;
          for (var col = 0; col < headers.length; col++) {
            var key = String(headers[col]).trim();
            if (updatesObj[key] !== undefined) {
              sheet.getRange(targetRow, col + 1).setValue(updatesObj[key]);
            }
          }
          return true;
        }
      }

      return false;
    } finally {
      lock.releaseLock();
    }
  },

  /**
   * Deletes a row matching idColumn === idValue
   */
  deleteRow: function(sheetName, idColumn, idValue) {
    var lock = LockService.getScriptLock();
    lock.waitLock(10000);

    try {
      var ss = getSpreadsheet();
      var sheet = ss.getSheetByName(sheetName);
      if (!sheet) return false;

      var lastRow = sheet.getLastRow();
      var lastCol = sheet.getLastColumn();
      if (lastRow <= 1) return false;

      var values = sheet.getRange(1, 1, lastRow, lastCol).getValues();
      var headers = values[0];
      var idColIndex = -1;

      for (var c = 0; c < headers.length; c++) {
        if (String(headers[c]).trim() === idColumn) {
          idColIndex = c;
          break;
        }
      }

      if (idColIndex === -1) return false;

      for (var r = 1; r < values.length; r++) {
        if (String(values[r][idColIndex]).trim() === String(idValue).trim()) {
          sheet.deleteRow(r + 1);
          return true;
        }
      }

      return false;
    } finally {
      lock.releaseLock();
    }
  }
};
