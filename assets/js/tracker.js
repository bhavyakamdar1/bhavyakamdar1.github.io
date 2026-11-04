// Anonymous gameplay tracker: sends small events to the Google Sheet (see backend/SETUP.md).
// Does nothing until SITE_CONFIG.SHEETS_ENDPOINT is set. Never throws into the game.
(function () {
  var cfg = window.SITE_CONFIG || {};
  var ls = function (k, v) {
    try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) {}
    return null;
  };
  var rid = function () { return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4); };
  var playerId = ls('fyh_pid') || rid(); ls('fyh_pid', playerId);
  var sessionId = rid();
  var name = '';

  function send(event, data) {
    try {
      if (!cfg.SHEETS_ENDPOINT) return;
      var body = JSON.stringify({
        t: new Date().toISOString(), pid: playerId, sid: sessionId, name: name,
        event: event, data: data || {}, page: location.pathname,
        w: innerWidth, h: innerHeight
      });
      // text/plain avoids a CORS preflight, which Apps Script does not answer
      fetch(cfg.SHEETS_ENDPOINT, { method: 'POST', mode: 'no-cors', keepalive: true,
        headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: body }).catch(function () {});
    } catch (e) {}
  }

  window.FYHTrack = {
    send: send,
    setName: function (n) { name = String(n || '').slice(0, 24); }
  };

  // Generic click logging for every button (the helm and number bundles are summarised per round instead)
  document.addEventListener('click', function (e) {
    var b = e.target && e.target.closest && e.target.closest('button');
    if (!b || b.classList.contains('helm-btn') || b.classList.contains('bundle-btn')) return;
    var label = (b.id || b.getAttribute('aria-label') || b.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 40);
    send('click', { button: label });
  }, true);

  send('page_open', { ref: document.referrer ? new URL(document.referrer).hostname : '' });
})();
