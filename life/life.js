// Life Log: a private, password-gated tracker. No server: data is encrypted (AES-GCM, key from
// PBKDF2) and stored in this browser's localStorage. The page's code is public; the data never is.
(function () {
  'use strict';

  var STORE = 'lifelog_vault_v1';
  var ITER = 250000;
  var IDLE_MS = 10 * 60 * 1000;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var enc = new TextEncoder(), dec = new TextDecoder();

  // ---------- helpers ----------
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function uid() { return Math.random().toString(36).slice(2, 10) + Date.now().toString(36); }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function ymd(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function today() { return ymd(new Date()); }
  function parseD(s) { var p = String(s).split('-'); return new Date(+p[0], +p[1] - 1, +p[2]); }
  function daysAgo(s) { return Math.floor((parseD(today()) - parseD(s)) / 864e5); }
  function num(v) { var n = parseFloat(String(v == null ? '' : v).replace(/[^0-9.\-]/g, '')); return isNaN(n) ? 0 : n; }
  function money(n) { return (db.settings.currency || '₹') + Math.round(n).toLocaleString('en-IN'); }
  function mkey(s) { return String(s).slice(0, 7); }
  function mlabel(k) { return ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][+k.slice(5) - 1]; }
  function lastMonths(n) { var out = [], d = new Date(); d.setDate(1); for (var i = n - 1; i >= 0; i--) { var x = new Date(d.getFullYear(), d.getMonth() - i, 1); out.push(x.getFullYear() + '-' + pad(x.getMonth() + 1)); } return out; }
  function b64e(buf) { var b = new Uint8Array(buf), s = ''; for (var i = 0; i < b.length; i++) s += String.fromCharCode(b[i]); return btoa(s); }
  function b64d(s) { var r = atob(s), b = new Uint8Array(r.length); for (var i = 0; i < r.length; i++) b[i] = r.charCodeAt(i); return b; }
  function tally(rows, keyFn, valFn) {
    var m = {}; rows.forEach(function (r) { var k = keyFn(r); if (!k) return; m[k] = m[k] || { k: k, n: 0, v: 0 }; m[k].n++; m[k].v += valFn ? valFn(r) : 0; });
    return Object.keys(m).map(function (k) { return m[k]; });
  }

  // ---------- data model ----------
  var CATS = {
    movies: {
      label: 'Movies', sort: 'date',
      fields: [
        { k: 'title', l: 'Title', req: 1 }, { k: 'date', l: 'Watched on', t: 'date' },
        { k: 'rating', l: 'Rating (0-10)', t: 'number', step: '0.5', n: 1 }, { k: 'genre', l: 'Genre' },
        { k: 'where', l: 'Where (theatre / OTT)' }, { k: 'with', l: 'With' }, { k: 'notes', l: 'Notes', wide: 1 }
      ]
    },
    food: {
      label: 'Food', sort: 'date',
      fields: [
        { k: 'date', l: 'Date', t: 'date' }, { k: 'meal', l: 'Meal', opts: ['Breakfast', 'Lunch', 'Dinner', 'Snack', 'Drinks / Dessert'] },
        { k: 'item', l: 'What you ate', req: 1 }, { k: 'place', l: 'Place' },
        { k: 'cost', l: 'Cost', t: 'number', step: '1', n: 1 }, { k: 'rating', l: 'Rating (1-5)', t: 'number', step: '0.5', n: 1 },
        { k: 'with', l: 'With' }, { k: 'notes', l: 'Notes', wide: 1 }
      ]
    },
    social: {
      label: 'Social', sort: 'date',
      fields: [
        { k: 'date', l: 'Date', t: 'date' }, { k: 'friend', l: 'Friend(s)', req: 1 },
        { k: 'activity', l: 'What you did' }, { k: 'place', l: 'Place' },
        { k: 'spent', l: 'Spent', t: 'number', step: '1', n: 1 }, { k: 'notes', l: 'Notes', wide: 1 }
      ]
    }
  };
  var db = null, key = null, salt = null, tab = 'dash', editing = {}, search = {}, showAll = {};

  function blank() { return { v: 1, movies: [], food: [], social: [], reminders: [], settings: { currency: '₹', foodBudget: 0, friendDays: 30, quietDays: 4, sync: { url: '', token: '' } } }; }

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
  async function save() { localStorage.setItem(STORE, JSON.stringify(await seal())); queuePush(); }

  // ---------- Google Sheet sync (via Apps Script, see backend/LIFE-SETUP.md) ----------
  var SYNC_KEYS = ['movies', 'food', 'social', 'reminders'];
  var pushT, syncMsg = '';
  function syncCfg() { var c = db && db.settings.sync; return c && c.url && c.token ? c : null; }
  function setStatus(m) { syncMsg = m; var el = $('#sync-status'); if (el) el.textContent = m; var chip = $('#sync-chip'); if (chip) chip.textContent = syncCfg() ? m : ''; }
  async function call(action, data) {
    var c = syncCfg();
    var r = await fetch(c.url, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ token: c.token, action: action, data: data }) });
    var j = await r.json(); if (!j.ok) throw new Error(j.error || 'sync failed'); return j;
  }
  function queuePush() { if (!syncCfg()) return; clearTimeout(pushT); setStatus('Saving to sheet…'); pushT = setTimeout(pushNow, 1200); }
  async function pushNow() {
    try { var d = {}; SYNC_KEYS.forEach(function (k) { d[k] = db[k]; }); await call('push', d); setStatus('Synced ' + new Date().toLocaleTimeString()); }
    catch (e) { setStatus('Sheet sync failed (saved locally): ' + e.message); }
  }
  function adopt(remote) {
    var cols = { movies: CATS.movies.fields, food: CATS.food.fields, social: CATS.social.fields };
    SYNC_KEYS.forEach(function (k) {
      db[k] = (remote[k] || []).map(function (r) {
        var o = { id: String(r.id || '') || uid() };
        if (k === 'reminders') { o.text = String(r.text || ''); o.date = String(r.date || ''); o.done = r.done === true || String(r.done).toLowerCase() === 'true'; return o; }
        cols[k].forEach(function (f) { var v = r[f.k]; o[f.k] = f.n ? (v === '' || v == null ? '' : num(v)) : (v == null ? '' : String(v).trim()); });
        return o;
      });
    });
  }
  function count(o) { return SYNC_KEYS.reduce(function (a, k) { return a + (o[k] || []).length; }, 0); }
  async function pullNow(first) {
    try {
      setStatus('Loading from sheet…'); var remote = (await call('pull')).data;
      if (first && count(remote) === 0) { await pushNow(); return true; }
      if (first && count(db) > 0 && count(remote) > 0 && !confirm('The sheet has ' + count(remote) + ' entries and this browser has ' + count(db) + '.\n\nOK = use the sheet (replaces this browser’s copy)\nCancel = overwrite the sheet with this browser’s data')) { await pushNow(); return true; }
      adopt(remote); await localStorage.setItem(STORE, JSON.stringify(await seal())); setStatus('Synced ' + new Date().toLocaleTimeString()); return true;
    } catch (e) { setStatus('Sheet unreachable, using local copy: ' + e.message); return false; }
  }
  function readBlob() { try { return JSON.parse(localStorage.getItem(STORE)); } catch (e) { return null; } }

  // ---------- lock screen ----------
  var blob = readBlob();
  function initLock() {
    var first = !blob;
    $('#lock-sub').textContent = first ? 'First time here. Choose a password to create your private vault.' : 'Enter your password.';
    $('#lock-btn').textContent = first ? 'Create vault' : 'Unlock';
    $('#pw2').hidden = !first; $('#pw2').required = first;
    $('#pw').autocomplete = first ? 'new-password' : 'current-password';
    $('#lock-note').textContent = first ? 'There is no reset: if the password is lost, the data cannot be recovered. Use Data → Backup regularly.' : '';
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
        key = await derive(pw, salt); db = blank(); await save(); blob = readBlob();
      } else {
        salt = b64d(blob.s); key = await derive(pw, salt);
        try { db = await open(blob, key); } catch (x) {
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

  $('#tabs').addEventListener('click', function (e) {
    var b = e.target.closest('button'); if (!b) return;
    tab = b.dataset.tab; render();
  });

  // ---------- rendering ----------
  function render() {
    document.querySelectorAll('#tabs button').forEach(function (b) { b.classList.toggle('on', b.dataset.tab === tab); });
    var v = $('#view');
    if (tab === 'dash') v.innerHTML = dashHTML();
    else if (CATS[tab]) { v.innerHTML = listHTML(tab); bindList(tab); }
    else if (tab === 'reminders') { v.innerHTML = remindersHTML(); bindReminders(); }
    else if (tab === 'data') { v.innerHTML = dataHTML(); bindData(); }
  }
  function rerenderKeepFocus() { render(); }

  // ----- generic list tab -----
  function sorted(cat) {
    return db[cat].slice().sort(function (a, b) { return String(b.date || '').localeCompare(String(a.date || '')); });
  }
  function listHTML(cat) {
    var c = CATS[cat], ed = editing[cat] && db[cat].find(function (r) { return r.id === editing[cat]; }) || {};
    var q = (search[cat] || '').toLowerCase();
    var rows = sorted(cat).filter(function (r) { return !q || JSON.stringify(r).toLowerCase().indexOf(q) >= 0; });
    var total = rows.length; if (!showAll[cat]) rows = rows.slice(0, 200);
    var form = '<form id="f-' + cat + '" class="form card">' + c.fields.map(function (f) {
      var val = ed[f.k] != null ? ed[f.k] : (f.t === 'date' ? today() : '');
      var inp = f.opts
        ? '<select name="' + f.k + '"><option value="">-</option>' + f.opts.map(function (o) { return '<option' + (o === val ? ' selected' : '') + '>' + esc(o) + '</option>'; }).join('') + '</select>'
        : '<input name="' + f.k + '" type="' + (f.t || 'text') + '"' + (f.step ? ' step="' + f.step + '"' : '') + (f.req ? ' required' : '') + ' value="' + esc(val) + '"' + (f.k === 'friend' ? ' list="friends-dl"' : '') + '>';
      return '<label' + (f.wide ? ' class="wide"' : '') + '>' + esc(f.l) + inp + '</label>';
    }).join('') + '<div class="row wide"><button class="btn" type="submit">' + (ed.id ? 'Save changes' : 'Add ' + c.label.toLowerCase() + ' entry') + '</button>' +
      (ed.id ? '<button class="btn alt" type="button" id="cancel-' + cat + '">Cancel</button>' : '') + '</div></form>' +
      (cat === 'social' ? '<datalist id="friends-dl">' + friendNames().map(function (n) { return '<option value="' + esc(n) + '">'; }).join('') + '</datalist>' : '');
    var head = c.fields.filter(function (f) { return !f.wide; });
    var table = rows.length ? '<div class="tbl card"><table><thead><tr>' + head.map(function (f) { return '<th>' + esc(f.l.replace(/ \(.*\)/, '')) + '</th>'; }).join('') + '<th>Notes</th><th></th></tr></thead><tbody>' +
      rows.map(function (r) {
        return '<tr>' + head.map(function (f) { return '<td' + (f.n ? ' class="n"' : '') + '>' + (f.k === 'cost' || f.k === 'spent' ? (r[f.k] ? money(num(r[f.k])) : '') : esc(r[f.k])) + '</td>'; }).join('') +
          '<td>' + esc(r.notes) + '</td><td class="act"><button class="link" data-edit="' + r.id + '">Edit</button><button class="link del" data-del="' + r.id + '">Delete</button></td></tr>';
      }).join('') + '</tbody></table></div>' +
      (total > rows.length ? '<p><button class="ghost" id="more-' + cat + '">Show all ' + total + '</button></p>' : '')
      : '<p class="empty">Nothing here yet. Add an entry above or import your Excel file from the Data tab.</p>';
    return '<h2 style="margin-bottom:12px">' + c.label + ' <span class="muted small">' + db[cat].length + ' entries</span></h2>' + form +
      '<div class="bar-tools"><input type="search" id="q-' + cat + '" placeholder="Search…" value="' + esc(search[cat] || '') + '"></div>' + table;
  }
  function bindList(cat) {
    var c = CATS[cat];
    $('#f-' + cat).addEventListener('submit', async function (e) {
      e.preventDefault();
      var fd = new FormData(e.target), r = editing[cat] ? db[cat].find(function (x) { return x.id === editing[cat]; }) : { id: uid() };
      c.fields.forEach(function (f) { var v = (fd.get(f.k) || '').toString().trim(); r[f.k] = f.n ? (v === '' ? '' : num(v)) : v; });
      if (!editing[cat]) db[cat].push(r);
      editing[cat] = null; await save(); render();
    });
    var cancel = $('#cancel-' + cat); if (cancel) cancel.onclick = function () { editing[cat] = null; render(); };
    var more = $('#more-' + cat); if (more) more.onclick = function () { showAll[cat] = true; render(); };
    $('#q-' + cat).addEventListener('input', function (e) {
      search[cat] = e.target.value; var pos = e.target.selectionStart; render();
      var q = $('#q-' + cat); q.focus(); q.setSelectionRange(pos, pos);
    });
    $('#view').onclick = async function (e) {
      var ed = e.target.dataset.edit, del = e.target.dataset.del;
      if (ed) { editing[cat] = ed; render(); window.scrollTo(0, 0); }
      if (del && confirm('Delete this entry?')) { db[cat] = db[cat].filter(function (r) { return r.id !== del; }); await save(); render(); }
    };
  }

  // ---------- analytics ----------
  function friendNames() {
    var s = {}; db.social.forEach(function (r) { splitNames(r.friend).forEach(function (n) { s[n] = 1; }); });
    return Object.keys(s).sort();
  }
  function splitNames(s) { return String(s || '').split(/[,&;]| and /i).map(function (x) { return x.trim(); }).filter(Boolean); }
  function lastMet() {
    var m = {}; db.social.forEach(function (r) { if (!r.date) return; splitNames(r.friend).forEach(function (n) { var k = n.toLowerCase(); if (!m[k] || r.date > m[k].date) m[k] = { name: n, date: r.date }; }); });
    return Object.keys(m).map(function (k) { return m[k]; });
  }
  function foodByMonth() { var m = {}; db.food.forEach(function (r) { if (r.date) m[mkey(r.date)] = (m[mkey(r.date)] || 0) + num(r.cost); }); return m; }

  function bars(items, fmt) {
    var max = Math.max.apply(null, items.map(function (i) { return i.v; }).concat([1]));
    return '<div class="chart">' + items.map(function (i) {
      return '<div class="bar"><b>' + (i.v ? esc(fmt ? fmt(i.v) : i.v) : '') + '</b><i style="height:' + Math.max(2, i.v / max * 100) + '%" title="' + esc(i.l + ': ' + (fmt ? fmt(i.v) : i.v)) + '"></i><span>' + esc(i.l) + '</span></div>';
    }).join('') + '</div>';
  }
  function list(items, none) {
    return items.length ? '<ul class="plain">' + items.map(function (i) { return '<li><span>' + esc(i[0]) + '</span><span class="muted">' + esc(i[1]) + '</span></li>'; }).join('') + '</ul>' : '<p class="empty">' + none + '</p>';
  }
  function short(n) { return n >= 1000 ? (Math.round(n / 100) / 10) + 'k' : String(Math.round(n)); }

  function dashHTML() {
    var months = lastMonths(12), fm = foodByMonth(), now = months[11], prev = months[10], year = now.slice(0, 4);
    var spendNow = fm[now] || 0, spendPrev = fm[prev] || 0;
    var delta = spendPrev ? Math.round((spendNow - spendPrev) / spendPrev * 100) : null;
    var moviesYear = db.movies.filter(function (r) { return String(r.date).slice(0, 4) === year; });
    var rated = db.movies.filter(function (r) { return r.rating !== '' && r.rating != null; });
    var avgR = rated.length ? (rated.reduce(function (a, r) { return a + num(r.rating); }, 0) / rated.length).toFixed(1) : '-';
    var metNow = {}; db.social.forEach(function (r) { if (mkey(r.date) === now) splitNames(r.friend).forEach(function (n) { metNow[n.toLowerCase()] = 1; }); });
    var foodMonthRows = db.food.filter(function (r) { return mkey(r.date) === now; });
    var socialSpend = db.social.filter(function (r) { return mkey(r.date) === now; }).reduce(function (a, r) { return a + num(r.spent); }, 0);

    var tiles = [
      ['Food spend, ' + mlabel(now), money(spendNow), delta == null ? foodMonthRows.length + ' meals logged' : '<span class="' + (delta > 0 ? 'up' : 'down') + '">' + (delta > 0 ? '▲' : '▼') + ' ' + Math.abs(delta) + '% vs ' + mlabel(prev) + '</span>'],
      ['Avg per meal', foodMonthRows.length ? money(spendNow / foodMonthRows.length) : '-', 'this month'],
      ['Movies in ' + year, moviesYear.length, 'avg rating ' + avgR + ' (all time)'],
      ['Friends met, ' + mlabel(now), Object.keys(metNow).length, socialSpend ? money(socialSpend) + ' spent' : 'this month']
    ].map(function (t) { return '<div class="card tile"><div class="k">' + t[0] + '</div><div class="v">' + t[1] + '</div><div class="s">' + t[2] + '</div></div>'; }).join('');

    var topPlaces = tally(db.food, function (r) { return r.place; }, function (r) { return num(r.cost); }).sort(function (a, b) { return b.v - a.v; }).slice(0, 6)
      .map(function (p) { return [p.k, p.n + ' visits · ' + money(p.v)]; });
    var meals = tally(db.food, function (r) { return r.meal; }, function (r) { return num(r.cost); }).sort(function (a, b) { return b.v - a.v; })
      .map(function (p) { return [p.k, p.n + ' · ' + money(p.v) + (p.n ? ' (avg ' + money(p.v / p.n) + ')' : '')]; });
    var cut = daysAgoDate(90);
    var topFriends = tally(db.social.filter(function (r) { return r.date >= cut; }).reduce(function (a, r) { splitNames(r.friend).forEach(function (n) { a.push({ n: n }); }); return a; }, []), function (r) { return r.n; })
      .sort(function (a, b) { return b.n - a.n; }).slice(0, 6).map(function (p) { return [p.k, p.n + ' meetups']; });
    var genres = tally(db.movies, function (r) { return r.genre; }).sort(function (a, b) { return b.n - a.n; }).slice(0, 5).map(function (p) { return [p.k, p.n + ' films']; });
    var best = rated.slice().sort(function (a, b) { return num(b.rating) - num(a.rating); }).slice(0, 5).map(function (r) { return [r.title, '★ ' + r.rating]; });
    var dow = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(function (l) { return { l: l, v: 0 }; });
    db.food.forEach(function (r) { if (r.date) dow[parseD(r.date).getDay()].v += num(r.cost); });

    var ins = insights().map(function (t) { return '<div class="insight">' + esc(t) + '</div>'; }).join('') || '<p class="empty">Add more entries and insights will show up here.</p>';

    return '<div class="grid tiles">' + tiles + '</div>' +
      '<div class="grid cols">' +
      '<div class="card"><h3>Food spend, last 12 months</h3>' + bars(months.map(function (m) { return { l: mlabel(m), v: fm[m] || 0 }; }), short) + '</div>' +
      '<div class="card"><h3>Movies watched, last 12 months</h3>' + bars(months.map(function (m) { return { l: mlabel(m), v: db.movies.filter(function (r) { return mkey(r.date) === m; }).length }; })) + '</div>' +
      '<div class="card"><h3>Food spend by weekday</h3>' + bars(dow, short) + '</div>' +
      '<div class="card"><h3>Insights</h3><div class="grid" style="gap:8px">' + ins + '</div></div>' +
      '<div class="card"><h3>Top places by spend</h3>' + list(topPlaces, 'No food entries yet.') + '</div>' +
      '<div class="card"><h3>Spend by meal type</h3>' + list(meals, 'No food entries yet.') + '</div>' +
      '<div class="card"><h3>Most seen friends (90 days)</h3>' + list(topFriends, 'No social entries yet.') + '</div>' +
      '<div class="card"><h3>Favourite genres</h3>' + list(genres, 'Add genres to your movies.') + '</div>' +
      '<div class="card"><h3>Top rated movies</h3>' + list(best, 'No rated movies yet.') + '</div>' +
      '</div>';
  }
  function daysAgoDate(n) { var d = new Date(); d.setDate(d.getDate() - n); return ymd(d); }

  function insights() {
    var out = [], months = lastMonths(12), fm = foodByMonth(), now = months[11];
    var vals = months.slice(0, 11).map(function (m) { return fm[m] || 0; }).filter(Boolean);
    if (vals.length >= 3) {
      var avg = vals.reduce(function (a, b) { return a + b; }, 0) / vals.length, d = new Date(), dim = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
      var proj = (fm[now] || 0) / d.getDate() * dim;
      if (fm[now]) out.push('At this pace you will spend about ' + money(proj) + ' on food this month; your usual month is ' + money(avg) + '.');
    }
    var top = Object.keys(fm).sort(function (a, b) { return fm[b] - fm[a]; })[0];
    if (top) out.push('Your priciest food month was ' + mlabel(top) + ' ' + top.slice(0, 4) + ' at ' + money(fm[top]) + '.');
    var inc = db.food.filter(function (r) { return r.with; }), solo = db.food.filter(function (r) { return !r.with && num(r.cost); });
    if (inc.length >= 5 && solo.length >= 5) {
      var a1 = inc.reduce(function (a, r) { return a + num(r.cost); }, 0) / inc.length, a2 = solo.reduce(function (a, r) { return a + num(r.cost); }, 0) / solo.length;
      out.push('Meals with company cost ' + money(a1) + ' on average vs ' + money(a2) + ' when eating solo.');
    }
    var places = tally(db.food, function (r) { return r.place; }).sort(function (a, b) { return b.n - a.n; })[0];
    if (places && places.n >= 3) out.push('Your most visited place is ' + places.k + ' (' + places.n + ' times).');
    var yr = db.movies.filter(function (r) { return mkey(r.date) >= months[0]; }).length;
    if (db.movies.length) out.push('You watched ' + yr + ' movies in the last 12 months.');
    var sp = tally(db.social, function (r) { return mkey(r.date); }, function (r) { return num(r.spent); });
    var best = sp.sort(function (a, b) { return b.n - a.n; })[0];
    if (best && db.social.length >= 5) out.push('Your most social month was ' + mlabel(best.k) + ' ' + best.k.slice(0, 4) + ' with ' + best.n + ' meetups.');
    return out;
  }

  // ---------- reminders ----------
  function computeReminders() {
    var out = [], s = db.settings, t = today();
    // custom reminders due
    db.reminders.forEach(function (r) { if (!r.done && r.date && r.date <= t) out.push({ w: r.date < t, h: r.text, s: r.date < t ? 'Overdue since ' + r.date : 'Due today' }); });
    // friends overdue
    var overdue = lastMet().map(function (f) { return { name: f.name, d: daysAgo(f.date) }; })
      .filter(function (f) { return f.d >= (s.friendDays || 30); }).sort(function (a, b) { return b.d - a.d; });
    overdue.slice(0, 4).forEach(function (f) { out.push({ h: 'Catch up with ' + f.name, s: 'Last met ' + f.d + ' days ago' }); });
    if (overdue.length > 4) out.push({ h: overdue.length - 4 + ' more friends are due a catch-up', s: 'See the Social tab' });
    // food budget / pace
    var fm = foodByMonth(), now = lastMonths(1)[0], spent = fm[now] || 0;
    if (s.foodBudget > 0 && spent) {
      var pct = Math.round(spent / s.foodBudget * 100);
      if (pct >= 100) out.push({ w: 1, h: 'Food budget exceeded', s: money(spent) + ' spent of ' + money(s.foodBudget) + ' this month (' + pct + '%)' });
      else if (pct >= 80) out.push({ w: 1, h: 'Food budget at ' + pct + '%', s: money(spent) + ' of ' + money(s.foodBudget) + ' used this month' });
    }
    // gap in logging
    var all = [].concat(db.movies, db.food, db.social).map(function (r) { return r.date; }).filter(Boolean).sort();
    if (all.length) { var last = all[all.length - 1], gap = daysAgo(last); if (gap >= (s.quietDays || 4)) out.push({ h: 'Nothing logged for ' + gap + ' days', s: 'Last entry: ' + last }); }
    return out;
  }
  function showReminders(rem) {
    $('#modal-card').innerHTML = '<h2>Heads up</h2>' + rem.map(function (r) { return '<div class="rem' + (r.w ? ' warn' : '') + '"><strong>' + esc(r.h) + '</strong><small>' + esc(r.s) + '</small></div>'; }).join('') +
      '<button class="btn" id="modal-ok">Got it</button>';
    $('#modal').hidden = false; $('#modal-ok').onclick = closeModal;
  }
  function closeModal() { $('#modal').hidden = true; }
  $('#modal').addEventListener('click', function (e) { if (e.target.id === 'modal') closeModal(); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeModal(); });

  function remindersHTML() {
    var s = db.settings, rows = db.reminders.slice().sort(function (a, b) { return String(a.date).localeCompare(String(b.date)); });
    return '<h2 style="margin-bottom:12px">Reminders</h2>' +
      '<form id="f-rem" class="form card"><label class="wide">Reminder<input name="text" required placeholder="e.g. Call Rahul about the trip"></label><label>Date<input name="date" type="date" value="' + today() + '" required></label>' +
      '<div><button class="btn" type="submit">Add reminder</button></div></form>' +
      (rows.length ? '<div class="card"><ul class="plain">' + rows.map(function (r) {
        return '<li><span' + (r.done ? ' style="text-decoration:line-through;opacity:.6"' : '') + '>' + esc(r.text) + ' <span class="muted small">' + esc(r.date) + '</span></span><span><button class="link" data-done="' + r.id + '">' + (r.done ? 'Undo' : 'Done') + '</button><button class="link del" data-rdel="' + r.id + '">Delete</button></span></li>';
      }).join('') + '</ul></div>' : '<p class="empty">No custom reminders.</p>') +
      '<h3 style="margin:22px 0 10px">Automatic reminders</h3><form id="f-set" class="form card">' +
      '<label>Currency symbol<input name="currency" value="' + esc(s.currency) + '"></label>' +
      '<label>Monthly food budget (0 = off)<input name="foodBudget" type="number" min="0" value="' + (s.foodBudget || 0) + '"></label>' +
      '<label>Nudge to meet friends after (days)<input name="friendDays" type="number" min="1" value="' + (s.friendDays || 30) + '"></label>' +
      '<label>Nudge to log after (quiet days)<input name="quietDays" type="number" min="1" value="' + (s.quietDays || 4) + '"></label>' +
      '<div><button class="btn" type="submit">Save settings</button></div></form>' +
      '<p class="muted small">These pop up each time you unlock the page: overdue friends, food budget at 80% / over, a gap in logging, and your own dated reminders.</p>' +
      '<p><button class="ghost" id="preview-rem">Preview today’s pop-up</button></p>';
  }
  function bindReminders() {
    $('#f-rem').addEventListener('submit', async function (e) {
      e.preventDefault(); var fd = new FormData(e.target);
      db.reminders.push({ id: uid(), text: fd.get('text').trim(), date: fd.get('date'), done: false }); await save(); render();
    });
    $('#f-set').addEventListener('submit', async function (e) {
      e.preventDefault(); var fd = new FormData(e.target);
      db.settings.currency = fd.get('currency') || '₹'; db.settings.foodBudget = num(fd.get('foodBudget'));
      db.settings.friendDays = Math.max(1, num(fd.get('friendDays')) || 30); db.settings.quietDays = Math.max(1, num(fd.get('quietDays')) || 4);
      await save(); render();
    });
    $('#preview-rem').onclick = function () { var r = computeReminders(); if (r.length) showReminders(r); else alert('Nothing to remind you about right now.'); };
    $('#view').onclick = async function (e) {
      var d = e.target.dataset.done, x = e.target.dataset.rdel;
      if (d) { var r = db.reminders.find(function (r) { return r.id === d; }); r.done = !r.done; await save(); render(); }
      if (x) { db.reminders = db.reminders.filter(function (r) { return r.id !== x; }); await save(); render(); }
    };
  }

  // ---------- data tab: backup, restore, Excel import/export, password ----------
  function dataHTML() {
    return '<h2 style="margin-bottom:12px">Data</h2><div class="grid cols">' +
      '<div class="card"><h3>Import from Excel</h3><p class="muted small">Pick your .xlsx / .csv. Each sheet is matched to Movies, Food or Social by its name and column headers. You can review before anything is added.</p><input type="file" id="xl" accept=".xlsx,.xls,.csv"></div>' +
      '<div class="card"><h3>Google Sheet sync</h3><p class="muted small">Keeps a Google Sheet in your account up to date on every change, and loads it each time you unlock. Setup: <code>backend/LIFE-SETUP.md</code>.</p><form id="f-sync" class="grid" style="gap:8px"><input name="url" placeholder="Apps Script web app URL" value="' + esc(db.settings.sync.url) + '"><input name="token" type="password" placeholder="Token" value="' + esc(db.settings.sync.token) + '" autocomplete="off"><div class="row"><button class="btn" type="submit">Connect &amp; sync</button><button class="btn alt" type="button" id="unsync">Disconnect</button></div><span id="sync-status" class="small muted">' + esc(syncMsg) + '</span></form></div>' +
      '<div class="card"><h3>Encrypted backup</h3><p class="muted small">Downloads one encrypted file. Restore it here, or on another device, with the same password. Do this regularly: the data lives only in this browser.</p><div class="row"><button class="btn" id="bk">Download backup</button><label class="btn alt" style="cursor:pointer">Restore<input type="file" id="rs" accept=".json" hidden></label></div></div>' +
      '<div class="card"><h3>Export to Excel</h3><p class="muted small">Plain, <strong>unencrypted</strong> workbook. Keep it somewhere private.</p><button class="btn alt" id="xe">Download .xlsx</button></div>' +
      '<div class="card"><h3>Change password</h3><form id="f-pw" class="grid" style="gap:8px"><input type="password" name="n1" placeholder="New password (8+ chars)" minlength="8" required autocomplete="new-password"><input type="password" name="n2" placeholder="Repeat new password" required autocomplete="new-password"><button class="btn" type="submit">Change</button></form></div>' +
      '<div class="card"><h3>Erase everything</h3><p class="muted small">Deletes the vault from this browser. Backups are unaffected.</p><button class="btn alt" id="wipe">Erase vault</button></div>' +
      '</div>';
  }
  function download(name, data, type) {
    var a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([data], { type: type })); a.download = name; document.body.appendChild(a); a.click(); a.remove();
  }
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
      e.preventDefault(); var fd = new FormData(e.target);
      db.settings.sync = { url: fd.get('url').trim(), token: fd.get('token').trim() };
      await localStorage.setItem(STORE, JSON.stringify(await seal()));
      if (await pullNow(true)) { await localStorage.setItem(STORE, JSON.stringify(await seal())); render(); setStatus(syncMsg); }
    });
    $('#unsync').onclick = async function () { db.settings.sync = { url: '', token: '' }; await save(); setStatus('Disconnected.'); render(); };
    $('#bk').onclick = async function () { download('life-log-backup-' + today() + '.json', JSON.stringify(await seal()), 'application/json'); };
    $('#rs').onchange = async function (e) {
      var f = e.target.files[0]; if (!f) return;
      try {
        var b = JSON.parse(await f.text()), pw = prompt('Password for this backup:'); if (!pw) return;
        var s = b64d(b.s), k = await derive(pw, s), d = await open(b, k);
        if (!confirm('Replace everything in this browser with the backup (' + (d.movies.length + d.food.length + d.social.length) + ' entries)?')) return;
        db = d; salt = s; key = k; await save(); alert('Restored.'); render();
      } catch (x) { alert('Could not restore: wrong password or not a Life Log backup.'); }
    };
    $('#xe').onclick = async function () {
      try { await loadXLSX(); } catch (x) { return alert(x.message); }
      var wb = XLSX.utils.book_new();
      Object.keys(CATS).forEach(function (c) {
        var cols = CATS[c].fields.map(function (f) { return f.k; });
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(sorted(c).map(function (r) { var o = {}; cols.forEach(function (k) { o[k] = r[k]; }); return o; }), { header: cols }), CATS[c].label);
      });
      XLSX.writeFile(wb, 'life-log-' + today() + '.xlsx');
    };
    $('#f-pw').addEventListener('submit', async function (e) {
      e.preventDefault(); var fd = new FormData(e.target);
      if (fd.get('n1') !== fd.get('n2')) return alert('Passwords do not match.');
      salt = crypto.getRandomValues(new Uint8Array(16)); key = await derive(fd.get('n1'), salt); await save(); e.target.reset(); alert('Password changed. Existing backups still use the old password.');
    });
    $('#wipe').onclick = function () {
      if (confirm('Erase the entire vault from this browser? This cannot be undone.') && prompt('Type ERASE to confirm') === 'ERASE') { localStorage.removeItem(STORE); location.reload(); }
    };
    $('#xl').onchange = async function (e) {
      var f = e.target.files[0]; if (!f) return;
      try { await loadXLSX(); var wb = XLSX.read(await f.arrayBuffer(), { type: 'array', cellDates: true }); importPreview(wb); }
      catch (x) { alert('Could not read file: ' + x.message); }
      e.target.value = '';
    };
  }

  // ----- Excel mapping -----
  var SYN = {
    movies: { title: ['title', 'movie', 'film', 'name', 'movie name'], date: ['date', 'watched on', 'watched', 'seen'], rating: ['rating', 'score', 'stars'], genre: ['genre', 'type', 'category'], where: ['where', 'platform', 'theatre', 'theater', 'ott', 'place', 'venue'], with: ['with', 'with whom', 'company', 'friends'], notes: ['notes', 'remarks', 'comment', 'comments', 'review'] },
    food: { date: ['date', 'day'], meal: ['meal', 'meal type', 'type', 'time'], item: ['item', 'dish', 'food', 'what', 'order', 'description', 'name'], place: ['place', 'restaurant', 'cafe', 'where', 'location', 'vendor', 'outlet'], cost: ['cost', 'amount', 'price', 'spent', 'spend', 'total', 'bill', 'rs', 'inr', 'expense'], rating: ['rating', 'score', 'stars'], with: ['with', 'with whom', 'company', 'friends'], notes: ['notes', 'remarks', 'comment', 'comments'] },
    social: { date: ['date', 'day', 'when'], friend: ['friend', 'friends', 'name', 'person', 'who', 'met', 'with', 'people'], activity: ['activity', 'what', 'event', 'plan', 'occasion', 'type'], place: ['place', 'where', 'location', 'venue'], spent: ['spent', 'cost', 'amount', 'expense', 'spend'], notes: ['notes', 'remarks', 'comment', 'comments'] }
  };
  function norm(h) { return String(h).toLowerCase().replace(/[^a-z0-9₹ ]/g, ' ').replace(/\s+/g, ' ').trim(); }
  function guessCat(name, headers) {
    var n = norm(name), h = headers.map(norm);
    if (/movie|film|cinema|watch/.test(n)) return 'movies';
    if (/food|meal|eat|restaurant|dining|expense|spend|cafe/.test(n)) return 'food';
    if (/social|friend|meet|hang|people|outing/.test(n)) return 'social';
    if (h.some(function (x) { return /^(movie|film|title)/.test(x); })) return 'movies';
    if (h.some(function (x) { return /^(friend|who|people)/.test(x); })) return 'social';
    if (h.some(function (x) { return /^(cost|amount|price|bill|spent|dish|item)/.test(x); })) return 'food';
    return 'skip';
  }
  function mapHeaders(cat, headers) {
    var map = {}, used = {}, syn = SYN[cat];
    Object.keys(syn).forEach(function (field) {
      var hit = headers.findIndex(function (h, i) { return !used[i] && syn[field].indexOf(norm(h)) >= 0; });
      if (hit < 0) hit = headers.findIndex(function (h, i) { return !used[i] && syn[field].some(function (s) { return s.length > 3 && norm(h).indexOf(s) >= 0; }); });
      if (hit >= 0) { map[field] = hit; used[hit] = 1; }
    });
    return map;
  }
  function cell(v, field) {
    if (v == null || v === '') return '';
    if (v instanceof Date) { var d = new Date(v.getTime() + 12 * 36e5); return ymd(new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())); }
    if (field === 'date') { var t = new Date(v); return isNaN(t) ? String(v) : ymd(t); }
    return String(v).trim();
  }
  var pending = [];
  function importPreview(wb) {
    pending = wb.SheetNames.map(function (name) {
      var rows = XLSX.utils.sheet_to_json(wb.Sheets[name], { header: 1, raw: true, defval: '' }).filter(function (r) { return r.some(function (c) { return c !== ''; }); });
      if (rows.length < 2) return null;
      var headers = rows.shift().map(String);
      return { name: name, headers: headers, rows: rows, cat: guessCat(name, headers) };
    }).filter(Boolean);
    if (!pending.length) return alert('No data rows found in that file.');
    paintImport();
  }
  function paintImport() {
    $('#modal-card').innerHTML = '<h2>Review import</h2><p class="muted small">Choose where each sheet goes. Matched columns are shown; anything unmatched is ignored.</p>' +
      pending.map(function (s, i) {
        var map = s.cat === 'skip' ? {} : mapHeaders(s.cat, s.headers), used = Object.keys(map).map(function (f) { return f + ' ← “' + s.headers[map[f]] + '”'; });
        return '<div class="sheetrow"><div class="row"><strong>' + esc(s.name) + '</strong><span class="muted small">' + s.rows.length + ' rows</span><select data-i="' + i + '" style="width:auto"><option value="skip"' + (s.cat === 'skip' ? ' selected' : '') + '>Skip</option>' +
          Object.keys(CATS).map(function (c) { return '<option value="' + c + '"' + (s.cat === c ? ' selected' : '') + '>' + CATS[c].label + '</option>'; }).join('') + '</select></div>' +
          (s.cat !== 'skip' ? '<span class="small muted">' + (used.length ? esc(used.join(' · ')) : 'No columns matched') + '</span>' : '') + '</div>';
      }).join('') + '<div class="row"><button class="btn" id="do-import">Import</button><button class="btn alt" id="cancel-import">Cancel</button></div>';
    $('#modal').hidden = false;
    document.querySelectorAll('#modal-card select').forEach(function (sel) { sel.onchange = function () { pending[+sel.dataset.i].cat = sel.value; paintImport(); }; });
    $('#cancel-import').onclick = closeModal;
    $('#do-import').onclick = async function () {
      var added = 0, dup = 0;
      pending.forEach(function (s) {
        if (s.cat === 'skip') return;
        var map = mapHeaders(s.cat, s.headers), seen = {};
        db[s.cat].forEach(function (r) { seen[sig(s.cat, r)] = 1; });
        s.rows.forEach(function (row) {
          var r = { id: uid() };
          CATS[s.cat].fields.forEach(function (f) { var v = map[f.k] != null ? cell(row[map[f.k]], f.k) : ''; r[f.k] = f.n ? (v === '' ? '' : num(v)) : v; });
          var req = CATS[s.cat].fields.filter(function (f) { return f.req; }).every(function (f) { return r[f.k]; });
          if (!req) return;
          var g = sig(s.cat, r); if (seen[g]) { dup++; return; } seen[g] = 1; db[s.cat].push(r); added++;
        });
      });
      await save(); closeModal(); alert('Imported ' + added + ' entries' + (dup ? ' (' + dup + ' duplicates skipped)' : '') + '.'); render();
    };
  }
  function sig(cat, r) { return CATS[cat].fields.map(function (f) { return String(r[f.k]); }).join('|'); }

  initLock();
})();
