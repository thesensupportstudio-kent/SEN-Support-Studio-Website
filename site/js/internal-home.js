(function () {
  var nextSessionEl = document.getElementById('glance-next-session');
  var submissionsEl = document.getElementById('glance-submissions');
  var statActiveClients = document.getElementById('stat-active-clients');
  var statSessionsMonth = document.getElementById('stat-sessions-month');
  var statInvoicesOutstanding = document.getElementById('stat-invoices-outstanding');

  if (!nextSessionEl || !submissionsEl) return;

  function escapeHtml(str) {
    return String(str == null ? '' : str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function dayLabel(date, today) {
    var diffDays = Math.round((date - today) / 86400000);
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Tomorrow';
    return date.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
  }

  function timeLabel(iso, allDay) {
    if (allDay) return 'All day';
    var d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  }

  function loadNextSession() {
    fetch('/api/internal/calendar/events?days=14')
      .then(function (res) { return res.json().then(function (data) { return { ok: res.ok, data: data }; }); })
      .then(function (result) {
        if (!result.ok || !result.data.connected) {
          nextSessionEl.innerHTML = '<p class="glance-empty">Connect Google Calendar to see your next session. <a href="calendar.html">Go to Calendar</a></p>';
          return;
        }
        var events = (result.data.events || []).filter(function (ev) { return ev.start; });
        if (!events.length) {
          nextSessionEl.innerHTML = '<p class="glance-empty">Nothing on your calendar for the next two weeks.</p>';
          return;
        }
        var ev = events[0];
        var today = new Date();
        today = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        var start = new Date(ev.start);
        var when = ev.allDay ? dayLabel(start, today) : dayLabel(start, today) + ' at ' + timeLabel(ev.start, ev.allDay);

        var html = '<a class="glance-session" href="calendar.html">';
        html += '<span class="glance-session-when">' + escapeHtml(when) + '</span>';
        html += '<span class="glance-session-title">' + escapeHtml(ev.title) + '</span>';
        if (ev.location) html += '<span class="glance-session-location">' + escapeHtml(ev.location) + '</span>';
        html += '</a>';
        nextSessionEl.innerHTML = html;
      })
      .catch(function () {
        nextSessionEl.innerHTML = '<p class="glance-empty">Could not load your calendar.</p>';
      });
  }

  function loadSubmissions() {
    fetch('/api/internal/dashboard')
      .then(function (res) { return res.json().then(function (data) { return { ok: res.ok, data: data }; }); })
      .then(function (result) {
        if (!result.ok) {
          submissionsEl.innerHTML = '<p class="glance-empty">Could not load new submissions.</p>';
          return;
        }
        var items = result.data.newSubmissions || [];
        if (!items.length) {
          submissionsEl.innerHTML = '<p class="glance-empty">No new form submissions since your last visit.</p>';
          return;
        }
        var html = '<ul class="glance-submission-list">';
        items.forEach(function (item) {
          var name = item.childName || item.parentName || '';
          var href = item.clientId ? 'client.html?id=' + encodeURIComponent(item.clientId) : 'clients.html';
          html += '<li><a href="' + href + '">';
          html += '<span class="glance-submission-label">' + escapeHtml(item.label) + '</span>';
          if (name) html += '<span class="glance-submission-name">' + escapeHtml(name) + '</span>';
          html += '</a></li>';
        });
        html += '</ul>';
        submissionsEl.innerHTML = html;
      })
      .catch(function () {
        submissionsEl.innerHTML = '<p class="glance-empty">Could not load new submissions.</p>';
      });
  }

  function loadStats() {
    if (!statActiveClients || !statSessionsMonth || !statInvoicesOutstanding) return;
    fetch('/api/internal/stats')
      .then(function (res) { return res.json().then(function (data) { return { ok: res.ok, data: data }; }); })
      .then(function (result) {
        if (!result.ok) throw new Error();
        statActiveClients.textContent = String(result.data.activeClients);
        statSessionsMonth.textContent = result.data.sessionsThisMonth == null ? '-' : String(result.data.sessionsThisMonth);
        statInvoicesOutstanding.textContent = String(result.data.invoicesOutstanding);
      })
      .catch(function () {
        statActiveClients.textContent = '-';
        statSessionsMonth.textContent = '-';
        statInvoicesOutstanding.textContent = '-';
      });
  }

  loadNextSession();
  loadSubmissions();
  loadStats();
})();
