(function () {
  var banner = document.getElementById('calendar-banner');
  var connectCard = document.getElementById('calendar-connect');
  var loading = document.getElementById('calendar-loading');
  var agenda = document.getElementById('calendar-agenda');
  var disconnectBtn = document.getElementById('calendar-disconnect-btn');

  if (!agenda) return;

  var ERROR_MESSAGES = {
    access_denied: 'Google sign-in was cancelled.',
    missing_code: 'Something went wrong connecting to Google - please try again.',
    exchange_failed: 'Google did not accept the connection - please try again.'
  };

  function escapeHtml(str) {
    return String(str == null ? '' : str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function showBanner(message, isSuccess) {
    banner.textContent = message;
    banner.classList.remove('hidden');
    if (isSuccess) {
      banner.style.background = 'rgba(45, 84, 57, 0.1)';
      banner.style.borderColor = 'rgba(45, 84, 57, 0.3)';
      banner.style.color = 'var(--green-dark)';
    }
  }

  var params = new URLSearchParams(window.location.search);
  if (params.get('connected') === '1') {
    showBanner('Google Calendar connected.', true);
  } else if (params.get('error')) {
    showBanner(ERROR_MESSAGES[params.get('error')] || 'Could not connect to Google Calendar.', false);
  }
  if (params.get('connected') || params.get('error')) {
    window.history.replaceState({}, '', window.location.pathname);
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

  function dateKey(iso, allDay) {
    var d = new Date(iso);
    if (allDay) {
      return iso.slice(0, 10);
    }
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }

  function renderAgenda(events) {
    agenda.innerHTML = '';

    if (!events.length) {
      agenda.innerHTML = '<p class="clients-empty">Nothing on your calendar for the next couple of weeks.</p>';
      agenda.classList.remove('hidden');
      return;
    }

    var groups = {};
    var order = [];
    events.forEach(function (ev) {
      if (!ev.start) return;
      var key = dateKey(ev.start, ev.allDay);
      if (!groups[key]) { groups[key] = []; order.push(key); }
      groups[key].push(ev);
    });

    var today = new Date();
    today = new Date(today.getFullYear(), today.getMonth(), today.getDate());

    order.forEach(function (key) {
      var parts = key.split('-').map(Number);
      var date = new Date(parts[0], parts[1] - 1, parts[2]);

      var group = document.createElement('div');
      group.className = 'calendar-day-group';

      var heading = document.createElement('h3');
      heading.className = 'calendar-day-heading';
      heading.textContent = dayLabel(date, today);
      group.appendChild(heading);

      groups[key].forEach(function (ev) {
        var row = document.createElement('div');
        row.className = 'calendar-event-row';

        var time = document.createElement('span');
        time.className = 'calendar-event-time';
        time.textContent = timeLabel(ev.start, ev.allDay);
        row.appendChild(time);

        var body = document.createElement('div');
        body.className = 'calendar-event-body';
        var title = document.createElement('p');
        title.className = 'calendar-event-title';
        title.textContent = ev.title;
        body.appendChild(title);
        if (ev.location) {
          var loc = document.createElement('p');
          loc.className = 'calendar-event-location';
          loc.textContent = ev.location;
          body.appendChild(loc);
        }
        row.appendChild(body);

        group.appendChild(row);
      });

      agenda.appendChild(group);
    });

    agenda.classList.remove('hidden');
  }

  function load() {
    loading.classList.remove('hidden');
    agenda.classList.add('hidden');
    connectCard.classList.add('hidden');

    fetch('/api/internal/calendar/events?days=14')
      .then(function (res) { return res.json().then(function (data) { return { ok: res.ok, data: data }; }); })
      .then(function (result) {
        loading.classList.add('hidden');
        if (!result.ok) {
          throw new Error((result.data && result.data.error) || 'Could not load your calendar.');
        }
        if (!result.data.connected) {
          connectCard.classList.remove('hidden');
          disconnectBtn.classList.add('hidden');
          if (result.data.error) showBanner(result.data.error, false);
          return;
        }
        disconnectBtn.classList.remove('hidden');
        renderAgenda(result.data.events || []);
      })
      .catch(function (err) {
        loading.classList.add('hidden');
        showBanner(err.message || 'Could not load your calendar.', false);
        connectCard.classList.remove('hidden');
      });
  }

  disconnectBtn.addEventListener('click', function () {
    if (!window.confirm('Disconnect Google Calendar? You can reconnect any time.')) return;
    disconnectBtn.disabled = true;
    fetch('/api/internal/calendar/disconnect', { method: 'POST' })
      .then(function () { load(); })
      .finally(function () { disconnectBtn.disabled = false; });
  });

  load();
})();
