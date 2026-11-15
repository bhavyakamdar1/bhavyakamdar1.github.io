/**
 * Life Log <-> Google Sheet bridge. Paste into Extensions > Apps Script of the spreadsheet
 * (see backend/LIFE-SETUP.md). The sheet stays private to your Google account; this script is the only way
 * the /life/ page reads or writes it, and it refuses every request that does not carry TOKEN.
 *
 * The page sends the column layout with each request, so the script needs no change when the layout does.
 * Columns are matched by their header text, so you can reorder columns or add your own (formulas, notes)
 * in the sheet: the script only touches the columns the page knows about.
 */
var TOKEN = 'CHANGE-ME-to-a-long-random-string';

function doGet() { return out({ ok: true, msg: 'Life Log bridge is running.' }); }

function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var req = JSON.parse(e.postData.contents);
    if (!req.token || req.token !== TOKEN) return out({ ok: false, error: 'bad token' });
    var ss = SpreadsheetApp.getActiveSpreadsheet(), schema = req.schema || {};
    if (req.action === 'pull') return out({ ok: true, data: pull(ss, schema), settings: pullSettings(ss) });
    if (req.action === 'push') {
      push(ss, schema, req.data || {});
      if (req.settings) pushSettings(ss, req.settings);
      return out({ ok: true });
    }
    return out({ ok: false, error: 'unknown action' });
  } catch (err) {
    return out({ ok: false, error: String(err) });
  } finally { lock.releaseLock(); }
}

function out(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }

function norm(h) { return String(h).toLowerCase().replace(/\s+/g, ' ').trim(); }

function pull(ss, schema) {
  var tz = ss.getSpreadsheetTimeZone(), res = {};
  Object.keys(schema).forEach(function (key) {
    var spec = schema[key], sh = ss.getSheetByName(spec.sheet);
    res[key] = [];
    if (!sh || sh.getLastRow() < 2) return;
    var vals = sh.getDataRange().getValues(), head = vals.shift().map(norm), idx = [];
    spec.cols.forEach(function (c) { idx.push([c[0], head.indexOf(norm(c[1]))]); });
    vals.forEach(function (row) {
      var o = {}, any = false;
      idx.forEach(function (p) {
        if (p[1] < 0) { o[p[0]] = ''; return; }
        var v = row[p[1]];
        if (v instanceof Date) v = Utilities.formatDate(v, tz, 'yyyy-MM-dd');
        o[p[0]] = v;
        if (p[0] !== 'id' && v !== '' && v !== null) any = true;     // blank row (e.g. only helper formulas) is ignored
      });
      if (any) res[key].push(o);
    });
  });
  return res;
}

function push(ss, schema, data) {
  Object.keys(schema).forEach(function (key) {
    var spec = schema[key], rows = data[key] || [];
    var sh = ss.getSheetByName(spec.sheet) || ss.insertSheet(spec.sheet);
    if (sh.getLastColumn() === 0) { sh.getRange(1, 1, 1, 1).setValue(spec.cols[0][1]); }
    var head = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0].map(norm);
    spec.cols.forEach(function (c) {                       // add any missing header at the right-hand end
      if (c[2] === 'readonly') return;                      // columns the page only reads (carried over from an earlier layout)
      if (head.indexOf(norm(c[1])) < 0) {
        var col = sh.getLastColumn() + 1;
        sh.getRange(1, col).setValue(c[1]).setFontWeight('bold');
        head.push(norm(c[1]));
      }
    });
    sh.setFrozenRows(1);
    var last = Math.max(sh.getLastRow(), 2);
    spec.cols.forEach(function (c) {                       // rewrite only our columns; leave yours untouched
      if (c[2] === 'readonly') return;
      var col = head.indexOf(norm(c[1])) + 1;
      sh.getRange(2, col, last - 1, 1).clearContent();
      if (!rows.length) return;
      var values = rows.map(function (r) { var v = r[c[0]]; return [v === undefined || v === null ? '' : v]; });
      sh.getRange(2, col, values.length, 1).setValues(values);
    });
  });
}

function pullSettings(ss) {
  var sh = ss.getSheetByName('Settings'), o = {};
  if (!sh || sh.getLastRow() < 1) return o;
  var tz = ss.getSpreadsheetTimeZone();
  sh.getDataRange().getValues().forEach(function (r) {
    if (!r[0]) return;
    o[String(r[0])] = r[1] instanceof Date ? Utilities.formatDate(r[1], tz, 'yyyy-MM-dd') : r[1];
  });
  return o;
}

function pushSettings(ss, s) {
  var sh = ss.getSheetByName('Settings') || ss.insertSheet('Settings');
  sh.clearContents();
  var rows = Object.keys(s).map(function (k) { return [k, s[k]]; });
  if (rows.length) sh.getRange(1, 1, rows.length, 2).setValues(rows);
}
