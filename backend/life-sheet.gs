/**
 * Life Log <-> Google Sheet bridge. Paste into Extensions > Apps Script of the spreadsheet
 * (see backend/LIFE-SETUP.md). The sheet stays private to your Google account; this script is
 * the only way the /life/ page reads or writes it, and it refuses any request without TOKEN.
 */
var TOKEN = 'CHANGE-ME-to-a-long-random-string';

var TABS = {
  movies:    ['id', 'title', 'date', 'rating', 'genre', 'where', 'with', 'notes'],
  food:      ['id', 'date', 'meal', 'item', 'place', 'cost', 'rating', 'with', 'notes'],
  social:    ['id', 'date', 'friend', 'activity', 'place', 'spent', 'notes'],
  reminders: ['id', 'text', 'date', 'done']
};
var TAB_NAME = { movies: 'Movies', food: 'Food', social: 'Social', reminders: 'Reminders' };

function doGet() { return out({ ok: true, msg: 'Life Log bridge is running.' }); }

function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var req = JSON.parse(e.postData.contents);
    if (!req.token || req.token !== TOKEN) return out({ ok: false, error: 'bad token' });
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    if (req.action === 'pull') return out({ ok: true, data: pull(ss) });
    if (req.action === 'push') { push(ss, req.data || {}); return out({ ok: true }); }
    return out({ ok: false, error: 'unknown action' });
  } catch (err) {
    return out({ ok: false, error: String(err) });
  } finally { lock.releaseLock(); }
}

function out(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }

function sheetFor(ss, key) {
  var sh = ss.getSheetByName(TAB_NAME[key]) || ss.insertSheet(TAB_NAME[key]);
  if (sh.getLastRow() === 0) { sh.getRange(1, 1, 1, TABS[key].length).setValues([TABS[key]]).setFontWeight('bold'); sh.setFrozenRows(1); }
  return sh;
}

function pull(ss) {
  var tz = ss.getSpreadsheetTimeZone(), res = {};
  Object.keys(TABS).forEach(function (key) {
    var sh = sheetFor(ss, key), vals = sh.getDataRange().getValues(), head = vals.shift().map(String);
    res[key] = vals.filter(function (r) { return r.some(function (c) { return c !== ''; }); }).map(function (r) {
      var o = {};
      head.forEach(function (h, i) {
        var v = r[i];
        if (v instanceof Date) v = Utilities.formatDate(v, tz, 'yyyy-MM-dd');
        o[h] = v;
      });
      return o;
    });
  });
  return res;
}

function push(ss, data) {
  Object.keys(TABS).forEach(function (key) {
    var cols = TABS[key], rows = data[key] || [], sh = sheetFor(ss, key);
    // Keep any extra columns you added by hand to the right: only our columns are rewritten.
    if (sh.getLastRow() > 1) sh.getRange(2, 1, sh.getLastRow() - 1, cols.length).clearContent();
    sh.getRange(1, 1, 1, cols.length).setValues([cols]).setFontWeight('bold');
    if (!rows.length) return;
    var values = rows.map(function (r) { return cols.map(function (c) { return r[c] == null ? '' : r[c]; }); });
    sh.getRange(2, 1, values.length, cols.length).setValues(values);
  });
}
