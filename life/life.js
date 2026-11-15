// Life Log: a private, password-gated tracker. The page's code is public; the data never is.
// Data is encrypted in this browser (AES-GCM, key from PBKDF2) and mirrored to a private Google Sheet
// through an Apps Script bridge (backend/life-sheet.gs, same idea as the game data in backend/SETUP.md).
(function () {
  'use strict';

  var STORE = 'lifelog_vault_v1';
  var ITER = 250000;
  var IDLE_MS = 10 * 60 * 1000;
  var CFG = window.SITE_CONFIG || {};
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var enc = new TextEncoder(), dec = new TextDecoder();

  // ---------- helpers ----------
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function uid() { return Math.random().toString(36).slice(2, 10) + Date.now().toString(36); }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function ymd(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function today() { return ymd(new Date()); }
  function parseD(s) { var p = String(s).split('-'); return new Date(+p[0], +p[1] - 1, +p[2]); }
  function addDays(s, n) { var d = parseD(s); d.setDate(d.getDate() + n); return ymd(d); }
  function daysBetween(a, b) { return Math.round((parseD(b) - parseD(a)) / 864e5); }
  function daysAgo(s) { return daysBetween(s, today()); }
  var MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  function fmtD(s) { if (!s) return ''; var d = parseD(s); return d.getDate() + ' ' + MON[d.getMonth()] + ' ' + d.getFullYear(); }
  function num(v) { var n = parseFloat(String(v == null ? '' : v).replace(/[^0-9.\-]/g, '')); return isNaN(n) ? 0 : n; }
  function numOrBlank(v) { return v === '' || v == null || isNaN(parseFloat(String(v).replace(/[^0-9.\-]/g, ''))) ? '' : num(v); }
  function round2(n) { return Math.round(n * 100) / 100; }
  function money(n) { return (db.settings.currency || '₹') + Math.round(n).toLocaleString('en-IN'); }
  function amt(n) { n = round2(n); return (db.settings.currency || '₹') + (n % 1 ? n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : n.toLocaleString('en-IN')); }
  function mkey(s) { return String(s || '').slice(0, 7); }
  function mlabel(k) { return MON[+k.slice(5) - 1]; }
  function lastMonths(n) { var out = [], d = new Date(); for (var i = n - 1; i >= 0; i--) { var x = new Date(d.getFullYear(), d.getMonth() - i, 1); out.push(x.getFullYear() + '-' + pad(x.getMonth() + 1)); } return out; }
  function b64e(buf) { var b = new Uint8Array(buf), s = ''; for (var i = 0; i < b.length; i++) s += String.fromCharCode(b[i]); return btoa(s); }
  function b64d(s) { var r = atob(s), b = new Uint8Array(r.length); for (var i = 0; i < r.length; i++) b[i] = r.charCodeAt(i); return b; }
  function uniq(a) { var s = {}; a.forEach(function (x) { if (x) s[x] = 1; }); return Object.keys(s).sort(); }
  function tally(rows, keyFn, valFn) {
    var m = {}; rows.forEach(function (r) { var k = keyFn(r); if (!k) return; m[k] = m[k] || { k: k, n: 0, v: 0 }; m[k].n++; m[k].v += valFn ? valFn(r) : 0; });
    return Object.keys(m).map(function (k) { return m[k]; });
  }

  // ---------- structure (matches Planning_restructured.xlsx) ----------
  var TAX = {
    'Action & Adventure': ['Action', 'Spy', 'Survival'],
    'Biography & History': ['Biopic', 'Historical Epic', 'War'],
    'Comedy': ['Teen', 'Dark', 'Stoner', 'Adventure'],
    'Drama': ['Psychological', 'Comedy-Drama', 'Romantic', 'Inspirational', 'Legal', 'Sports'],
    'Horror': ['Supernatural', 'Psychological', 'Horror Comedy'],
    'Music & Documentary': ['Concert Film'],
    'Romance': ['Romantic Comedy', 'Romantic Drama', 'Fantasy Romance', 'Teen Romance'],
    'Sci-Fi': ['Monster', 'Space', 'Time Travel', 'Epic', 'Satire', 'Thriller'],
    'Superhero': ['Action', 'Dark Satire', 'Animated', 'Cosmic & Magic', 'Horror'],
    'Thriller & Mystery': ['Psychological Thriller', 'Crime Thriller', 'Mystery']
  };
  var FOOD_TYPES = ['Pizza & Pasta', 'Burgers & Sandwiches', 'South Indian', 'Street Food & Snacks', 'Meals', 'Bakery & Waffles', 'Desserts & Ice Cream', 'Coffee & Drinks', 'Other'];
  var FT_KEYS = [
    ['Pizza & Pasta', ['pizza', 'pasta', 'lasagna', 'fondue', 'neopolitan', 'calsoft', 'bussheeto']],
    ['Burgers & Sandwiches', ['burger', 'sandwich', 'subs', 'wrap', 'panini', 'frankie', 'bagel']],
    ['South Indian', ['dosa']],
    ['Street Food & Snacks', ['kachori', 'samosa', 'sev puri', 'pani puri', 'chat', 'dabeli', 'fafda', 'pav bhaji', 'misal', 'vada', 'locho', 'dal pakwan', 'papdi', 'tikka pav', 'chole', 'chur chur', 'falafal', 'falafel', 'popcorn', 'cheese ball', 'bao', 'nachos']],
    ['Meals', ['main course', 'thali', 'sabji', 'rice', 'bowl', 'full course', 'unlimited', 'salad', 'roti', 'paneer', 'starter', 'soup']],
    ['Bakery & Waffles', ['waffle', 'croffle', 'croissant', 'crosiaant', 'donut', 'cheese bread', 'muska', 'cupcake', 'cookie']],
    ['Desserts & Ice Cream', ['ice-cream', 'icecream', 'ice cream', 'desert', 'dessert', 'fudge', 'cake', 'brownie', 'softie', 'golo', 'coconut']],
    ['Coffee & Drinks', ['coffee', 'lassi', 'drinks', 'shake', 'hot chocolate', 'frapp', 'shrappe', 'soda', 'cold coco']]
  ];
  function guessFoodType(c) { c = String(c || '').toLowerCase(); for (var i = 0; i < FT_KEYS.length; i++) if (FT_KEYS[i][1].some(function (k) { return c.indexOf(k) >= 0; })) return FT_KEYS[i][0]; return 'Other'; }

  // k = key in the app, h = header in the Google Sheet / Excel, t = type (n number, date), o = dropdown options
  var F = {
    movies: [
      { k: 'date', h: 'Date', t: 'date' }, { k: 'name', h: 'Name', req: 1 },
      { k: 'type', h: 'Type', o: ['Movie', 'Series'] }, { k: 'language', h: 'Language', dl: 1 },
      { k: 'year', h: 'Release Year', t: 'n', step: '1' }, { k: 'imdb', h: 'IMDb', t: 'n', step: '0.1' },
      { k: 'genre', h: 'Genre', o: Object.keys(TAX) }, { k: 'subgenre', h: 'Sub-Genre', dep: 1 },
      { k: 'franchise', h: 'Franchise', dl: 1 }, { k: 'watch', h: 'Watch', o: ['First time', 'Repeat'] },
      { k: 'where', h: 'Where', o: ['Home', 'Theatre'] }, { k: 'verdict', h: 'Verdict', o: ['Yes', 'Okay', 'No'] },
      { k: 'premium', h: 'Premium Format', o: ['IMAX', '4DX'] }, { k: 'tier', h: 'Tier', o: ['Level A', 'Level B', 'Level C'] },
      { k: 'visitId', h: 'Visit ID', visit: 1 }, { k: 'notes', h: 'Review Note', wide: 1 }
    ],
    food: [
      { k: 'date', h: 'Date', t: 'date' }, { k: 'amount', h: 'Amount (Final)', t: 'n', step: '0.01' },
      { k: 'foodType', h: 'Food Type', o: FOOD_TYPES }, { k: 'category', h: 'Category', dl: 1, req: 1 },
      { k: 'subcategory', h: 'Sub-Category' }, { k: 'place', h: 'Place', dl: 1 }, { k: 'occasion', h: 'Occasion / With' }
    ],
    social: [
      { k: 'name', h: 'Name', req: 1 }, { k: 'group', h: 'Group', dl: 1 },
      { k: 'every', h: 'Meet every (days)', t: 'n', step: '1' }, { k: 'last', h: 'Last met', t: 'date' }, { k: 'notes', h: 'Note' }
    ],
    visits: [
      { k: 'date', h: 'Date', t: 'date', req: 1 }, { k: 'place', h: 'Place', dl: 1, req: 1 }, 
      { k: 'type', h: 'Visit Type', o: ['Outing', 'Meal out', 'Movie', 'At home', 'Trip', 'Other'] }, { k: 'notes', h: 'Notes', wide: 1 }
    ],
    payments: [
      { k: 'date', h: 'Date' }, { k: 'payee', h: 'Payee' }, { k: 'total', h: 'Total Spend', t: 'n' }, { k: 'for', h: 'For' }, { k: 'linkBy', h: 'Linked By' },
      { k: 'movieId', h: 'Movie ID' }, { k: 'foodId', h: 'Food ID' }, { k: 'visitId', h: 'Visit ID' }, { k: 'notes', h: 'Notes' }
    ],
  };
  // extra columns kept in the sheet but not edited by hand
  var X = {
    food: [{ k: 'source', h: 'Amount Source' }, { k: 'basis', h: 'Estimate Basis' }, { k: 'confidence', h: 'Confidence' }, { k: 'splitBasis', h: 'Split Basis' },
      { k: 'entryId', h: 'Entry ID' }, { k: 'entryTotal', h: 'Entry Total (Final)', t: 'n' }, { k: 'items', h: 'Items in Entry', t: 'n' }, { k: 'visitId', h: 'Visit ID' }],
    visits: [{ k: 'people', h: 'People' }],
    payments: [{ k: 'legacyType', h: 'Linked Type', ro: 1 }, { k: 'legacyId', h: 'Linked ID', ro: 1 }]   // read once to carry an earlier layout over, never written
  };
  var CATS = { movies: 'Movies', food: 'Food', social: 'Social', visits: 'Visits', payments: 'Payments' };
  var SYNCED = ['movies', 'food', 'social', 'visits', 'payments'];

  var db = null, key = null, salt = null, tab = 'dash', editing = {}, search = {}, showAll = {}, askLog = '', ui = { visitSel: '', visitForm: '', payMsg: '' };

  function blank() {
    return { v: 2, movies: [], food: [], social: [], reminders: [], visits: [], payments: [],
      settings: { currency: '₹', foodBudget: 0, quietDays: 4, remindersStart: '', sync: { url: '', token: '' } }, meta: { dirty: false } };
  }
  function normalize(d) {
    var b = blank();
    if (!d.v || d.v < 2) { d.movies = []; d.food = []; d.social = []; d.v = 2; }   // older test layout: reloaded from the sheet
    ['movies', 'food', 'social', 'reminders', 'visits', 'payments'].forEach(function (k) { d[k] = d[k] || []; });   // additive: older vaults just gain empty lists
    d.payments.forEach(migratePayment);
    d.settings = Object.assign(b.settings, d.settings || {}); d.settings.sync = Object.assign(b.settings.sync, d.settings.sync || {});
    d.meta = Object.assign(b.meta, d.meta || {});
    return d;
  }

  // ---------- crypto / vault ----------
  async function derive(pw, s) {
    var base = await crypto.subtle.importKey('raw', enc.encode(pw), 'PBKDF2', false, ['deriveKey']);
    return crypto.subtle.deriveKey({ name: 'PBKDF2', salt: s, iterations: ITER, hash: 'SHA-256' }, base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
  }
  async function seal() {
    var iv = crypto.getRandomValues(new Uint8Array(12));
    var ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv: iv }, key, enc.encode(JSON.stringify(db)));
    return { v: 1, s: b64e(salt), i: b64e(iv), d: b64e(ct) };
  }
  async function open(blob, k) {
    var pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: b64d(blob.i) }, k, b64d(blob.d));
    return JSON.parse(dec.decode(pt));
  }
  async function persist() { localStorage.setItem(STORE, JSON.stringify(await seal())); }
  async function save() { db.meta.dirty = true; await persist(); queuePush(); }
  function readBlob() { try { return JSON.parse(localStorage.getItem(STORE)); } catch (e) { return null; } }

  // ---------- Google Sheet sync (Apps Script bridge) ----------
  var pushT, syncMsg = '';
  function syncCfg() {
    var url = (db && db.settings.sync.url) || CFG.LIFE_ENDPOINT || '', token = db && db.settings.sync.token;
    return url && token ? { url: url, token: token } : null;
  }
  function schema() {
    var s = {};
    SYNCED.forEach(function (c) {
      s[c] = { sheet: CATS[c], cols: [['id', 'ID']].concat(F[c].map(function (f) { return [f.k, f.h]; }), (X[c] || []).map(function (f) { return f.ro ? [f.k, f.h, 'readonly'] : [f.k, f.h]; })) };
    });
    s.reminders = { sheet: 'Reminders', cols: [['id', 'ID'], ['text', 'Reminder'], ['date', 'Date'], ['done', 'Done']] };
    return s;
  }
  function setStatus(m) { syncMsg = m; var el = $('#sync-status'); if (el) el.textContent = m; var chip = $('#sync-chip'); if (chip) chip.textContent = syncCfg() ? m : ''; }
  async function call(action, extra) {
    var c = syncCfg();
    var body = Object.assign({ token: c.token, action: action, schema: schema() }, extra || {});
    var r = await fetch(c.url, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(body) });
    var j = await r.json(); if (!j.ok) throw new Error(j.error || 'sync failed'); return j;
  }
  function withDerived() {
    var tot = {}, cnt = {};
    db.food.forEach(function (r) { var e = r.entryId || r.id; tot[e] = (tot[e] || 0) + num(r.amount); cnt[e] = (cnt[e] || 0) + 1; });
    return db.food.map(function (r) { var e = r.entryId || r.id; return Object.assign({}, r, { entryId: r.entryId || r.id, entryTotal: round2(tot[e]), items: cnt[e] }); });
  }
  function queuePush() { if (!syncCfg()) return; clearTimeout(pushT); setStatus('Saving to sheet…'); pushT = setTimeout(pushNow, 1200); }
  async function pushNow() {
    try {
      var data = { movies: db.movies, food: withDerived(), social: db.social, reminders: db.reminders, visits: db.visits, payments: db.payments };
      var s = db.settings; await call('push', { data: data, settings: { currency: s.currency, foodBudget: s.foodBudget, quietDays: s.quietDays, remindersStart: s.remindersStart } });
      db.meta.dirty = false; await persist(); setStatus('Synced ' + new Date().toLocaleTimeString());
    } catch (e) { setStatus('Sheet sync failed (saved on this device, will retry): ' + e.message); }
  }
  function typed(c, r) {
    var o = {}; F[c].concat(X[c] || []).forEach(function (f) { var v = r[f.k]; o[f.k] = f.t === 'n' ? numOrBlank(v) : (v == null ? '' : String(v).trim()); });
    o.id = String(r.id || '') || uid(); return o;
  }
  function adopt(remote) {
    SYNCED.forEach(function (c) { db[c] = (remote[c] || []).map(function (r) { return typed(c, r); }); });
    db.food.forEach(function (r) { if (!r.entryId) r.entryId = r.id; });
    db.payments.forEach(migratePayment);
    db.reminders = (remote.reminders || []).map(function (r) { return { id: String(r.id || '') || uid(), text: String(r.text || ''), date: String(r.date || ''), done: r.done === true || String(r.done).toLowerCase() === 'true' }; });
  }
  function count(o) { return SYNCED.reduce(function (a, k) { return a + (o[k] || []).length; }, 0); }
  async function pullNow(first) {
    try {
      if (db.meta.dirty && !first) { setStatus('Sending unsent changes…'); await pushNow(); return true; }
      setStatus('Loading from sheet…'); var j = await call('pull'), remote = j.data;
      if (first && count(remote) === 0) { await pushNow(); return true; }
      if (first && count(db) > 0 && count(remote) > 0 && !confirm('The sheet has ' + count(remote) + ' entries and this browser has ' + count(db) + '.\n\nOK = use the sheet (replaces this browser’s copy)\nCancel = overwrite the sheet with this browser’s data')) { await pushNow(); return true; }
      adopt(remote);
      var st = j.settings || {}; ['currency', 'remindersStart'].forEach(function (k) { if (st[k] != null && st[k] !== '') db.settings[k] = String(st[k]); });
      ['foodBudget', 'quietDays'].forEach(function (k) { if (st[k] !== undefined && st[k] !== '') db.settings[k] = num(st[k]); });
      db.meta.dirty = false; await persist(); setStatus('Synced ' + new Date().toLocaleTimeString()); return true;
    } catch (e) { setStatus('Sheet unreachable, using this device’s copy: ' + e.message); return false; }
  }

  // ---------- lock screen ----------
  var blob = readBlob();
  function initLock() {
    var first = !blob;
    $('#lock-sub').textContent = first ? 'First time here. Choose a password to create your private vault.' : 'Enter your password.';
    $('#lock-btn').textContent = first ? 'Create vault' : 'Unlock';
    $('#pw2').hidden = !first; $('#pw2').required = first;
    $('#pw').autocomplete = first ? 'new-password' : 'current-password';
    $('#lock-note').textContent = first ? 'There is no reset: if the password is lost, the data in this browser cannot be recovered (your Google Sheet and backups still hold it). Use Data → Backup regularly.' : '';
  }
  $('#lock-form').addEventListener('submit', async function (e) {
    e.preventDefault();
    var pw = $('#pw').value, err = $('#lock-err'), btn = $('#lock-btn');
    err.textContent = '';
    try {
      btn.disabled = true;
      if (!blob) {
        if (pw.length < 8) { err.textContent = 'Use at least 8 characters.'; return; }
        if (pw !== $('#pw2').value) { err.textContent = 'Passwords do not match.'; return; }
        salt = crypto.getRandomValues(new Uint8Array(16));
        key = await derive(pw, salt); db = blank(); await persist(); blob = readBlob();
      } else {
        salt = b64d(blob.s); key = await derive(pw, salt);
        try { db = normalize(await open(blob, key)); } catch (x) {
          key = null; await new Promise(function (r) { setTimeout(r, 1200); });
          err.textContent = 'Wrong password.'; return;
        }
      }
      $('#pw').value = ''; $('#pw2').value = '';
      startApp();
    } catch (x) { err.textContent = 'Could not unlock: ' + x.message; }
    finally { btn.disabled = false; }
  });

  var idleT;
  function bumpIdle() { clearTimeout(idleT); if (db) idleT = setTimeout(lockNow, IDLE_MS); }
  function lockNow() { location.reload(); }
  ['click', 'keydown', 'touchstart'].forEach(function (ev) { document.addEventListener(ev, bumpIdle, { passive: true }); });
  $('#lock-now').addEventListener('click', lockNow);

  function startApp() {
    $('#lock').hidden = true; $('#app').hidden = false;
    bumpIdle(); render();
    var go = function () { var rem = computeReminders(); if (rem.length) showReminders(rem); };
    if (syncCfg()) pullNow(false).then(function () { render(); go(); }); else go();
  }
  $('#view').addEventListener('click', function (e) { var c = e.target.closest('[data-visit]'); if (c) goVisit(c.dataset.visit); });
  $('#tabs').addEventListener('click', function (e) {
    var b = e.target.closest('button'); if (!b) return;
    tab = b.dataset.tab; render(); window.scrollTo(0, 0);
  });

  // ---------- rendering ----------
  function render() {
    document.querySelectorAll('#tabs button').forEach(function (b) { b.classList.toggle('on', b.dataset.tab === tab); });
    var v = $('#view');
    if (tab === 'dash') { v.innerHTML = dashHTML(); bindDash(); }
    else if (tab === 'movies') { v.innerHTML = moviesHTML(); bindMovies(); }
    else if (tab === 'food') { v.innerHTML = foodHTML(); bindFood(); }
    else if (tab === 'social') { v.innerHTML = socialHTML(); bindSocial(); }
    else if (tab === 'visits') { v.innerHTML = visitsHTML(); bindVisits(); }
    else if (tab === 'payments') { v.innerHTML = paymentsHTML(); bindPayments(); }
    else if (tab === 'reminders') { v.innerHTML = remindersHTML(); bindReminders(); }
    else if (tab === 'data') { v.innerHTML = dataHTML(); bindData(); }
  }

  // form helpers
  function dlId(c, k) { return 'dl-' + c + '-' + k; }
  function options(list, val) { return '<option value="">-</option>' + list.map(function (o) { return '<option' + (o === val ? ' selected' : '') + '>' + esc(o) + '</option>'; }).join(''); }
  function vocab(c, k) { return uniq(db[c].map(function (r) { return r[k]; })); }
  function fieldHTML(c, f, r) {
    var val = r[f.k] != null && r[f.k] !== '' ? r[f.k] : (f.t === 'date' && !r.id ? today() : '');
    var inp;
    if (f.o) { var list = f.o.slice(); if (val && list.indexOf(val) < 0) list.push(val); inp = '<select name="' + f.k + '">' + options(list, val) + '</select>'; }
    else if (f.visit) inp = '<select name="' + f.k + '">' + visitOptions(val) + '</select>';
    else if (f.dep) { var subs = (TAX[r.genre] || []).slice(); if (val && subs.indexOf(val) < 0) subs.push(val); inp = '<select name="' + f.k + '">' + options(subs, val) + '</select>'; }
    else inp = '<input name="' + f.k + '" type="' + (f.t === 'n' ? 'number' : f.t === 'date' ? 'date' : 'text') + '"' + (f.step ? ' step="' + f.step + '"' : '') + (f.req ? ' required' : '') + (f.dl ? ' list="' + dlId(c, f.k) + '"' : '') + ' value="' + esc(val) + '">';
    return '<label' + (f.wide ? ' class="wide"' : '') + '>' + esc(f.h) + inp + '</label>';
  }
  function datalists(c) { return F[c].filter(function (f) { return f.dl; }).map(function (f) { return '<datalist id="' + dlId(c, f.k) + '">' + vocab(c, f.k).map(function (v) { return '<option value="' + esc(v) + '">'; }).join('') + '</datalist>'; }).join(''); }
  function readForm(c, form, r) {
    var fd = new FormData(form);
    F[c].forEach(function (f) { if (!fd.has(f.k)) return; var v = (fd.get(f.k) || '').toString().trim(); r[f.k] = f.t === 'n' ? numOrBlank(v) : v; });
    return r;
  }
  function searchBox(c) { return '<div class="bar-tools"><input type="search" id="q-' + c + '" placeholder="Search…" value="' + esc(search[c] || '') + '"></div>'; }
  function bindSearch(c) {
    $('#q-' + c).addEventListener('input', function (e) {
      search[c] = e.target.value; var pos = e.target.selectionStart; render();
      var q = $('#q-' + c); q.focus(); q.setSelectionRange(pos, pos);
    });
  }
  function filterRows(c, rows) { var q = (search[c] || '').toLowerCase(); return q ? rows.filter(function (r) { return JSON.stringify(r).toLowerCase().indexOf(q) >= 0; }) : rows; }
  function byDateDesc(rows) { return rows.slice().sort(function (a, b) { return String(b.date || '').localeCompare(String(a.date || '')); }); }

  // ---------- visits: the connecting record (linking parameter = Visit ID) ----------
  function nextId(prefix, arr) { var m = 0; arr.forEach(function (r) { var x = /^([A-Z])-(\d+)$/.exec(r.id || ''); if (x && x[1] === prefix) m = Math.max(m, +x[2]); }); return prefix + '-' + ('0000' + (m + 1)).slice(-4); }
  function visitById(id) { return id ? db.visits.filter(function (v) { return v.id === id; })[0] : null; }
  function visitLabel(v) { return v.id + ' · ' + (v.place || 'visit') + ' · ' + fmtD(v.date); }
  function visitOptions(val) { return '<option value="">No visit</option>' + db.visits.slice().sort(function (a, b) { return String(b.date).localeCompare(String(a.date)); }).map(function (v) { return '<option value="' + esc(v.id) + '"' + (v.id === val ? ' selected' : '') + '>' + esc(visitLabel(v)) + '</option>'; }).join(''); }
  function visitChip(id) { if (!id) return ''; var v = visitById(id); return '<button type="button" class="chip id linkchip" data-visit="' + esc(id) + '" title="' + esc(v ? visitLabel(v) : 'Visit not found') + '">' + esc(id) + (v ? '' : ' ?') + '</button>'; }
  function peopleOf(v) { return String(v.people || '').split(',').map(function (x) { return x.trim(); }).filter(Boolean); }
  function placeNames() { return uniq(db.visits.map(function (v) { return v.place; }).concat(db.food.map(function (r) { return r.place; }))); }   // places are just the Place text on visits and Food
  function lastMet(p) {   // your own "Met today" date, or the latest visit you logged with them, whichever is later
    var best = p.last || '', n = String(p.name).toLowerCase(), t = today();
    db.visits.forEach(function (v) { if (v.date && v.date <= t && v.date > best && peopleOf(v).some(function (x) { return x.toLowerCase() === n; })) best = v.date; });
    return best;
  }
  function goVisit(id) { tab = 'visits'; ui.visitSel = id; render(); window.scrollTo(0, 0); }

  // ----- Movies -----
  function moviesHTML() {
    var ed = editing.movies && db.movies.find(function (r) { return r.id === editing.movies; }) || {};
    var form = '<form id="f-movies" class="form card">' + F.movies.map(function (f) { return fieldHTML('movies', f, ed); }).join('') +
      '<div class="row wide"><button class="btn" type="submit">' + (ed.id ? 'Save changes' : 'Add to Movies') + '</button>' +
      (ed.id ? '<button class="btn alt" type="button" id="cancel-movies">Cancel</button>' : '') + '</div></form>' + datalists('movies');
    var rows = filterRows('movies', byDateDesc(db.movies)), total = rows.length; if (!showAll.movies) rows = rows.slice(0, 150);
    var table = rows.length ? '<div class="tbl card"><table><thead><tr><th>Date</th><th>Name</th><th>Type</th><th>Genre</th><th>Language</th><th>IMDb</th><th>Where</th><th>Verdict</th><th>Visit</th><th></th></tr></thead><tbody>' +
      rows.map(function (r) {
        return '<tr><td class="nw">' + esc(fmtD(r.date)) + '</td><td>' + esc(r.name) + (r.franchise ? ' <span class="muted small">· ' + esc(r.franchise) + '</span>' : '') + '</td><td>' + esc(r.type) + '</td><td>' + esc(r.genre) + (r.subgenre ? '<br><span class="muted small">' + esc(r.subgenre) + '</span>' : '') + '</td><td>' + esc(r.language) + '</td><td class="n">' + esc(r.imdb) + '</td><td>' + esc(r.where) + (r.premium ? ' <span class="badge">' + esc(r.premium) + '</span>' : '') + '</td><td>' + esc(r.verdict) + '</td><td>' + visitChip(r.visitId) + '</td><td class="act"><button class="link" data-edit="' + r.id + '">Edit</button><button class="link del" data-del="' + r.id + '">Delete</button></td></tr>';
      }).join('') + '</tbody></table></div>' + (total > rows.length ? '<p><button class="ghost" id="more-movies">Show all ' + total + '</button></p>' : '')
      : '<p class="empty">Nothing here yet. Add one above or load your workbook from the Data tab.</p>';
    return '<h2 class="h">Movies &amp; Shows <span class="muted small">' + db.movies.length + ' watched</span></h2>' + form + searchBox('movies') + table;
  }
  function bindMovies() {
    var form = $('#f-movies');
    form.elements.genre.addEventListener('change', function () {
      var g = form.elements.genre.value, sel = form.elements.subgenre; sel.innerHTML = options(TAX[g] || [], '');
    });
    form.addEventListener('submit', async function (e) {
      e.preventDefault();
      var r = editing.movies ? db.movies.find(function (x) { return x.id === editing.movies; }) : { id: uid() };
      readForm('movies', form, r); if (!editing.movies) db.movies.push(r);
      editing.movies = null; await save(); render();
    });
    var c = $('#cancel-movies'); if (c) c.onclick = function () { editing.movies = null; render(); };
    var m = $('#more-movies'); if (m) m.onclick = function () { showAll.movies = true; render(); };
    bindSearch('movies');
    $('#view').onclick = async function (e) {
      var ed = e.target.dataset.edit, del = e.target.dataset.del;
      if (ed) { editing.movies = ed; render(); window.scrollTo(0, 0); }
      if (del && confirm('Delete this entry?')) { db.movies = db.movies.filter(function (r) { return r.id !== del; }); await save(); render(); }
    };
  }

  // ----- Food (one row per item; a meal = rows sharing an Entry ID) -----
  function foodHTML() {
    var ed = editing.food && db.food.find(function (r) { return r.id === editing.food; });
    var form;
    if (ed) {
      form = '<form id="f-foodrow" class="form card"><div class="wide muted small">Editing one item of a meal' + (ed.source ? ' (' + esc(ed.source) + ')' : '') + '</div>' + F.food.map(function (f) { return fieldHTML('food', f, ed); }).join('') + '<label>Visit (whole meal)<select name="visitId">' + visitOptions(ed.visitId) + '</select></label>' +
        '<div class="row wide"><button class="btn" type="submit">Save changes</button><button class="btn alt" type="button" id="cancel-food">Cancel</button><button class="btn alt" type="button" id="del-meal">Delete whole meal</button></div></form>';
    } else {
      form = '<form id="f-meal" class="card"><div class="form"><label>Date<input name="date" type="date" value="' + today() + '"></label><label>Place<input name="place" list="' + dlId('food', 'place') + '"></label>' +
        '<label>Occasion / With<input name="occasion"></label><label>Total spent (' + esc(db.settings.currency) + ')<input name="total" type="number" step="0.01" min="0"></label><label>Visit (optional)<select name="visitId">' + visitOptions('') + '</select></label></div>' +
        '<div id="items"></div><div class="row"><button type="button" class="ghost" id="add-item">+ Add another item</button><button class="btn" type="submit">Save meal</button></div>' +
        '<p class="muted small">Add each item on its own line. Leave the item prices blank to split the total equally, or fill them in to record exact prices.</p></form>';
    }
    var rows = filterRows('food', byDateDesc(db.food)), total = rows.length; if (!showAll.food) rows = rows.slice(0, 200);
    var table = rows.length ? '<div class="tbl card"><table><thead><tr><th>Date</th><th>Place</th><th>Category</th><th>Sub-Category</th><th>Type</th><th>Amount</th><th>Occasion</th><th>Visit</th><th></th></tr></thead><tbody>' +
      rows.map(function (r) {
        var flag = /estimated|your note/i.test(r.source || '') ? '<span class="badge est" title="' + esc(r.basis || r.source) + '">est.</span>' : (/split/i.test(r.source || '') ? '<span class="badge" title="' + esc(r.splitBasis || r.source) + '">split</span>' : '');
        return '<tr><td class="nw">' + esc(fmtD(r.date)) + '</td><td>' + esc(r.place) + '</td><td>' + esc(r.category) + '</td><td>' + esc(r.subcategory) + '</td><td>' + esc(r.foodType) + '</td><td class="n">' + (r.amount === '' ? '' : amt(num(r.amount))) + ' ' + flag + '</td><td>' + esc(r.occasion) + '</td><td>' + visitChip(r.visitId) + '</td><td class="act"><button class="link" data-edit="' + r.id + '">Edit</button><button class="link del" data-del="' + r.id + '">Delete</button></td></tr>';
      }).join('') + '</tbody></table></div>' + (total > rows.length ? '<p><button class="ghost" id="more-food">Show all ' + total + '</button></p>' : '')
      : '<p class="empty">Nothing here yet. Add a meal above or load your workbook from the Data tab.</p>';
    return '<h2 class="h">Food <span class="muted small">' + db.food.length + ' items in ' + entryCount() + ' meals</span></h2>' + form + datalists('food') + searchBox('food') + table;
  }
  function entryCount() { var s = {}; db.food.forEach(function (r) { s[r.entryId || r.id] = 1; }); return Object.keys(s).length; }
  function itemRow(c) {
    return '<div class="item"><input name="category" placeholder="Category (e.g. Burger)" list="' + dlId('food', 'category') + '" required><input name="subcategory" placeholder="Sub-category (optional)"><select name="foodType">' + options(FOOD_TYPES, '') + '</select><input name="price" type="number" step="0.01" min="0" placeholder="Price (optional)"><button type="button" class="link del rm">✕</button></div>';
  }
  function bindFood() {
    var meal = $('#f-meal');
    if (meal) {
      var box = $('#items'); box.innerHTML = itemRow();
      $('#add-item').onclick = function () { box.insertAdjacentHTML('beforeend', itemRow()); };
      box.addEventListener('click', function (e) { if (e.target.classList.contains('rm') && box.children.length > 1) e.target.closest('.item').remove(); });
      box.addEventListener('change', function (e) {
        if (e.target.name === 'category') { var sel = e.target.closest('.item').querySelector('[name=foodType]'); if (!sel.value) sel.value = guessFoodType(e.target.value) === 'Other' ? '' : guessFoodType(e.target.value); }
      });
      meal.addEventListener('submit', async function (e) {
        e.preventDefault();
        var fd = new FormData(meal), items = [].map.call(box.querySelectorAll('.item'), function (el) {
          var g = function (n) { return el.querySelector('[name=' + n + ']').value.trim(); };
          return { category: g('category'), subcategory: g('subcategory'), foodType: g('foodType') || guessFoodType(g('category')), price: g('price') };
        }).filter(function (i) { return i.category; });
        if (!items.length) return;
        var total = numOrBlank(fd.get('total')), priced = items.filter(function (i) { return i.price !== ''; }), sumP = priced.reduce(function (a, i) { return a + num(i.price); }, 0);
        if (total === '') total = sumP;
        var blanks = items.filter(function (i) { return i.price === ''; });
        var rest = Math.max(0, total - sumP), each = blanks.length ? round2(rest / blanks.length) : 0, left = round2(rest - each * blanks.length), eid = uid();
        var how = !priced.length ? 'Recorded · split equally' : blanks.length ? 'Recorded · item prices entered, rest split equally' : 'Recorded · item prices entered';
        var last = items.length - 1, bi = 0;
        items.forEach(function (i, idx) {
          var a = i.price !== '' ? num(i.price) : (++bi === blanks.length ? round2(each + left) : each);
          db.food.push({ id: uid(), date: fd.get('date') || today(), amount: a, foodType: i.foodType, category: i.category, subcategory: i.subcategory, place: (fd.get('place') || '').trim(), occasion: (fd.get('occasion') || '').trim(),
            source: items.length > 1 ? how : 'Recorded', basis: '', confidence: '', splitBasis: items.length > 1 && !priced.length ? 'Split equally (no item prices entered)' : '', entryId: eid, entryTotal: '', items: items.length, visitId: fd.get('visitId') || '' });
        });
        await save(); render();
      });
    }
    var row = $('#f-foodrow');
    if (row) {
      row.addEventListener('submit', async function (e) {
        e.preventDefault();
        var r = db.food.find(function (x) { return x.id === editing.food; }), before = r.amount;
        readForm('food', row, r); if (r.amount !== before) { r.source = 'Recorded (edited)'; }
        var vid = new FormData(row).get('visitId') || '';
        db.food.forEach(function (x) { if ((x.entryId || x.id) === (r.entryId || r.id)) x.visitId = vid; });
        editing.food = null; await save(); render();
      });
      $('#cancel-food').onclick = function () { editing.food = null; render(); };
      $('#del-meal').onclick = async function () {
        var r = db.food.find(function (x) { return x.id === editing.food; }), eid = r.entryId || r.id;
        if (confirm('Delete every item of this meal?')) { db.food = db.food.filter(function (x) { return (x.entryId || x.id) !== eid; }); editing.food = null; await save(); render(); }
      };
    }
    var m = $('#more-food'); if (m) m.onclick = function () { showAll.food = true; render(); };
    bindSearch('food');
    $('#view').onclick = async function (e) {
      var ed = e.target.dataset.edit, del = e.target.dataset.del;
      if (ed) { editing.food = ed; render(); window.scrollTo(0, 0); }
      if (del && confirm('Delete this item?')) { db.food = db.food.filter(function (r) { return r.id !== del; }); await save(); render(); }
    };
  }

  // ----- Social -----
  function nextDue(p) {
    var start = db.settings.remindersStart || '';
    var lm = lastMet(p), base = lm ? addDays(lm, num(p.every) || 30) : (start || today());
    return start && base < start ? start : base;
  }
  function dueList() { return db.social.map(function (p) { return { p: p, due: nextDue(p) }; }).filter(function (x) { return x.due <= today(); }).sort(function (a, b) { return a.due.localeCompare(b.due); }); }
  function socialHTML() {
    var ed = editing.social && db.social.find(function (r) { return r.id === editing.social; }) || {};
    var form = '<form id="f-social" class="form card">' + F.social.map(function (f) { return fieldHTML('social', f, ed.id ? ed : { id: 'new', every: 30 }); }).join('') +
      '<div class="row wide"><button class="btn" type="submit">' + (ed.id ? 'Save changes' : 'Add person') + '</button>' + (ed.id ? '<button class="btn alt" type="button" id="cancel-social">Cancel</button>' : '') + '</div></form>' + datalists('social');
    var rows = filterRows('social', db.social.slice().sort(function (a, b) { return nextDue(a).localeCompare(nextDue(b)); }));
    var table = rows.length ? '<div class="tbl card"><table><thead><tr><th>Name</th><th>Group</th><th>Every</th><th>Last met</th><th>Next due</th><th>Status</th><th></th></tr></thead><tbody>' +
      rows.map(function (p) {
        var d = nextDue(p), due = d <= today();
        return '<tr><td>' + esc(p.name) + '</td><td>' + esc(p.group) + '</td><td class="n">' + esc(p.every || 30) + ' d</td><td class="nw">' + esc(fmtD(lastMet(p))) + (lastMet(p) && lastMet(p) !== p.last ? ' <span class="badge" title="From a visit you logged">visit</span>' : '') + '</td><td class="nw">' + esc(fmtD(d)) + '</td><td>' + (due ? '<span class="badge warn">Time to meet</span>' : 'We are cool') + '</td><td class="act"><button class="link" data-met="' + p.id + '">Met today</button><button class="link" data-edit="' + p.id + '">Edit</button><button class="link del" data-del="' + p.id + '">Delete</button></td></tr>';
      }).join('') + '</tbody></table></div>' : '<p class="empty">No people yet. Add one above or load your workbook from the Data tab.</p>';
    return '<h2 class="h">Social <span class="muted small">' + dueList().length + ' due now</span></h2>' + form + searchBox('social') + table;
  }
  function bindSocial() {
    $('#f-social').addEventListener('submit', async function (e) {
      e.preventDefault();
      var r = editing.social ? db.social.find(function (x) { return x.id === editing.social; }) : { id: uid() };
      readForm('social', e.target, r); if (!r.every) r.every = 30; if (!editing.social) db.social.push(r);
      editing.social = null; await save(); render();
    });
    var c = $('#cancel-social'); if (c) c.onclick = function () { editing.social = null; render(); };
    bindSearch('social');
    $('#view').onclick = async function (e) {
      var ed = e.target.dataset.edit, del = e.target.dataset.del, met = e.target.dataset.met;
      if (ed) { editing.social = ed; render(); window.scrollTo(0, 0); }
      if (met) { db.social.find(function (r) { return r.id === met; }).last = today(); await save(); render(); }
      if (del && confirm('Delete this person?')) { db.social = db.social.filter(function (r) { return r.id !== del; }); await save(); render(); }
    };
  }

  // ----- Visits -----
  function foodMealsOf(visitId) { return entries().filter(function (e) { return e.rows.some(function (r) { return r.visitId === visitId; }); }); }
  function mealLabel(e) { return fmtD(e.date) + ' · ' + (e.place || 'meal') + ' · ' + e.rows.map(function (r) { return r.category; }).join(', ') + ' · ' + amt(e.total); }
  function sumBy(arr, fn) { return arr.reduce(function (a, x) { return a + fn(x); }, 0); }
  function visitStats(v) {
    var movies = db.movies.filter(function (m) { return m.visitId === v.id; }), meals = foodMealsOf(v.id), pays = db.payments.filter(function (p) { return p.visitId === v.id; });
    var foodMine = sumBy(meals, function (e) { return e.total; }), extra = sumBy(pays, mineExtra);
    var uncovered = meals.filter(function (e) { return !pays.some(function (p) { return p.linkBy === 'Food' && p.foodId === e.id; }); });
    return { movies: movies, meals: meals, pays: pays, mine: foodMine + extra, total: sumBy(pays, function (p) { return num(p.total); }) + sumBy(uncovered, function (e) { return e.total; }) };
  }
  function visitsHTML() {
    var sel = visitById(ui.visitSel);
    var form = '';
    if (ui.visitForm) {
      var ed = ui.visitForm === 'edit' && sel ? sel : { id: 'new', date: today(), type: 'Outing' };
      form = '<form id="f-visit" class="form card">' + F.visits.map(function (f) { return fieldHTML('visits', f, ed); }).join('') + '<div class="row wide"><button class="btn" type="submit">' + (ui.visitForm === 'edit' ? 'Save changes' : 'Create visit') + '</button><button class="btn alt" type="button" id="cancel-visit">Cancel</button></div></form>' +
        '<datalist id="' + dlId('visits', 'place') + '">' + placeNames().map(function (n) { return '<option value="' + esc(n) + '">'; }).join('') + '</datalist>';
    }
    var rows = filterRows('visits', db.visits.slice().sort(function (a, b) { return String(b.date).localeCompare(String(a.date)) || b.id.localeCompare(a.id); })), lastDay = '', list = '';
    rows.slice(0, 200).forEach(function (v) {
      var st = visitStats(v);
      if (v.date !== lastDay) { list += '<div class="day">' + esc(fmtD(v.date)) + '</div>'; lastDay = v.date; }
      list += '<button class="visit" data-pick="' + esc(v.id) + '" aria-pressed="' + (v.id === ui.visitSel) + '"><b>' + esc(v.place) + '</b><div class="chips"><span class="chip id">' + esc(v.id) + '</span>' +
        st.movies.map(function (m) { return '<span class="chip">Movie · ' + esc(m.name) + '</span>'; }).join('') + st.meals.map(function (e) { return '<span class="chip">Meal · ' + esc(e.place || 'meal') + '</span>'; }).join('') +
        peopleOf(v).map(function (p) { return '<span class="chip">With ' + esc(p) + '</span>'; }).join('') + '<span class="chip">' + (st.mine ? amt(st.mine) + ' mine' : 'no spending') + '</span></div></button>';
    });
    var detail = sel ? visitDetailHTML(sel) : '<p class="empty">Pick a visit on the left, or create one.</p>';
    return '<h2 class="h">Visits <span class="muted small">' + db.visits.length + ' logged</span></h2><div class="row" style="margin-bottom:12px"><button class="btn" id="new-visit">+ New visit</button></div>' + form + searchBox('visits') +
      '<div class="grid2"><div class="card">' + (list || '<p class="empty">No visits yet. A visit ties one outing together: where you went, who with, what you watched, ate and spent.</p>') + '</div><div class="card">' + detail + '</div></div>';
  }
  function visitDetailHTML(v) {
    var st = visitStats(v), ppl = peopleOf(v), warn = [];
    st.pays.forEach(function (p) { payWarnings(p).forEach(function (w) { warn.push(w); }); });
    var freeMovies = db.movies.filter(function (m) { return m.visitId !== v.id; }).sort(function (a, b) { return String(b.date).localeCompare(String(a.date)); });
    var freeMeals = entries().filter(function (e) { return !e.rows.some(function (r) { return r.visitId === v.id; }); }).sort(function (a, b) { return String(b.date).localeCompare(String(a.date)); });
    var freePays = db.payments.filter(function (p) { return !p.visitId; }).sort(function (a, b) { return String(b.date).localeCompare(String(a.date)); });
    var names = uniq(db.social.map(function (r) { return r.name; })).filter(function (n) { return ppl.map(function (x) { return x.toLowerCase(); }).indexOf(n.toLowerCase()) < 0; });
    function pick(attr, label, opts) { return '<select class="pick" data-add="' + attr + '"><option value="">' + label + '</option>' + opts + '</select>'; }
    return '<div style="display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap"><h2>' + esc(v.place) + '</h2><span class="chip id">' + esc(v.id) + '</span></div>' +
      '<p class="muted small" style="margin:2px 0 0">' + esc(fmtD(v.date)) + ' · ' + esc(v.type || 'Outing') + (v.notes ? ' · ' + esc(v.notes) : '') + '</p>' +
      '<div class="btns"><button class="ghost" id="edit-visit">Edit details</button><button class="ghost" id="del-visit">Delete visit</button></div>' +
      '<div class="sec"><h3>People</h3>' + (ppl.length ? ppl.map(function (n) { return '<span class="chip">' + esc(n) + ' <button class="x" data-rmperson="' + esc(n) + '" title="Remove">✕</button></span>'; }).join(' ') + '<div class="small muted">Their last met date becomes ' + esc(fmtD(v.date)) + '.</div>' : '<span class="muted small">Nobody yet</span>') + '<div class="btns">' + pick('person', '+ Add a friend', names.map(function (n) { return '<option>' + esc(n) + '</option>'; }).join('')) + '</div></div>' +
      '<div class="sec"><h3>Movies</h3>' + (st.movies.length ? st.movies.map(function (m) { return '<div class="row"><span>' + esc(m.name) + ' <span class="muted small">' + esc(m.where || '') + '</span></span><span><button class="x" data-unlink="movies:' + m.id + '" title="Unlink">✕</button></span></div>'; }).join('') : '<span class="muted small">None linked</span>') +
        '<div class="btns">' + pick('movie', '+ Link a movie', freeMovies.slice(0, 80).map(function (m) { return '<option value="' + esc(m.id) + '">' + esc(fmtD(m.date) + ' · ' + m.name + (m.visitId ? ' (in ' + m.visitId + ')' : '')) + '</option>'; }).join('')) + '</div></div>' +
      '<div class="sec"><h3>Meals</h3>' + (st.meals.length ? st.meals.map(function (e) { return '<div class="row"><span>' + esc(e.place || 'Meal') + ' <span class="muted small">' + esc(e.rows.map(function (r) { return r.category; }).join(', ')) + '</span></span><span>' + amt(e.total) + ' <button class="x" data-unlink="food:' + e.id + '" title="Unlink">✕</button></span></div>'; }).join('') : '<span class="muted small">None linked</span>') +
        '<div class="btns">' + pick('meal', '+ Link a meal', freeMeals.slice(0, 80).map(function (e) { var cur = e.rows[0].visitId; return '<option value="' + esc(e.id) + '">' + esc(mealLabel(e) + (cur ? ' (in ' + cur + ')' : '')) + '</option>'; }).join('')) + '</div></div>' +
      '<div class="sec"><h3>Payments</h3>' + (st.pays.length ? st.pays.map(function (p) { return '<div class="row"><span>' + esc(p.payee || 'Payment') + ' <span class="muted small">' + esc(p['for']) + (p.linkBy ? ' · ' + esc(p.linkBy) + (payTarget(p) ? ': ' + esc(payTarget(p)) : '') : '') + '</span></span><span>' + amt(num(p.total)) + ' <button class="x" data-unlink="payments:' + p.id + '" title="Unlink">✕</button></span></div>'; }).join('') : '<span class="muted small">No payments</span>') +
        (warn.length ? '<div class="chips">' + warn.map(function (w) { return '<span class="chip warn">' + esc(w) + '</span>'; }).join('') + '</div>' : '') +
        '<div class="btns"><button class="ghost" id="add-pay">+ Add a payment</button>' + pick('pay', 'Link an existing payment', freePays.slice(0, 80).map(function (p) { return '<option value="' + esc(p.id) + '">' + esc(fmtD(p.date) + ' · ' + (p.payee || 'Payment') + ' · ' + amt(num(p.total))) + '</option>'; }).join('')) + '</div></div>' +
      '<div class="sum"><div><b>' + amt(st.total) + '</b><small>Total spend</small></div><div><b>' + amt(st.mine) + '</b><small>My spend</small></div></div>' +
      '<p class="small muted" style="margin:8px 0 0">Total spend adds the payments plus any meal with no payment recorded. My spend adds your meals plus your share of movie and other payments. A payment linked to a meal is never added twice.</p>';
  }
  function bindVisits() {
    var nv = $('#new-visit'); nv.onclick = function () { ui.visitForm = 'new'; render(); };
    var f = $('#f-visit');
    if (f) {
      f.addEventListener('submit', async function (e) {
        e.preventDefault();
        var isEdit = ui.visitForm === 'edit' && visitById(ui.visitSel), r = isEdit ? visitById(ui.visitSel) : { id: nextId('V', db.visits), people: '' };
        readForm('visits', f, r); if (!r.type) r.type = 'Outing';
        if (!isEdit) db.visits.push(r);
        ui.visitSel = r.id; ui.visitForm = ''; await save(); render();
      });
      $('#cancel-visit').onclick = function () { ui.visitForm = ''; render(); };
    }
    bindSearch('visits');
    var v = visitById(ui.visitSel);
    $('#view').onclick = async function (e) {
      var pick = e.target.closest('[data-pick]');
      if (pick) { ui.visitSel = pick.dataset.pick; ui.visitForm = ''; render(); return; }
      if (!v) return;
      if (e.target.id === 'edit-visit') { ui.visitForm = 'edit'; render(); window.scrollTo(0, 0); }
      if (e.target.id === 'del-visit' && confirm('Delete this visit? Linked movies, meals and payments stay; only the link is removed.')) {
        db.movies.concat(db.food, db.payments).forEach(function (r) { if (r.visitId === v.id) r.visitId = ''; });
        db.visits = db.visits.filter(function (x) { return x.id !== v.id; }); ui.visitSel = ''; await save(); render();
      }
      if (e.target.id === 'add-pay') { ui.payVisit = v.id; tab = 'payments'; render(); window.scrollTo(0, 0); }
      var rm = e.target.dataset.rmperson;
      if (rm) { v.people = peopleOf(v).filter(function (n) { return n !== rm; }).join(', '); await save(); render(); }
      var un = e.target.dataset.unlink;
      if (un) { var pr = un.split(':'), kind = pr[0], id = pr.slice(1).join(':');
        if (kind === 'food') db.food.forEach(function (r) { if ((r.entryId || r.id) === id) r.visitId = ''; });
        else db[kind].forEach(function (r) { if (r.id === id) r.visitId = ''; });
        await save(); render(); }
    };
    $('#view').onchange = async function (e) {
      var sel = e.target.closest('.pick'); if (!sel || !sel.value || !v) return;
      var kind = sel.dataset.add, val = sel.value;
      if (kind === 'person') v.people = peopleOf(v).concat([val]).join(', ');
      if (kind === 'movie') db.movies.forEach(function (r) { if (r.id === val) r.visitId = v.id; });
      if (kind === 'meal') db.food.forEach(function (r) { if ((r.entryId || r.id) === val) r.visitId = v.id; });
      if (kind === 'pay') db.payments.forEach(function (r) { if (r.id === val) r.visitId = v.id; });
      await save(); render();
    };
  }

  // ----- Payments: Total Spend, whose expense it is, and the links (Movie ID, Food ID, Visit ID) -----
  function mineExtra(p) { return p['for'] === 'Mine' && p.linkBy !== 'Food' ? num(p.total) : 0; }   // Food rows already hold your food spend
  function migratePayment(p) {   // carry over the earlier layout (Linked Type + Linked ID)
    var lt = p.legacyType || p.linkType, li = p.legacyId || p.linkId;
    if (lt && !p.linkBy) p.linkBy = lt;
    if (li && lt === 'Movies' && !p.movieId) p.movieId = li;
    if (li && lt === 'Food' && !p.foodId) p.foodId = li;
    p.legacyType = ''; p.legacyId = ''; return p;
  }
  function payTarget(p) {
    if (p.linkBy === 'Movies') { var m = db.movies.filter(function (x) { return x.id === p.movieId; })[0]; return m ? m.name : (p.movieId ? p.movieId : ''); }
    if (p.linkBy === 'Food') { var e = entries().filter(function (x) { return x.id === p.foodId; })[0]; return e ? (e.place || e.rows[0].category) + ' · ' + fmtD(e.date) : (p.foodId ? p.foodId : ''); }
    return '';
  }
  function payWarnings(p) {
    var w = [];
    if (p['for'] === 'Mine' && p.linkBy === 'Food') { if (!p.foodId) w.push('No Food ID'); else if (!entries().some(function (e) { return e.id === p.foodId; })) w.push('Meal not found in Food'); }
    if (p['for'] === 'Mine' && p.linkBy === 'Movies') { if (!p.movieId) w.push('No Movie ID'); else if (!db.movies.some(function (m) { return m.id === p.movieId; })) w.push('Movie not found'); }
    if (p.visitId && !visitById(p.visitId)) w.push('Visit not found');
    return w;
  }
  function spendParts(from, to) {
    var rg = from ? { from: from, to: to } : null;
    var food = sumBy(db.food.filter(function (r) { return inRange(r.date, rg); }), function (r) { return num(r.amount); });
    var pays = db.payments.filter(function (p) { return inRange(p.date, rg); });
    var mov = sumBy(pays.filter(function (p) { return p['for'] === 'Mine' && p.linkBy === 'Movies'; }), function (p) { return num(p.total); });
    var oth = sumBy(pays.filter(function (p) { return p['for'] === 'Mine' && p.linkBy === 'Others'; }), function (p) { return num(p.total); });
    var who = function (w) { return sumBy(pays.filter(function (p) { return p['for'] === w; }), function (p) { return num(p.total); }); };
    return { food: food, movies: mov, others: oth, mine: food + mov + oth, mom: who('Mom'), dad: who('Dad'), othersFor: who('Others'), payTotal: sumBy(pays, function (p) { return num(p.total); }) };
  }
  function paymentsHTML() {
    var ed = editing.payments && db.payments.filter(function (p) { return p.id === editing.payments; })[0] || null, sp = spendParts();
    var o = ed || { date: today(), 'for': 'Mine', linkBy: 'Movies', visitId: ui.payVisit || '' };
    var tiles = [[amt(sp.mine), 'My spend', 'Food ' + amt(sp.food) + ' · Movies ' + amt(sp.movies) + ' · Others ' + amt(sp.others)], [amt(sp.payTotal), 'All payments', 'total spend'], [amt(sp.mom), 'Mom', 'not mine'], [amt(sp.dad), 'Dad', 'not mine'], [amt(sp.othersFor), 'Others', 'not mine']]
      .map(function (t) { return '<div class="card tile"><div class="k">' + t[1] + '</div><div class="v">' + t[0] + '</div><div class="s">' + t[2] + '</div></div>'; }).join('');
    var form = '<form id="f-pay" class="card"><div class="form"><label>Date<input name="date" type="date" value="' + esc(o.date) + '"></label><label>Payee<input name="payee" value="' + esc(o.payee || '') + '"></label>' +
      '<label>Total spend<input name="total" type="number" step="0.01" min="0" required value="' + esc(o.total === undefined ? '' : o.total) + '"></label>' +
      '<label>Expense is for<select name="for">' + ['Mine', 'Mom', 'Dad', 'Others'].map(function (x) { return '<option' + (x === o['for'] ? ' selected' : '') + '>' + x + '</option>'; }).join('') + '</select></label>' +
      '<label id="l-ltype">Linked by<select name="linkBy">' + ['Movies', 'Food', 'Others'].map(function (x) { return '<option' + (x === o.linkBy ? ' selected' : '') + '>' + x + '</option>'; }).join('') + '</select></label>' +
      '<label id="l-movie">Movie ID<select name="movieId"></select></label><label id="l-meal">Food ID (meal)<select name="foodId"></select></label>' +
      '<label>Visit ID<select name="visitId">' + visitOptions(o.visitId) + '</select></label><label class="wide">Notes<input name="notes" value="' + esc(o.notes || '') + '"></label></div>' +
      '<div class="row"><button class="btn" type="submit">' + (ed ? 'Save changes' : 'Add payment') + '</button>' + (ed ? '<button class="btn alt" type="button" id="cancel-pay">Cancel</button>' : '') + '</div><p class="small muted" id="pay-msg" style="margin:8px 0 0">' + esc(ui.payMsg) + '</p></form>';
    var flt = ui.payFilter || 'All', rows = filterRows('payments', byDateDesc(db.payments)).filter(function (p) { return flt === 'All' || p['for'] === flt; });
    var table = rows.length ? '<div class="tbl card"><table><thead><tr><th>Date</th><th>Payee</th><th>Total</th><th>For</th><th>Linked by</th><th>Movie</th><th>Food</th><th>Visit</th><th></th></tr></thead><tbody>' + rows.slice(0, 200).map(function (p) {
      var w = payWarnings(p).map(function (x) { return '<div><span class="chip warn">' + esc(x) + '</span></div>'; }).join('');
      var mv = p.movieId ? db.movies.filter(function (m) { return m.id === p.movieId; })[0] : null, ml = p.foodId ? entries().filter(function (e) { return e.id === p.foodId; })[0] : null;
      return '<tr><td class="nw">' + esc(fmtD(p.date)) + '</td><td>' + esc(p.payee) + '</td><td class="n">' + amt(num(p.total)) + '</td><td><span class="pill ' + (p['for'] === 'Mine' ? 'mine' : '') + '">' + esc(p['for']) + '</span></td><td>' + esc(p.linkBy) + '</td><td title="' + esc(p.movieId) + '">' + esc(mv ? mv.name : '') + '</td><td title="' + esc(p.foodId) + '">' + esc(ml ? (ml.place || ml.rows[0].category) : '') + w + '</td><td>' + visitChip(p.visitId) + '</td><td class="act"><button class="link" data-edit="' + p.id + '">Edit</button><button class="link del" data-del="' + p.id + '">Delete</button></td></tr>';
    }).join('') + '</tbody></table></div>' : '<p class="empty">No payments yet.</p>';
    var fl = '<div class="filters">' + ['All', 'Mine', 'Mom', 'Dad', 'Others'].map(function (x) { return '<button type="button" data-pf="' + x + '" aria-pressed="' + (x === flt) + '">' + x + '</button>'; }).join('') + '</div>';
    return '<h2 class="h">Payments <span class="muted small">' + db.payments.length + ' recorded</span></h2><div class="grid tiles">' + tiles + '</div>' + form +
      '<p class="small muted">Only the total is tracked. Payments linked by Food are not added to My spend again: your Food entries already hold that amount. Movies and Others count from the payment total.</p>' + fl + searchBox('payments') + table;
  }
  function bindPayments() {
    var f = $('#f-pay'), ed = editing.payments && db.payments.filter(function (p) { return p.id === editing.payments; })[0];
    function visitMovies() { var v = visitById(f.elements.visitId.value); return v ? db.movies.filter(function (m) { return m.visitId === v.id; }) : []; }
    function visitMeals() { var v = visitById(f.elements.visitId.value); return v ? foodMealsOf(v.id) : []; }
    function fillLists(keepMovie, keepMeal) {
      var vm = visitMovies(), ve = visitMeals();
      f.elements.movieId.innerHTML = '<option value="">Not set</option>' + db.movies.slice().sort(function (a, b) { return String(b.date).localeCompare(String(a.date)); }).slice(0, 150).map(function (m) { return '<option value="' + esc(m.id) + '">' + esc(m.name + ' (' + fmtD(m.date) + ')') + '</option>'; }).join('');
      f.elements.foodId.innerHTML = '<option value="">Not set</option>' + entries().sort(function (a, b) { return String(b.date).localeCompare(String(a.date)); }).slice(0, 80).map(function (e) { return '<option value="' + esc(e.id) + '">' + esc(mealLabel(e)) + '</option>'; }).join('');
      f.elements.movieId.value = keepMovie || (vm.length === 1 ? vm[0].id : '');
      f.elements.foodId.value = keepMeal || (ve.length === 1 ? ve[0].id : '');
    }
    function show() {
      var forV = f.elements['for'].value, type = f.elements.linkBy.value;
      $('#l-ltype').hidden = forV !== 'Mine'; $('#l-movie').hidden = !(forV === 'Mine' && type === 'Movies'); $('#l-meal').hidden = !(forV === 'Mine' && type === 'Food');
    }
    fillLists(ed ? ed.movieId : '', ed ? ed.foodId : ''); show();
    f.elements['for'].onchange = f.elements.linkBy.onchange = show;
    f.elements.visitId.onchange = function () { fillLists(f.elements.movieId.value, f.elements.foodId.value); };
    f.addEventListener('submit', async function (e) {
      e.preventDefault(); var fd = new FormData(f), msg = $('#pay-msg'), forV = fd.get('for'), total = numOrBlank(fd.get('total')), r = ed || { id: nextId('P', db.payments) };
      if (total === '') { msg.textContent = 'Enter the total spend.'; return; }
      var by = forV === 'Mine' ? fd.get('linkBy') : '', mid = by === 'Movies' ? (fd.get('movieId') || '') : '', fid = by === 'Food' ? (fd.get('foodId') || '') : '';
      Object.assign(r, { date: fd.get('date') || today(), payee: (fd.get('payee') || '').trim(), total: total, 'for': forV, linkBy: by, movieId: mid, foodId: fid, visitId: fd.get('visitId') || '', notes: (fd.get('notes') || '').trim() });
      if (!ed) db.payments.push(r);
      var warn = payWarnings(r);
      ui.payMsg = (forV !== 'Mine' ? 'Saved under ' + forV + '. Your own spending is unchanged.' : by === 'Food' ? 'Saved. Linked by Food, so it is not added to My spend a second time.' : 'Saved. Added ' + amt(total) + ' to My spend (' + by + ').') + (warn.length ? ' Check: ' + warn.join(', ') + '.' : '');
      ui.payVisit = ''; editing.payments = null; await save(); render();
    });
    var c = $('#cancel-pay'); if (c) c.onclick = function () { editing.payments = null; render(); };
    document.querySelectorAll('[data-pf]').forEach(function (b) { b.onclick = function () { ui.payFilter = b.dataset.pf; render(); }; });
    bindSearch('payments');
    $('#view').onclick = async function (e) {
      var edt = e.target.dataset.edit, del = e.target.dataset.del;
      if (edt) { editing.payments = edt; render(); window.scrollTo(0, 0); }
      if (del && confirm('Delete this payment?')) { db.payments = db.payments.filter(function (p) { return p.id !== del; }); await save(); render(); }
    };
  }

  // ---------- analytics ----------
  function entries() {
    var m = {}; db.food.forEach(function (r) { var e = r.entryId || r.id; m[e] = m[e] || { id: e, date: r.date, place: r.place, total: 0, rows: [] }; m[e].total += num(r.amount); m[e].rows.push(r); });
    return Object.keys(m).map(function (k) { return m[k]; });
  }
  function foodByMonth() { var m = {}; db.food.forEach(function (r) { if (r.date) m[mkey(r.date)] = (m[mkey(r.date)] || 0) + num(r.amount); }); return m; }
  function bars(items, fmt) {
    var max = Math.max.apply(null, items.map(function (i) { return i.v; }).concat([1]));
    return '<div class="chart">' + items.map(function (i) {
      return '<div class="bar"><b>' + (i.v ? esc(fmt ? fmt(i.v) : i.v) : '') + '</b><i style="height:' + Math.max(2, i.v / max * 100) + '%" title="' + esc(i.l + ': ' + (fmt ? fmt(i.v) : i.v)) + '"></i><span>' + esc(i.l) + '</span></div>';
    }).join('') + '</div>';
  }
  function list(items, none) { return items.length ? '<ul class="plain">' + items.map(function (i) { return '<li><span>' + esc(i[0]) + '</span><span class="muted">' + esc(i[1]) + '</span></li>'; }).join('') + '</ul>' : '<p class="empty">' + none + '</p>'; }
  function short(n) { return n >= 1000 ? (Math.round(n / 100) / 10) + 'k' : String(Math.round(n)); }
  function pl(n, w) { return n + ' ' + w + (n === 1 ? '' : 's'); }
  function top(arr, n) { return arr.sort(function (a, b) { return b.v - a.v || b.n - a.n; }).slice(0, n); }

  function dashHTML() {
    var months = lastMonths(12), fm = foodByMonth(), now = months[11], prev = months[10], year = now.slice(0, 4);
    var spendNow = fm[now] || 0, spendPrev = fm[prev] || 0, delta = spendPrev ? Math.round((spendNow - spendPrev) / spendPrev * 100) : null;
    var ents = entries(), mealsNow = ents.filter(function (e) { return mkey(e.date) === now; });
    var moviesYear = db.movies.filter(function (r) { return String(r.date).slice(0, 4) === year; });
    var theatre = moviesYear.filter(function (r) { return r.where === 'Theatre'; }).length;
    var due = dueList(), estShare = (function () { var t = 0, e = 0; db.food.forEach(function (r) { var a = num(r.amount); t += a; if (/estimated|your note/i.test(r.source || '')) e += a; }); return t ? Math.round(e / t * 100) : 0; })();
    var tiles = [
      ['Food spend, ' + mlabel(now), money(spendNow), delta == null ? mealsNow.length + ' meals' : '<span class="' + (delta > 0 ? 'up' : 'down') + '">' + (delta > 0 ? '▲' : '▼') + ' ' + Math.abs(delta) + '% vs ' + mlabel(prev) + '</span>'],
      ['Per meal, ' + mlabel(now), mealsNow.length ? money(spendNow / mealsNow.length) : '-', mealsNow.length + ' meals this month'],
      ['Watched in ' + year, moviesYear.length, theatre + ' in theatres'],
      ['Friends due', due.length, db.social.length + ' people tracked']
    ].map(function (t) { return '<div class="card tile"><div class="k">' + t[0] + '</div><div class="v">' + t[1] + '</div><div class="s">' + t[2] + '</div></div>'; }).join('');

    var types = top(tally(db.food, function (r) { return r.foodType; }, function (r) { return num(r.amount); }), 9).map(function (p) { return [p.k, money(p.v) + ' · ' + pl(p.n, 'item')]; });
    var cats = top(tally(db.food, function (r) { return r.category; }, function (r) { return num(r.amount); }).map(function (x) { x.v = x.n; return x; }), 8).map(function (p) { return [p.k, pl(p.n, 'time')]; });
    var places = top(tally(ents, function (e) { return e.place; }, function (e) { return e.total; }), 8).map(function (p) { return [p.k, money(p.v) + ' · ' + pl(p.n, 'visit')]; });
    var genres = top(tally(db.movies, function (r) { return r.genre; }).map(function (x) { x.v = x.n; return x; }), 10).map(function (p) { var rr = db.movies.filter(function (m) { return m.genre === p.k && m.imdb !== ''; }); return [p.k, p.n + ' · avg IMDb ' + (rr.length ? (rr.reduce(function (a, m) { return a + num(m.imdb); }, 0) / rr.length).toFixed(1) : '-')]; });
    var langs = top(tally(db.movies, function (r) { return r.language; }).map(function (x) { x.v = x.n; return x; }), 6).map(function (p) { return [p.k, p.n]; });
    var fr = top(tally(db.movies, function (r) { return r.franchise; }).map(function (x) { x.v = x.n; return x; }), 6).map(function (p) { return [p.k, pl(p.n, 'title')]; });
    var dow = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(function (l) { return { l: l, v: 0 }; });
    db.food.forEach(function (r) { if (r.date) dow[parseD(r.date).getDay()].v += num(r.amount); });
    var dueHTML = list(due.slice(0, 8).map(function (x) { return [x.p.name, lastMet(x.p) ? daysAgo(lastMet(x.p)) + ' days since you met' : 'never logged']; }), 'Nobody is due.');
    var sp = spendParts(now + '-01', ymd(new Date(+now.slice(0, 4), +now.slice(5), 0)));
    var spendCard = list([['My spend (' + mlabel(now) + ')', money(sp.mine)], ['  Food', money(sp.food)], ['  Movies', money(sp.movies)], ['  Others', money(sp.others)], ['Mom', money(sp.mom)], ['Dad', money(sp.dad)], ['Others (not mine)', money(sp.othersFor)]], 'No spending yet.');
    var ins = insights().map(function (t) { return '<div class="insight">' + esc(t) + '</div>'; }).join('') || '<p class="empty">Add more entries and insights will show up here.</p>';
    var chips = ['How much did I spend on coffee this year?', 'How many movies did I watch in 2025?', 'Which friend have I not met the longest?', 'What are my top places?', 'When did I last watch a Superhero movie?'];
    var ask = '<div class="card ask"><h3>Ask your data</h3><form id="f-ask" class="row"><input id="ask-q" placeholder="e.g. how much did I spend at La Shanti in 2025?" autocomplete="off"><button class="btn" type="submit">Ask</button></form>' +
      '<div class="chips">' + chips.map(function (c) { return '<button type="button" class="chip" data-q="' + esc(c) + '">' + esc(c) + '</button>'; }).join('') + '</div><div id="ask-out" class="ask-out">' + askLog + '</div></div>';
    return ask + '<div class="grid tiles">' + tiles + '</div><div class="grid cols">' +
      '<div class="card"><h3>Food spend, last 12 months</h3>' + bars(months.map(function (m) { return { l: mlabel(m), v: fm[m] || 0 }; }), short) + '</div>' +
      '<div class="card"><h3>Watched, last 12 months</h3>' + bars(months.map(function (m) { return { l: mlabel(m), v: db.movies.filter(function (r) { return mkey(r.date) === m; }).length }; })) + '</div>' +
      '<div class="card"><h3>Food spend by weekday</h3>' + bars(dow, short) + '</div>' +
      '<div class="card"><h3>Insights</h3><div class="grid" style="gap:8px">' + ins + (estShare ? '<div class="insight">' + estShare + '% of your food spend is estimated, not recorded.</div>' : '') + '</div></div>' +
      '<div class="card"><h3>Spending, ' + mlabel(now) + '</h3>' + spendCard + '</div>' +
      '<div class="card"><h3>Spend by food type</h3>' + list(types, 'No food entries yet.') + '</div>' +
      '<div class="card"><h3>Most-eaten categories</h3>' + list(cats, 'No food entries yet.') + '</div>' +
      '<div class="card"><h3>Top places by spend</h3>' + list(places, 'No food entries yet.') + '</div>' +
      '<div class="card"><h3>Genres</h3>' + list(genres, 'No movies yet.') + '</div>' +
      '<div class="card"><h3>Languages</h3>' + list(langs, 'No movies yet.') + '</div>' +
      '<div class="card"><h3>Franchises</h3>' + list(fr, 'No franchises yet.') + '</div>' +
      '<div class="card"><h3>Friends due</h3>' + dueHTML + '</div></div>';
  }
  function bindDash() {
    var f = $('#f-ask'); if (!f) return;
    var run = function (q) { q = (q || '').trim(); if (!q) return; $('#ask-q').value = q; askLog = answer(q); $('#ask-out').innerHTML = askLog; };
    f.addEventListener('submit', function (e) { e.preventDefault(); run($('#ask-q').value); });
    document.querySelectorAll('.chip').forEach(function (c) { c.onclick = function () { run(c.dataset.q); }; });
    $('#view').onclick = async function (e) {
      if (e.target.id === 'copy-claude') {
        var q = e.target.dataset.q, link = CFG.LIFE_SHEET_URL || 'my Life Log Google Sheet';
        var text = 'In ' + link + ' (tabs Movies, Food, Social): ' + q;
        try { await navigator.clipboard.writeText(text); e.target.textContent = 'Copied. Paste it into claude.ai'; } catch (x) { prompt('Copy this into claude.ai:', text); }
      }
    };
  }
  function insights() {
    var out = [], months = lastMonths(12), fm = foodByMonth(), now = months[11];
    var vals = months.slice(0, 11).map(function (m) { return fm[m] || 0; }).filter(Boolean);
    if (vals.length >= 3 && fm[now]) {
      var avg = vals.reduce(function (a, b) { return a + b; }, 0) / vals.length, d = new Date(), dim = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
      out.push('At this pace you will spend about ' + money(fm[now] / d.getDate() * dim) + ' on food this month; your usual month is ' + money(avg) + '.');
    }
    var topM = Object.keys(fm).sort(function (a, b) { return fm[b] - fm[a]; })[0];
    if (topM) out.push('Your priciest food month was ' + mlabel(topM) + ' ' + topM.slice(0, 4) + ' at ' + money(fm[topM]) + '.');
    var pl = tally(entries(), function (e) { return e.place; }).sort(function (a, b) { return b.n - a.n; })[0];
    if (pl && pl.n >= 3) out.push('Your most visited place is ' + pl.k + ' (' + pl.n + ' meals).');
    var g = tally(db.movies, function (r) { return r.genre; }).sort(function (a, b) { return b.n - a.n; })[0];
    if (g) out.push('Your favourite genre is ' + g.k + ' (' + g.n + ' titles).');
    var th = db.movies.filter(function (r) { return r.where === 'Theatre'; }).length;
    if (db.movies.length >= 5) out.push(Math.round(th / db.movies.length * 100) + '% of what you watch is in theatres.');
    var dl = dueList()[0]; if (dl) out.push('Longest overdue catch-up: ' + dl.p.name + (lastMet(dl.p) ? ' (last met ' + daysAgo(lastMet(dl.p)) + ' days ago)' : '') + '.');
    return out;
  }

  // ---------- "Ask your data": simple questions answered right here, no AI, no cost ----------
  function normQ(s) { return ' ' + String(s).toLowerCase().replace(/[^a-z0-9&' -]/g, ' ').replace(/\s+/g, ' ') + ' '; }
  function hasTerm(q, term) { term = String(term).toLowerCase().trim(); if (term.length < 3) return false; return new RegExp('(^|[^a-z0-9])' + term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '(s|es)?([^a-z0-9]|$)').test(q); }
  function findTerm(q, values) { var best = ''; values.forEach(function (v) { if (hasTerm(q, v) && String(v).length > best.length) best = v; }); return best; }
  function parseRange(q) {
    var now = new Date(), y = now.getFullYear(), m = now.getMonth(), t = today(), r;
    function span(a, b, l) { return { from: ymd(a), to: ymd(b), label: l }; }
    if ((r = /last (\d+) days?/.exec(q))) return { from: addDays(t, -num(r[1])), to: t, label: 'the last ' + r[1] + ' days' };
    if (/\byesterday\b/.test(q)) return { from: addDays(t, -1), to: addDays(t, -1), label: 'yesterday' };
    if (/\btoday\b/.test(q)) return { from: t, to: t, label: 'today' };
    var mnames = '(january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|jun|jul|aug|sept|sep|oct|nov|dec)';
    var dm = new RegExp('\\b(\\d{1,2})(?:st|nd|rd|th)?\\s+(?:of\\s+)?' + mnames + '\\b\\s*,?\\s*(20\\d\\d)?').exec(q), md = new RegExp('\\b' + mnames + '\\s+(\\d{1,2})(?:st|nd|rd|th)?\\b\\s*,?\\s*(20\\d\\d)?').exec(q), iso = /\b(20\d\d)-(\d\d)-(\d\d)\b/.exec(q);
    var lowMon = MON.map(function (x) { return x.toLowerCase(); });
    var dd = iso ? { y: +iso[1], m: +iso[2] - 1, d: +iso[3] } : dm ? { y: dm[3] ? +dm[3] : 0, m: lowMon.indexOf(dm[2].slice(0, 3)), d: +dm[1] } : md ? { y: md[3] ? +md[3] : 0, m: lowMon.indexOf(md[1].slice(0, 3)), d: +md[2] } : null;
    if (dd && dd.m >= 0 && dd.d >= 1 && dd.d <= 31) { if (!dd.y) { dd.y = y; if (ymd(new Date(y, dd.m, dd.d)) > t) dd.y = y - 1; } var one = ymd(new Date(dd.y, dd.m, dd.d)); return { from: one, to: one, label: fmtD(one) }; }
    if (/this week/.test(q)) { var d0 = new Date(now); d0.setDate(d0.getDate() - ((d0.getDay() + 6) % 7)); return { from: ymd(d0), to: t, label: 'this week' }; }
    if (/this month/.test(q)) return span(new Date(y, m, 1), new Date(y, m + 1, 0), 'this month');
    if (/last month/.test(q)) return span(new Date(y, m - 1, 1), new Date(y, m, 0), 'last month');
    if (/this year/.test(q)) return span(new Date(y, 0, 1), new Date(y, 11, 31), 'this year');
    if (/last year/.test(q)) return span(new Date(y - 1, 0, 1), new Date(y - 1, 11, 31), 'last year');
    var mn = '(january|february|march|april|june|july|august|september|october|november|december|jan|feb|mar|apr|jun|jul|aug|sept|sep|oct|nov|dec)';
    if ((r = new RegExp('\\b' + mn + '\\b\\s*,?\\s*(20\\d\\d)?').exec(q)) || (r = /\b(?:in|during|of|for)\s+(may)\b\s*(20\d\d)?/.exec(q))) {
      var idx = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'].indexOf(r[1].slice(0, 3)), yy = r[2] ? +r[2] : (idx > m ? y - 1 : y);
      return span(new Date(yy, idx, 1), new Date(yy, idx + 1, 0), MON[idx] + ' ' + yy);
    }
    if ((r = /\b(20\d\d)\b/.exec(q))) return span(new Date(+r[1], 0, 1), new Date(+r[1], 11, 31), r[1]);
    return null;
  }
  function inRange(d, rg) { return !rg || (d && d >= rg.from && d <= rg.to); }
  function foodMatch(r, term) { if (!term) return true; term = term.toLowerCase(); return String(r.category).toLowerCase().indexOf(term) >= 0 || String(r.subcategory).toLowerCase().indexOf(term) >= 0; }
  function ansCard(head, rows, q, none) {
    var html = '<div class="ans"><strong>' + head + '</strong>';
    if (rows && rows.length) html += '<ul class="plain">' + rows.slice(0, 10).map(function (r) { return '<li><span>' + esc(r[0]) + '</span><span class="muted">' + esc(r[1]) + '</span></li>'; }).join('') + '</ul>' + (rows.length > 10 ? '<p class="muted small">…and ' + (rows.length - 10) + ' more</p>' : '');
    return html + '</div>';
  }
  function unknown(q) {
    return '<div class="ans"><strong>I can’t answer that one here.</strong><p class="muted small">I handle spend, counts, last-met, top lists and “what did I eat/watch”. For anything open-ended, ask Claude about your sheet.</p><button type="button" class="ghost" id="copy-claude" data-q="' + esc(q) + '">Copy question for Claude</button></div>';
  }
  function answer(raw) {
    var q = normQ(raw), rg = parseRange(q), scope = rg ? ' in ' + rg.label : '';
    // vocab from your data
    var places = uniq(db.food.map(function (r) { return r.place; })), cats = uniq(db.food.map(function (r) { return r.category; })), subs = uniq(db.food.map(function (r) { return r.subcategory; }));
    var ftypes = FOOD_TYPES, genres = Object.keys(TAX), subg = uniq(db.movies.map(function (r) { return r.subgenre; })), langs = uniq(db.movies.map(function (r) { return r.language; })), fran = uniq(db.movies.map(function (r) { return r.franchise; }));
    var names = uniq(db.social.map(function (r) { return r.name; })), groups = uniq(db.social.map(function (r) { return r.group; })), mnames = uniq(db.movies.map(function (r) { return r.name; }));
    var fPlace = findTerm(q, places), fCat = findTerm(q, cats), fSub = findTerm(q, subs), fType = findTerm(q, ftypes.concat(['street food', 'snacks', 'drinks', 'desserts', 'bakery', 'waffles'])),
      fGenre = findTerm(q, genres.concat(['sci fi', 'scifi', 'thriller', 'mystery'])), fSubg = findTerm(q, subg), fLang = findTerm(q, langs), fFran = findTerm(q, fran), fName = findTerm(q, names), fMovie = findTerm(q, mnames), fGroup = findTerm(q, groups);
    var fTerm = fCat.length >= fSub.length ? fCat : fSub; fCat = fTerm; fSub = '';
    if (/sci ?-?fi/.test(q)) fGenre = 'Sci-Fi';
    if (fGenre === 'Thriller' || fGenre === 'thriller' || fGenre === 'mystery') fGenre = 'Thriller & Mystery';
    if (fGenre && !TAX[fGenre]) fGenre = genres.filter(function (g) { return g.toLowerCase() === fGenre.toLowerCase(); })[0] || '';
    if (fGenre && fSubg && (TAX[fGenre] || []).indexOf(fSubg) < 0) fSubg = '';
    if (fType && FOOD_TYPES.indexOf(fType) < 0) { var alias = { 'street food': 'Street Food & Snacks', snacks: 'Street Food & Snacks', drinks: 'Coffee & Drinks', desserts: 'Desserts & Ice Cream', bakery: 'Bakery & Waffles', waffles: 'Bakery & Waffles' }; fType = alias[fType.toLowerCase()] || ''; }
    var movieWords = /\b(movie|movies|film|films|watch|watched|series|show|shows|cinema|theatre|theater|imdb|genre)\b/.test(q) || fGenre || fSubg || fLang || fFran || fMovie;
    var socialWords = /\b(meet|met|friend|friends|catch up|overdue|due|people|person)\b/.test(q) || fName || fGroup;
    var foodWords = /\b(eat|ate|eaten|food|meal|meals|spend|spent|cost|restaurant|cafe|place|places|dish|coffee|pizza|burger)\b/.test(q) || fPlace || fCat || fSub || fType;
    var wantSpend = /\b(spend|spent|cost|paid|pay|expense|expenses|money|much)\b/.test(q), wantCount = /\b(how many|count|number of|times|often)\b/.test(q),
      wantLast = /\b(last|latest|recent|recently)\b/.test(q) && /\b(when|last time|latest|recent)\b/.test(q), wantTop = /\b(top|most|favou?rite|best|highest|biggest|popular)\b/.test(q),
      wantAvg = /\b(average|avg|mean)\b/.test(q), wantList = /\b(what|which|list|show)\b/.test(q) && /\b(eat|ate|watch|watched|have|did)\b/.test(q);

    // ----- visits -----
    if (/\bvisits?\b/.test(q)) {
      var vPlace = findTerm(q, uniq(db.visits.map(function (v) { return v.place; })));
      var vs = db.visits.filter(function (v) { return inRange(v.date, rg) && (!vPlace || v.place === vPlace); }).sort(function (a, b) { return b.date.localeCompare(a.date); });
      if (wantLast || /\blast\b/.test(q)) { var lv = vs[0]; return lv ? '<div class="ans"><strong>' + esc(lv.place) + '</strong><p>' + esc(fmtD(lv.date)) + ' (' + daysAgo(lv.date) + ' days ago)' + (peopleOf(lv).length ? ', with ' + esc(peopleOf(lv).join(', ')) : '') + '. ' + esc(lv.id) + '</p></div>' : '<div class="ans">No visits match.</div>'; }
      return ansCard(vs.length + ' visit' + (vs.length === 1 ? '' : 's') + (vPlace ? ' to ' + esc(vPlace) : '') + esc(scope), vs.map(function (v) { var st = visitStats(v); return [v.place + ' (' + v.id + ')', fmtD(v.date) + (st.mine ? ' · ' + amt(st.mine) : '')]; }), raw);
    }
    // ----- family and other people's expenses; movie and other spend from payments -----
    if (wantSpend && /\b(mom|dad)\b/.test(q)) {
      var who = /\bmom\b/.test(q) ? 'Mom' : 'Dad', pp = db.payments.filter(function (p) { return p['for'] === who && inRange(p.date, rg); });
      return ansCard(amt(sumBy(pp, function (p) { return num(p.total); })) + ' on ' + who + esc(scope), pp.sort(function (a, b) { return b.date.localeCompare(a.date); }).map(function (p) { return [(p.payee || 'Payment') + (payTarget(p) ? ' · ' + payTarget(p) : ''), fmtD(p.date) + ' · ' + amt(num(p.total))]; }), raw);
    }
    if (wantSpend && /\b(movie|movies|cinema|film|films)\b/.test(q) && !fMovie) {
      var mp = db.payments.filter(function (p) { return p['for'] === 'Mine' && p.linkBy === 'Movies' && inRange(p.date, rg); });
      return ansCard(amt(sumBy(mp, function (p) { return num(p.total); })) + ' of your spend on movies' + esc(scope), mp.sort(function (a, b) { return b.date.localeCompare(a.date); }).map(function (p) { return [payTarget(p) || p.payee || 'Payment', fmtD(p.date) + ' · ' + amt(num(p.total))]; }), raw);
    }
    // ----- friends -----
    if (socialWords && !(movieWords && !fName) && !(foodWords && !fName && !/friend|meet|met|overdue|due/.test(q))) {
      if (fName) {
        var p = db.social.filter(function (x) { return x.name.toLowerCase() === fName.toLowerCase(); })[0];
        if (!p) return unknown(raw);
        return '<div class="ans"><strong>' + esc(p.name) + '</strong><p>Last met ' + (lastMet(p) ? esc(fmtD(lastMet(p))) + ' (' + daysAgo(lastMet(p)) + ' days ago)' : 'never logged') + '. Next due ' + esc(fmtD(nextDue(p))) + (nextDue(p) <= today() ? ' <span class="badge warn">time to meet</span>' : '') + '. Group: ' + esc(p.group || '-') + ', every ' + esc(p.every || 30) + ' days.</p></div>';
      }
      var due = dueList();
      if (/\b(overdue|due|should|longest|catch up|not met|haven)/.test(q) || wantTop) {
        var arr = db.social.map(function (x) { return { p: x, d: lastMet(x) ? daysAgo(lastMet(x)) : 99999 }; }).filter(function (x) { return !fGroup || x.p.group === fGroup; }).sort(function (a, b) { return b.d - a.d; });
        return ansCard('Not met the longest' + (fGroup ? ' (' + esc(fGroup) + ')' : ''), arr.map(function (x) { return [x.p.name, lastMet(x.p) ? x.d + ' days ago (' + fmtD(lastMet(x.p)) + ')' : 'never logged']; }), raw);
      }
      if (wantCount) return ansCard('You track ' + db.social.length + ' people; ' + due.length + ' are due to meet now.', due.map(function (x) { return [x.p.name, 'due ' + fmtD(x.due)]; }), raw);
      if (wantLast) return ansCard('Last met', db.social.filter(function (x) { return lastMet(x); }).sort(function (a, b) { return lastMet(b).localeCompare(lastMet(a)); }).map(function (x) { return [x.name, fmtD(lastMet(x))]; }), raw);
      return ansCard(due.length + ' people are due to meet now', due.map(function (x) { return [x.p.name, 'due ' + fmtD(x.due)]; }), raw);
    }

    // ----- movies -----
    if (movieWords && !(foodWords && !movieWords)) {
      var rows = db.movies.filter(function (r) {
        return inRange(r.date, rg) && (!fGenre || r.genre === fGenre) && (!fSubg || r.subgenre === fSubg) && (!fLang || r.language === fLang) && (!fFran || r.franchise === fFran) &&
          (!fMovie || r.name === fMovie) && (!/\bthea?tres?\b|cinema/.test(q) || r.where === 'Theatre') && (!/\b(at home|home)\b/.test(q) || r.where === 'Home') &&
          (!/\b(series|shows?)\b/.test(q) || r.type === 'Series');
      });
      var label = [fGenre, fSubg, fLang, fFran, /\bthea?tres?\b|cinema/.test(q) ? 'theatre' : ''].filter(Boolean).join(' · ');
      if (wantLast) { var l = rows.slice().sort(function (a, b) { return b.date.localeCompare(a.date); })[0]; return l ? '<div class="ans"><strong>' + esc(l.name) + '</strong><p>Watched ' + esc(fmtD(l.date)) + ' (' + daysAgo(l.date) + ' days ago)' + (l.where ? ', ' + esc(l.where.toLowerCase()) : '') + '.</p></div>' : '<div class="ans">Nothing matches.</div>'; }
      if (/\bimdb|rating|rated\b/.test(q) && (wantAvg || wantTop)) {
        var rr = rows.filter(function (r) { return r.imdb !== ''; });
        if (wantAvg) return '<div class="ans"><strong>Average IMDb ' + (rr.length ? (rr.reduce(function (a, r) { return a + num(r.imdb); }, 0) / rr.length).toFixed(2) : '-') + '</strong><p class="muted small">across ' + rr.length + ' titles' + (label ? ' (' + esc(label) + ')' : '') + esc(scope) + '</p></div>';
        return ansCard('Highest IMDb' + (label ? ' (' + esc(label) + ')' : ''), rr.sort(function (a, b) { return num(b.imdb) - num(a.imdb); }).map(function (r) { return [r.name, '★ ' + r.imdb]; }), raw);
      }
      if (wantTop && /genre/.test(q)) return ansCard('Favourite genres' + esc(scope), top(tally(rows, function (r) { return r.genre; }).map(function (x) { x.v = x.n; return x; }), 10).map(function (p) { return [p.k, pl(p.n, 'title')]; }), raw);
      if (wantTop && /language/.test(q)) return ansCard('Languages' + esc(scope), top(tally(rows, function (r) { return r.language; }).map(function (x) { x.v = x.n; return x; }), 10).map(function (p) { return [p.k, pl(p.n, 'title')]; }), raw);
      if (wantTop && /franchise/.test(q)) return ansCard('Franchises' + esc(scope), top(tally(rows, function (r) { return r.franchise; }).map(function (x) { x.v = x.n; return x; }), 10).map(function (p) { return [p.k, pl(p.n, 'title')]; }), raw);
      if (wantList || /\b(which|what|list|show)\b/.test(q)) return ansCard(rows.length + ' titles' + (label ? ' (' + esc(label) + ')' : '') + esc(scope), byDateDesc(rows).map(function (r) { return [r.name, fmtD(r.date)]; }), raw);
      var nSer = rows.filter(function (r) { return r.type === 'Series'; }).length;
      return ansCard('You watched ' + rows.length + ' title' + (rows.length === 1 ? '' : 's') + (label ? ' (' + esc(label) + ')' : '') + esc(scope) + (nSer && nSer < rows.length ? ': ' + (rows.length - nSer) + ' movies and ' + nSer + ' series' : '') + '.', byDateDesc(rows).slice(0, 10).map(function (r) { return [r.name, fmtD(r.date)]; }), raw);
    }

    // ----- food -----
    if (foodWords || wantSpend) {
      var fr = db.food.filter(function (r) { return inRange(r.date, rg) && (!fPlace || r.place === fPlace) && foodMatch(r, fTerm) && (!fType || r.foodType === fType); });
      var lab = [fPlace, fTerm, fType].filter(Boolean).join(' · '), tot = fr.reduce(function (a, r) { return a + num(r.amount); }, 0), ents = {};
      fr.forEach(function (r) { ents[r.entryId || r.id] = 1; });
      var nEnt = Object.keys(ents).length;
      if (wantLast) { var lr = fr.slice().sort(function (a, b) { return b.date.localeCompare(a.date); })[0]; return lr ? '<div class="ans"><strong>' + esc(fmtD(lr.date)) + '</strong><p>' + esc(lr.category) + (lr.subcategory ? ' (' + esc(lr.subcategory) + ')' : '') + (lr.place ? ' at ' + esc(lr.place) : '') + ', ' + daysAgo(lr.date) + ' days ago, ' + esc(amt(num(lr.amount))) + '.</p></div>' : '<div class="ans">Nothing matches.</div>'; }
      if (/\b(expensive|priciest|costliest|cheapest)\b/.test(q) && /\b(meal|meals|day|bill)\b/.test(q)) {
        var es = entries().filter(function (e) { return inRange(e.date, rg); }).sort(function (a, b) { return /cheapest/.test(q) ? a.total - b.total : b.total - a.total; });
        return ansCard((/cheapest/.test(q) ? 'Cheapest' : 'Most expensive') + ' meals' + esc(scope), es.map(function (e) { return [fmtD(e.date) + ' · ' + (e.place || e.rows[0].category), amt(e.total)]; }), raw);
      }
      if (wantAvg) { var all = entries().filter(function (e) { return inRange(e.date, rg) && (!fPlace || e.place === fPlace) && (!fType && !fTerm || e.rows.some(function (r) { return foodMatch(r, fTerm) && (!fType || r.foodType === fType); })); }); return '<div class="ans"><strong>' + (all.length ? amt(all.reduce(function (a, e) { return a + e.total; }, 0) / all.length) : '-') + ' per meal</strong><p class="muted small">across ' + all.length + ' meals' + (lab ? ' (' + esc(lab) + ')' : '') + esc(scope) + '</p></div>'; }
      if (wantTop || /\b(where|which|what)\b/.test(q) && /\b(place|places|restaurant|cafe)\b/.test(q)) {
        if (/\b(place|places|restaurant|restaurants|cafe|cafes|where)\b/.test(q)) {
          var pe = tally(entries().filter(function (e) { return inRange(e.date, rg); }), function (e) { return e.place; }, function (e) { return e.total; });
          var byN = /\b(visit|visited|often|times|most)\b/.test(q) && !wantSpend;
          return ansCard('Top places ' + (byN ? 'by visits' : 'by spend') + esc(scope), pe.sort(function (a, b) { return byN ? b.n - a.n : b.v - a.v; }).map(function (p) { return [p.k, p.n + (p.n === 1 ? ' visit · ' : ' visits · ') + amt(p.v)]; }), raw);
        }
        if (/\btype\b/.test(q)) return ansCard('Spend by food type' + esc(scope), tally(fr, function (r) { return r.foodType; }, function (r) { return num(r.amount); }).sort(function (a, b) { return b.v - a.v; }).map(function (p) { return [p.k, amt(p.v) + ' · ' + pl(p.n, 'item')]; }), raw);
        var cc = tally(fr, function (r) { return r.category; }, function (r) { return num(r.amount); });
        return ansCard('What you eat most' + (lab ? ' (' + esc(lab) + ')' : '') + esc(scope), cc.sort(function (a, b) { return b.n - a.n; }).map(function (p) { return [p.k, pl(p.n, 'time') + ' · ' + amt(p.v)]; }), raw);
      }
      if (wantList && !fr.length) return '<div class="ans"><strong>Nothing logged' + esc(scope) + '.</strong></div>';
      if (wantList) return ansCard(fr.length + ' items' + esc(scope), byDateDesc(fr).map(function (r) { return [r.category + (r.subcategory ? ' (' + r.subcategory + ')' : '') + (r.place ? ' · ' + r.place : ''), fmtD(r.date) + ' · ' + amt(num(r.amount))]; }), raw);
      if (wantCount && !wantSpend) return '<div class="ans"><strong>' + nEnt + ' meal' + (nEnt === 1 ? '' : 's') + ', ' + fr.length + ' item' + (fr.length === 1 ? '' : 's') + '</strong><p class="muted small">' + (lab ? esc(lab) : 'all food') + esc(scope) + '</p></div>';
      var estPart = fr.filter(function (r) { return /estimated|your note/i.test(r.source || ''); }).reduce(function (a, r) { return a + num(r.amount); }, 0);
      return '<div class="ans"><strong>' + esc(amt(tot)) + '</strong><p>' + (lab ? esc(lab) : 'On food') + esc(scope) + ': ' + fr.length + ' item' + (fr.length === 1 ? '' : 's') + ' in ' + nEnt + ' meal' + (nEnt === 1 ? '' : 's') + (nEnt ? ', ' + esc(amt(tot / nEnt)) + ' per meal' : '') + '.</p>' + (estPart ? '<p class="muted small">' + esc(amt(estPart)) + ' of this is estimated.</p>' : '') + '</div>';
    }
    return unknown(raw);
  }

  // ---------- reminders ----------
  function computeReminders() {
    var out = [], s = db.settings, t = today();
    db.reminders.forEach(function (r) { if (!r.done && r.date && r.date <= t) out.push({ w: r.date < t, h: r.text, s: r.date < t ? 'Overdue since ' + fmtD(r.date) : 'Due today' }); });
    var due = dueList();
    due.slice(0, 5).forEach(function (x) { out.push({ h: 'Time to meet ' + x.p.name, s: lastMet(x.p) ? 'Last met ' + daysAgo(lastMet(x.p)) + ' days ago (every ' + (x.p.every || 30) + ' days)' : 'No meetup logged yet' }); });
    if (due.length > 5) out.push({ h: due.length - 5 + ' more people are due', s: 'See the Social tab' });
    var fm = foodByMonth(), now = lastMonths(1)[0], spent = fm[now] || 0;
    if (s.foodBudget > 0 && spent) {
      var pct = Math.round(spent / s.foodBudget * 100);
      if (pct >= 100) out.push({ w: 1, h: 'Food budget exceeded', s: money(spent) + ' spent of ' + money(s.foodBudget) + ' this month (' + pct + '%)' });
      else if (pct >= 80) out.push({ w: 1, h: 'Food budget at ' + pct + '%', s: money(spent) + ' of ' + money(s.foodBudget) + ' used this month' });
    }
    var dates = [].concat(db.movies, db.food).map(function (r) { return r.date; }).filter(function (d) { return d && d <= t; }).sort();
    if (dates.length) { var gap = daysAgo(dates[dates.length - 1]); if (gap >= (s.quietDays || 4)) out.push({ h: 'Nothing logged for ' + gap + ' days', s: 'Last entry: ' + fmtD(dates[dates.length - 1]) }); }
    return out;
  }
  function showReminders(rem) {
    $('#modal-card').innerHTML = '<h2>Heads up</h2>' + rem.map(function (r) { return '<div class="rem' + (r.w ? ' warn' : '') + '"><strong>' + esc(r.h) + '</strong><small>' + esc(r.s) + '</small></div>'; }).join('') + '<button class="btn" id="modal-ok">Got it</button>';
    $('#modal').hidden = false; $('#modal-ok').onclick = closeModal;
  }
  function closeModal() { $('#modal').hidden = true; }
  $('#modal').addEventListener('click', function (e) { if (e.target.id === 'modal') closeModal(); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeModal(); });

  function remindersHTML() {
    var s = db.settings, rows = db.reminders.slice().sort(function (a, b) { return String(a.date).localeCompare(String(b.date)); });
    return '<h2 class="h">Reminders</h2>' +
      '<form id="f-rem" class="form card"><label class="wide">Reminder<input name="text" required placeholder="e.g. Call Rahul about the trip"></label><label>Date<input name="date" type="date" value="' + today() + '" required></label><div><button class="btn" type="submit">Add reminder</button></div></form>' +
      (rows.length ? '<div class="card"><ul class="plain">' + rows.map(function (r) {
        return '<li><span' + (r.done ? ' style="text-decoration:line-through;opacity:.6"' : '') + '>' + esc(r.text) + ' <span class="muted small">' + esc(fmtD(r.date)) + '</span></span><span><button class="link" data-done="' + r.id + '">' + (r.done ? 'Undo' : 'Done') + '</button><button class="link del" data-rdel="' + r.id + '">Delete</button></span></li>';
      }).join('') + '</ul></div>' : '<p class="empty">No custom reminders.</p>') +
      '<h3 style="margin:22px 0 10px">Automatic reminders</h3><form id="f-set" class="form card">' +
      '<label>Currency symbol<input name="currency" value="' + esc(s.currency) + '"></label>' +
      '<label>Monthly food budget (0 = off)<input name="foodBudget" type="number" min="0" value="' + (s.foodBudget || 0) + '"></label>' +
      '<label>Social reminders start from<input name="remindersStart" type="date" value="' + esc(s.remindersStart || '') + '"></label>' +
      '<label>Nudge to log after (quiet days)<input name="quietDays" type="number" min="1" value="' + (s.quietDays || 4) + '"></label>' +
      '<div><button class="btn" type="submit">Save settings</button></div></form>' +
      '<p class="muted small">At each unlock you get a pop-up for: people due to meet (each person’s own schedule on the Social tab), food budget at 80% / over, a gap in logging, and your own dated reminders.</p>' +
      '<p><button class="ghost" id="preview-rem">Preview today’s pop-up</button></p>';
  }
  function bindReminders() {
    $('#f-rem').addEventListener('submit', async function (e) {
      e.preventDefault(); var fd = new FormData(e.target);
      db.reminders.push({ id: uid(), text: fd.get('text').trim(), date: fd.get('date'), done: false }); await save(); render();
    });
    $('#f-set').addEventListener('submit', async function (e) {
      e.preventDefault(); var fd = new FormData(e.target);
      db.settings.currency = fd.get('currency') || '₹'; db.settings.foodBudget = num(fd.get('foodBudget')); db.settings.remindersStart = fd.get('remindersStart') || '';
      db.settings.quietDays = Math.max(1, num(fd.get('quietDays')) || 4); await save(); render();
    });
    $('#preview-rem').onclick = function () { var r = computeReminders(); if (r.length) showReminders(r); else alert('Nothing to remind you about right now.'); };
    $('#view').onclick = async function (e) {
      var d = e.target.dataset.done, x = e.target.dataset.rdel;
      if (d) { var r = db.reminders.find(function (r) { return r.id === d; }); r.done = !r.done; await save(); render(); }
      if (x) { db.reminders = db.reminders.filter(function (r) { return r.id !== x; }); await save(); render(); }
    };
  }

  // ---------- data tab ----------
  function dataHTML() {
    var url = db.settings.sync.url || CFG.LIFE_ENDPOINT || '';
    return '<h2 class="h">Data</h2><div class="grid cols">' +
      '<div class="card"><h3>Google Sheet sync</h3><p class="muted small">Your private sheet is the permanent home of this data. Every change is sent to it, and it is loaded when you unlock. Setup: <code>backend/LIFE-SETUP.md</code>.</p>' +
      '<form id="f-sync" class="grid" style="gap:8px"><input name="url" placeholder="Apps Script web app URL" value="' + esc(url) + '"><input name="token" type="password" placeholder="Secret token (same as in the script)" value="' + esc(db.settings.sync.token) + '" autocomplete="off">' +
      '<div class="row"><button class="btn" type="submit">Connect &amp; sync</button><button class="btn alt" type="button" id="unsync">Disconnect</button></div><span id="sync-status" class="small muted">' + esc(syncMsg) + '</span></form></div>' +
      '<div class="card"><h3>Load your workbook</h3><p class="muted small">Pick <code>Planning_restructured.xlsx</code> (or a .xlsx with Movies, Food and Social sheets using the same headers). New rows are added; rows already here are skipped.</p><input type="file" id="xl" accept=".xlsx,.xls"></div>' +
      '<div class="card"><h3>Encrypted backup</h3><p class="muted small">One encrypted file. Restore it here or on another device with the same password.</p><div class="row"><button class="btn" id="bk">Download backup</button><label class="btn alt" style="cursor:pointer">Restore<input type="file" id="rs" accept=".json" hidden></label></div></div>' +
      '<div class="card"><h3>Export to Excel</h3><p class="muted small">Plain, <strong>unencrypted</strong> workbook in the same layout. Keep it private.</p><button class="btn alt" id="xe">Download .xlsx</button></div>' +
      '<div class="card"><h3>Change password</h3><form id="f-pw" class="grid" style="gap:8px"><input type="password" name="n1" placeholder="New password (8+ chars)" minlength="8" required autocomplete="new-password"><input type="password" name="n2" placeholder="Repeat new password" required autocomplete="new-password"><button class="btn" type="submit">Change</button></form></div>' +
      '<div class="card"><h3>Erase this device</h3><p class="muted small">Deletes the vault from this browser. Your Google Sheet and backups are unaffected.</p><button class="btn alt" id="wipe">Erase vault</button></div></div>';
  }
  function download(name, data, type) { var a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([data], { type: type })); a.download = name; document.body.appendChild(a); a.click(); a.remove(); }
  var xlsxP;
  function loadXLSX() {
    if (window.XLSX) return Promise.resolve();
    return xlsxP || (xlsxP = new Promise(function (res, rej) {
      var s = document.createElement('script'); s.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
      s.onload = res; s.onerror = function () { xlsxP = null; rej(new Error('Could not load the Excel reader (needs internet).')); }; document.head.appendChild(s);
    }));
  }
  function bindData() {
    $('#f-sync').addEventListener('submit', async function (e) {
      e.preventDefault(); var fd = new FormData(e.target), url = fd.get('url').trim();
      db.settings.sync = { url: url === (CFG.LIFE_ENDPOINT || '') ? '' : url, token: fd.get('token').trim() };
      if (!syncCfg()) { setStatus('Enter both the URL and the token.'); return; }
      await persist();
      if (await pullNow(true)) { render(); setStatus(syncMsg); }
    });
    $('#unsync').onclick = async function () { db.settings.sync = { url: '', token: '' }; await save(); setStatus('Disconnected.'); render(); };
    $('#bk').onclick = async function () { download('life-log-backup-' + today() + '.json', JSON.stringify(await seal()), 'application/json'); };
    $('#rs').onchange = async function (e) {
      var f = e.target.files[0]; if (!f) return;
      try {
        var b = JSON.parse(await f.text()), pw = prompt('Password for this backup:'); if (!pw) return;
        var s = b64d(b.s), k = await derive(pw, s), d = normalize(await open(b, k));
        if (!confirm('Replace everything in this browser with the backup (' + count(d) + ' entries)?')) return;
        db = d; salt = s; key = k; await save(); alert('Restored.'); render();
      } catch (x) { alert('Could not restore: wrong password or not a Life Log backup.'); }
    };
    $('#xe').onclick = async function () {
      try { await loadXLSX(); } catch (x) { return alert(x.message); }
      var wb = XLSX.utils.book_new();
      SYNCED.forEach(function (c) {
        var cols = [{ k: 'id', h: 'ID' }].concat(F[c], X[c] || []), src = c === 'food' ? withDerived() : db[c].slice();
        if (['movies', 'food', 'visits', 'payments'].indexOf(c) >= 0) src.sort(function (a, b) { return String(a.date).localeCompare(String(b.date)); });
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(src.map(function (r) { var o = {}; cols.forEach(function (f) { o[f.h] = r[f.k]; }); return o; }), { header: cols.map(function (f) { return f.h; }) }), CATS[c]);
      });
      XLSX.writeFile(wb, 'life-log-' + today() + '.xlsx');
    };
    $('#f-pw').addEventListener('submit', async function (e) {
      e.preventDefault(); var fd = new FormData(e.target);
      if (fd.get('n1') !== fd.get('n2')) return alert('Passwords do not match.');
      salt = crypto.getRandomValues(new Uint8Array(16)); key = await derive(fd.get('n1'), salt); await persist(); e.target.reset(); alert('Password changed. Existing backups still use the old password.');
    });
    $('#wipe').onclick = function () {
      if (confirm('Erase the entire vault from this browser? This cannot be undone.') && prompt('Type ERASE to confirm') === 'ERASE') { localStorage.removeItem(STORE); location.reload(); }
    };
    $('#xl').onchange = async function (e) {
      var f = e.target.files[0]; if (!f) return;
      try { await loadXLSX(); var wb = XLSX.read(await f.arrayBuffer(), { type: 'array', cellDates: true }); await importWorkbook(wb); }
      catch (x) { alert('Could not read file: ' + x.message); }
      e.target.value = '';
    };
  }

  // ----- workbook import (exact headers from the restructured file) -----
  function normH(h) { return String(h).toLowerCase().replace(/\s+/g, ' ').trim(); }
  function cell(v, f) {
    if (v == null || v === '') return '';
    if (v instanceof Date) { var d = new Date(v.getTime() + 12 * 36e5); return ymd(new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())); }
    if (f.t === 'date') { var t = new Date(v); return isNaN(t) ? String(v) : ymd(t); }
    if (f.t === 'n') return numOrBlank(v);
    return String(v).trim();
  }
  function sig(c, r) { return (c === 'food' ? ['date', 'place', 'category', 'subcategory', 'amount'] : c === 'movies' ? ['date', 'name'] : c === 'visits' ? ['id'] : c === 'payments' ? ['date', 'payee', 'total', 'for', 'movieId', 'foodId'] : ['name']).map(function (k) { return String(r[k]).toLowerCase(); }).join('|'); }
  async function importWorkbook(wb) {
    var added = { movies: 0, food: 0, social: 0, visits: 0, payments: 0, places: 0 }, skipped = 0, missing = [], vmap = {};
    SYNCED.forEach(function (c) {
      var name = wb.SheetNames.filter(function (n) { return n.toLowerCase().trim() === CATS[c].toLowerCase(); })[0];
      if (!name) { if (['movies', 'food', 'social'].indexOf(c) >= 0) missing.push(CATS[c]); return; }
      var rows = XLSX.utils.sheet_to_json(wb.Sheets[name], { header: 1, raw: true, defval: '' });
      var head = (rows.shift() || []).map(normH), cols = [{ k: 'id', h: 'ID' }].concat(F[c], X[c] || []), idx = {};
      cols.forEach(function (f) { var i = head.indexOf(normH(f.h)); if (i >= 0) idx[f.k] = i; });
      var seen = {}, eidMap = {}; db[c].forEach(function (r) { seen[sig(c, r)] = 1; });
      rows.forEach(function (row) {
        if (!row.some(function (v) { return v !== '' && v != null; })) return;   // pre-formatted blank rows in a template
        var r = {}; cols.forEach(function (f) { r[f.k] = idx[f.k] != null ? cell(row[idx[f.k]], f) : ''; });
        var fileId = r.id; r.id = fileId && !db[c].some(function (x) { return x.id === fileId; }) ? fileId : (c === 'visits' ? nextId('V', db.visits) : c === 'payments' ? nextId('P', db.payments) : uid());
        if (c === 'visits' && fileId && fileId !== r.id) vmap[fileId] = r.id;
        if (r.visitId && vmap[r.visitId]) r.visitId = vmap[r.visitId];
        if (!F[c].filter(function (f) { return f.req; }).every(function (f) { return r[f.k] !== ''; })) return;
        if (c === 'food') { var old = r.entryId || r.id; eidMap[old] = eidMap[old] || uid(); r.entryId = eidMap[old]; if (!r.foodType) r.foodType = guessFoodType(r.category); }
        if (c === 'social' && !r.every) r.every = 30;
        var g = sig(c, r); if (seen[g]) { skipped++; return; } seen[g] = 1; db[c].push(r); added[c]++;
      });
    });
    if (added.social && !db.settings.remindersStart) db.settings.remindersStart = addDays(today(), 1);
    await save(); render();
    alert('Added ' + added.movies + ' movies/shows, ' + added.food + ' food items, ' + added.social + ' people' + (added.visits || added.payments ? ', ' + added.visits + ' visits, ' + added.payments + ' payments' : '') + (skipped ? ' (' + skipped + ' already here, skipped)' : '') + '.' + (missing.length ? '\nNo sheet named: ' + missing.join(', ') + '.' : '') + (added.social ? '\nSocial reminders start tomorrow (change in Reminders).' : ''));
  }

  initLock();
})();
