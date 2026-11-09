// Paste this into Extensions > Apps Script of your Google Sheet. See SETUP.md.
var HEADERS = ['time', 'player_id', 'session_id', 'name', 'event', 'round', 'detail', 'screen', 'page'];

function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    var d = JSON.parse(e.postData.contents);
    var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Events') ||
             SpreadsheetApp.getActiveSpreadsheet().insertSheet('Events');
    if (sh.getLastRow() === 0) { sh.appendRow(HEADERS); sh.setFrozenRows(1); }
    var data = d.data || {};
    sh.appendRow([
      d.t, d.pid, d.sid, String(d.name || '').slice(0, 24), d.event,
      data.round || '', JSON.stringify(data), d.w + 'x' + d.h, d.page
    ].map(function (v) {            // stop a typed name like =HYPERLINK(...) running as a formula
      return typeof v === 'string' && /^[=+\-@]/.test(v) ? "'" + v : v;
    }));
  } catch (err) {
    // ignore malformed requests
  } finally {
    lock.releaseLock();
  }
  return ContentService.createTextOutput('ok');
}
