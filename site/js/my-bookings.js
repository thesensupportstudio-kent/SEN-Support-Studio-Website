(function () {
  var token = new URLSearchParams(window.location.search).get('token');

  var ledeEl = document.getElementById('bookings-lede');
  var errorEl = document.getElementById('bookings-error');
  var loadingEl = document.getElementById('bookings-loading');
  var contentEl = document.getElementById('bookings-content');
  var packsWrap = document.getElementById('packs-wrap');
  var upcomingList = document.getElementById('upcoming-list');
  var upcomingCard = document.getElementById('upcoming-card');

  var DAY_FMT = { weekday: 'short', day: 'numeric', month: 'short' };
  var TIME_FMT = { hour: '2-digit', minute: '2-digit' };

  function showError(message) {
    loadingEl.classList.add('hidden');
    errorEl.textContent = message;
    errorEl.classList.remove('hidden');
  }

  function formatSlotHeading(dateStr) {
    var d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-GB', DAY_FMT);
  }

  function formatBookingRange(startIso, endIso) {
    var start = new Date(startIso);
    var end = new Date(endIso);
    return start.toLocaleDateString('en-GB', DAY_FMT) + ', ' +
      start.toLocaleTimeString('en-GB', TIME_FMT) + '–' + end.toLocaleTimeString('en-GB', TIME_FMT);
  }

  if (!token) {
    loadingEl.classList.add('hidden');
    showError('This page needs your personal booking link - check the email we sent you, or get in touch and we’ll resend it.');
    return;
  }

  function loadSlots(pack, slotsWrap, bookBtn) {
    slotsWrap.innerHTML = '<p class="lede">Loading available times…</p>';
    fetch('/api/portal/availability?token=' + encodeURIComponent(token) + '&packId=' + encodeURIComponent(pack.id))
      .then(function (res) { return res.json().then(function (data) { return { ok: res.ok, data: data }; }); })
      .then(function (result) {
        if (!result.ok) throw new Error((result.data && result.data.error) || 'Could not load available times.');
        var slots = result.data.slots || [];
        if (!slots.length) {
          slotsWrap.innerHTML = '<p class="lede">No times available in the next few weeks - please get in touch directly.</p>';
          return;
        }

        var byDate = {};
        var order = [];
        slots.forEach(function (s) {
          if (!byDate[s.date]) { byDate[s.date] = []; order.push(s.date); }
          byDate[s.date].push(s);
        });

        slotsWrap.innerHTML = '';
        order.forEach(function (date) {
          var heading = document.createElement('p');
          heading.className = 'slot-date-heading';
          heading.textContent = formatSlotHeading(date);
          slotsWrap.appendChild(heading);

          var grid = document.createElement('div');
          grid.className = 'slot-grid';
          byDate[date].forEach(function (slot) {
            var btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'slot-btn';
            btn.textContent = slot.startTime;
            btn.addEventListener('click', function () {
              var confirmMsg = 'Book ' + pack.service_label + ' on ' + formatSlotHeading(date) + ' at ' + slot.startTime + '?';
              if (!window.confirm(confirmMsg)) return;
              btn.disabled = true;
              fetch('/api/portal/book', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token: token, packId: pack.id, date: slot.date, startTime: slot.startTime, endTime: slot.endTime })
              })
                .then(function (res) { return res.json().then(function (data) { return { ok: res.ok, data: data }; }); })
                .then(function (result2) {
                  if (!result2.ok) throw new Error((result2.data && result2.data.error) || 'Could not book this session.');
                  load();
                })
                .catch(function (err) {
                  window.alert(err.message || 'Could not book this session.');
                  btn.disabled = false;
                });
            });
            grid.appendChild(btn);
          });
          slotsWrap.appendChild(grid);
        });
      })
      .catch(function (err) {
        slotsWrap.innerHTML = '<p class="form-error">' + (err.message || 'Could not load available times.') + '</p>';
      })
      .finally(function () {
        if (bookBtn) { bookBtn.disabled = false; }
      });
  }

  function renderPacks(packs) {
    packsWrap.innerHTML = '';
    if (!packs.length) {
      var empty = document.createElement('p');
      empty.className = 'lede';
      empty.textContent = 'No session packs on your account yet.';
      packsWrap.appendChild(empty);
      return;
    }

    packs.forEach(function (pack) {
      var card = document.createElement('div');
      card.className = 'book-card';

      var header = document.createElement('div');
      header.className = 'booking-summary';
      var name = document.createElement('span');
      name.className = 'name';
      name.textContent = pack.service_label;
      var count = document.createElement('span');
      count.className = 'price';
      count.textContent = pack.remaining_sessions + ' of ' + pack.total_sessions + ' sessions remaining';
      header.appendChild(name);
      header.appendChild(count);
      card.appendChild(header);

      if (pack.remaining_sessions > 0) {
        var bookBtn = document.createElement('button');
        bookBtn.type = 'button';
        bookBtn.className = 'btn btn-primary';
        bookBtn.textContent = 'Book a session';

        var slotsWrap = document.createElement('div');
        slotsWrap.className = 'slots-wrap hidden';

        bookBtn.addEventListener('click', function () {
          var isHidden = slotsWrap.classList.contains('hidden');
          slotsWrap.classList.toggle('hidden');
          if (isHidden) {
            bookBtn.disabled = true;
            loadSlots(pack, slotsWrap, bookBtn);
          }
        });

        card.appendChild(bookBtn);
        card.appendChild(slotsWrap);
      } else {
        var doneMsg = document.createElement('p');
        doneMsg.className = 'lede';
        doneMsg.textContent = 'All sessions in this pack are booked. Get in touch if you’d like to add another pack.';
        card.appendChild(doneMsg);
      }

      packsWrap.appendChild(card);
    });
  }

  function renderUpcoming(bookings) {
    upcomingList.innerHTML = '';
    if (!bookings.length) {
      upcomingCard.classList.add('hidden');
      return;
    }
    upcomingCard.classList.remove('hidden');

    bookings.forEach(function (b) {
      var row = document.createElement('div');
      row.className = 'service-row';
      row.style.cursor = 'default';

      var left = document.createElement('span');
      left.textContent = b.service_label + ' — ' + formatBookingRange(b.start_at, b.end_at);
      row.appendChild(left);

      var cancelBtn = document.createElement('button');
      cancelBtn.type = 'button';
      cancelBtn.className = 'btn btn-outline';
      cancelBtn.style.padding = '8px 16px';
      cancelBtn.style.fontSize = '14px';
      cancelBtn.style.flexShrink = '0';
      cancelBtn.textContent = 'Cancel';
      cancelBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        var hoursNotice = (new Date(b.start_at).getTime() - Date.now()) / 3600000;
        var warning = hoursNotice < 24
          ? ' This is within 24 hours, so this session will still count as used.'
          : '';
        if (!window.confirm('Cancel this session on ' + formatBookingRange(b.start_at, b.end_at) + '?' + warning)) return;
        cancelBtn.disabled = true;
        fetch('/api/portal/cancel', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: token, bookingId: b.id })
        })
          .then(function (res) { return res.json().then(function (data) { return { ok: res.ok, data: data }; }); })
          .then(function (result) {
            if (!result.ok) throw new Error((result.data && result.data.error) || 'Could not cancel this session.');
            load();
          })
          .catch(function (err) {
            window.alert(err.message || 'Could not cancel this session.');
            cancelBtn.disabled = false;
          });
      });
      row.appendChild(cancelBtn);

      upcomingList.appendChild(row);
    });
  }

  function load() {
    fetch('/api/portal/summary?token=' + encodeURIComponent(token))
      .then(function (res) { return res.json().then(function (data) { return { ok: res.ok, data: data }; }); })
      .then(function (result) {
        if (!result.ok) throw new Error((result.data && result.data.error) || 'Could not load your bookings.');
        var data = result.data;
        ledeEl.textContent = 'Hi ' + (data.parentName || 'there') + ', here’s your session overview' + (data.childName ? ' for ' + data.childName : '') + '.';
        renderPacks(data.packs || []);
        renderUpcoming(data.bookings || []);
        loadingEl.classList.add('hidden');
        contentEl.classList.remove('hidden');
      })
      .catch(function (err) {
        showError(err.message || 'Could not load your bookings.');
      });
  }

  load();
})();
