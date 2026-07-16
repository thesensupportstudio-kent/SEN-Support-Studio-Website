(function () {
  var banner = document.getElementById('calendar-banner');
  var connectCard = document.getElementById('calendar-connect');
  var loading = document.getElementById('calendar-loading');
  var agenda = document.getElementById('calendar-agenda');
  var disconnectBtn = document.getElementById('calendar-disconnect-btn');
  var newEventBtn = document.getElementById('calendar-new-event-btn');

  var formWrap = document.getElementById('calendar-event-form-wrap');
  var formTitle = document.getElementById('calendar-event-form-title');
  var form = document.getElementById('calendar-event-form');
  var formError = document.getElementById('calendar-event-error');
  var eventIdField = document.getElementById('event-id');
  var titleField = document.getElementById('event-title');
  var dateField = document.getElementById('event-date');
  var allDayField = document.getElementById('event-allday');
  var timeRow = document.getElementById('event-time-row');
  var startTimeField = document.getElementById('event-start-time');
  var endTimeField = document.getElementById('event-end-time');
  var locationField = document.getElementById('event-location');
  var descriptionField = document.getElementById('event-description');
  var saveBtn = document.getElementById('event-save-btn');
  var cancelBtn = document.getElementById('event-cancel-btn');
  var deleteBtn = document.getElementById('event-delete-btn');

  if (!agenda) return;

  var eventsById = {};

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
    } else {
      banner.style.background = '';
      banner.style.borderColor = '';
      banner.style.color = '';
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

  function todayIso() {
    var d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }

  function timeIso(iso) {
    var d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
  }

  function renderAgenda(events) {
    agenda.innerHTML = '';
    eventsById = {};

    if (!events.length) {
      agenda.innerHTML = '<p class="clients-empty">Nothing on your calendar for the next couple of weeks.</p>';
      agenda.classList.remove('hidden');
      return;
    }

    var groups = {};
    var order = [];
    events.forEach(function (ev) {
      if (!ev.start) return;
      eventsById[ev.id] = ev;
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
        row.dataset.eventId = ev.id;

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

        row.addEventListener('click', function () { openEditForm(ev); });

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
    formWrap.classList.add('hidden');

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
          newEventBtn.classList.add('hidden');
          if (result.data.error) showBanner(result.data.error, false);
          return;
        }
        disconnectBtn.classList.remove('hidden');
        newEventBtn.classList.remove('hidden');
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

  function clearForm() {
    form.reset();
    eventIdField.value = '';
    dateField.value = todayIso();
    timeRow.classList.remove('hidden');
    deleteBtn.classList.add('hidden');
    formError.classList.add('hidden');
  }

  function openNewForm() {
    clearForm();
    formTitle.textContent = 'New event';
    formWrap.classList.remove('hidden');
    agenda.classList.add('hidden');
    formWrap.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function openEditForm(ev) {
    clearForm();
    formTitle.textContent = 'Edit event';
    eventIdField.value = ev.id;
    titleField.value = ev.title === '(No title)' ? '' : ev.title;
    dateField.value = (ev.start || '').slice(0, 10);
    allDayField.checked = !!ev.allDay;
    timeRow.classList.toggle('hidden', !!ev.allDay);
    if (!ev.allDay) {
      startTimeField.value = timeIso(ev.start);
      endTimeField.value = timeIso(ev.end);
    }
    locationField.value = ev.location || '';
    descriptionField.value = ev.description || '';
    deleteBtn.classList.remove('hidden');
    formWrap.classList.remove('hidden');
    agenda.classList.add('hidden');
    formWrap.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function closeForm() {
    formWrap.classList.add('hidden');
    agenda.classList.remove('hidden');
  }

  newEventBtn.addEventListener('click', openNewForm);
  cancelBtn.addEventListener('click', closeForm);

  allDayField.addEventListener('change', function () {
    timeRow.classList.toggle('hidden', allDayField.checked);
  });

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    formError.classList.add('hidden');

    var payload = {
      title: titleField.value.trim(),
      date: dateField.value,
      allDay: allDayField.checked,
      startTime: startTimeField.value,
      endTime: endTimeField.value,
      location: locationField.value.trim(),
      description: descriptionField.value.trim(),
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
    };

    if (!payload.allDay && payload.startTime && payload.endTime && payload.endTime <= payload.startTime) {
      formError.textContent = 'End time must be after the start time.';
      formError.classList.remove('hidden');
      return;
    }

    var id = eventIdField.value;
    var url = id ? '/api/internal/calendar/event?id=' + encodeURIComponent(id) : '/api/internal/calendar/event';
    var method = id ? 'PATCH' : 'POST';

    saveBtn.disabled = true;
    saveBtn.textContent = 'Saving…';

    fetch(url, {
      method: method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
      .then(function (res) { return res.json().then(function (data) { return { ok: res.ok, data: data }; }); })
      .then(function (result) {
        if (!result.ok) throw new Error((result.data && result.data.error) || 'Could not save this event.');
        closeForm();
        showBanner(id ? 'Event updated.' : 'Event created.', true);
        load();
      })
      .catch(function (err) {
        formError.textContent = err.message || 'Could not save this event.';
        formError.classList.remove('hidden');
      })
      .finally(function () {
        saveBtn.disabled = false;
        saveBtn.textContent = 'Save event';
      });
  });

  deleteBtn.addEventListener('click', function () {
    var id = eventIdField.value;
    if (!id) return;
    if (!window.confirm('Delete this event from your Google Calendar?')) return;

    deleteBtn.disabled = true;
    fetch('/api/internal/calendar/event?id=' + encodeURIComponent(id), { method: 'DELETE' })
      .then(function (res) { return res.json().then(function (data) { return { ok: res.ok, data: data }; }); })
      .then(function (result) {
        if (!result.ok) throw new Error((result.data && result.data.error) || 'Could not delete this event.');
        closeForm();
        showBanner('Event deleted.', true);
        load();
      })
      .catch(function (err) {
        formError.textContent = err.message || 'Could not delete this event.';
        formError.classList.remove('hidden');
      })
      .finally(function () {
        deleteBtn.disabled = false;
      });
  });

  load();
})();
