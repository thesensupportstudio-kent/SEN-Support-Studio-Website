(function () {
  var ledeEl = document.getElementById('portal-lede');
  var errorEl = document.getElementById('portal-error');
  var contentEl = document.getElementById('portal-content');
  var tabsBar = document.getElementById('portal-tabs');
  var packsWrap = document.getElementById('packs-wrap');
  var upcomingList = document.getElementById('upcoming-list');
  var upcomingCard = document.getElementById('upcoming-card');
  var paymentsCard = document.getElementById('payments-card');
  var paymentsList = document.getElementById('payments-list');
  var formsList = document.getElementById('forms-list');
  var reportsList = document.getElementById('reports-list');
  var logoutBtn = document.getElementById('logout-btn');
  var homeUpcomingList = document.getElementById('home-upcoming-list');
  var manageBookingsBtn = document.getElementById('manage-bookings-btn');
  var homePaymentsCard = document.getElementById('home-payments-card');
  var homePaymentsList = document.getElementById('home-payments-list');
  var homeReportsCard = document.getElementById('home-reports-card');
  var homeReportsList = document.getElementById('home-reports-list');
  var checkoutReturnMessage = document.getElementById('checkout-return-message');
  var rolesParentBtn = document.getElementById('role-parent');
  var roleSchoolBtn = document.getElementById('role-school');
  var serviceField = document.getElementById('service-field');
  var serviceListEl = document.getElementById('service-list');
  var typeField = document.getElementById('type-field');
  var typeListEl = document.getElementById('type-list');
  var bookingSummary = document.getElementById('booking-summary');
  var summaryName = document.getElementById('summary-name');
  var summaryPrice = document.getElementById('summary-price');
  var checkoutBtn = document.getElementById('checkout-btn');
  var checkoutError = document.getElementById('checkout-error');

  var detailModalOverlay = document.getElementById('detail-modal-overlay');
  var detailModalTitle = document.getElementById('detail-modal-title');
  var detailModalBody = document.getElementById('detail-modal-body');
  var detailModalClose = document.getElementById('detail-modal-close');

  var DAY_FMT = { weekday: 'short', day: 'numeric', month: 'short' };
  var TIME_FMT = { hour: '2-digit', minute: '2-digit' };

  var TYPE_LABELS = {
    sensory_questionnaire: 'Sensory Profile Questionnaire',
    tuition_intake: 'Getting to Know You',
    client_agreement: 'Client Agreement'
  };
  var KEY_LABEL_OVERRIDES = { klass: 'Class' };

  // Mirrors functions/api/_lib/serviceCatalog.js (server-side source of
  // truth for pricing) - kept as a small duplicated display copy, same
  // reasoning as the site's existing service-labels.js.
  var NEW_SERVICES = {
    'tuition-parent': {
      label: '1:1 Tuition', role: 'parent',
      single: { label: 'Single session', price: '£50 / hour' },
      pack: { label: 'Monthly pack (4 sessions)', price: '£190 total (5% off)' }
    },
    'sensory-parent': {
      label: 'Sensory Profile Builder', role: 'parent',
      single: { label: 'One profile', price: '£100' }
    },
    support: {
      label: 'Support Sessions', role: 'parent',
      single: { label: 'Single hour', price: '£50 / hour' }
    },
    'tuition-school': {
      label: '1:1 Pupil Tuition', role: 'school',
      single: { label: 'Single session', price: '£60 / hour' },
      pack: { label: 'Term pack (7 sessions)', price: '£399 total (5% off)' }
    },
    'sensory-school': {
      label: 'Sensory Profile Builder', role: 'school',
      single: { label: 'Single profile', price: '£100' },
      pack: { label: 'Pack of 5 profiles', price: '£475 total (5% off)' }
    },
    'sentence-steps': {
      label: 'Sentence Steps Intervention', role: 'school',
      single: { label: 'Single hour', price: '£100 / hour' },
      pack: { label: 'Term pack (7 x 1hr slots)', price: '£665 total (5% off)' }
    },
    'build-buddies': {
      label: 'Build Buddies Intervention', role: 'school',
      single: { label: 'Single hour', price: '£100 / hour' },
      pack: { label: 'Term pack (7 x 1hr slots)', price: '£665 total (5% off)' }
    }
  };

  var newServiceState = { role: '', serviceSlug: '', type: '' };

  function renderNewServiceStep() {
    rolesParentBtn.classList.toggle('active', newServiceState.role === 'parent');
    roleSchoolBtn.classList.toggle('active', newServiceState.role === 'school');

    var slugs = newServiceState.role
      ? Object.keys(NEW_SERVICES).filter(function (k) { return NEW_SERVICES[k].role === newServiceState.role; })
      : [];

    serviceField.classList.toggle('hidden', !newServiceState.role);
    serviceListEl.innerHTML = '';
    slugs.forEach(function (slug) {
      var svc = NEW_SERVICES[slug];
      var row = document.createElement('button');
      row.type = 'button';
      row.className = 'service-row' + (newServiceState.serviceSlug === slug ? ' active' : '');
      row.innerHTML = '<span>' + svc.label + '</span><span class="from-price">' + svc.single.price + '</span>';
      row.addEventListener('click', function () {
        newServiceState.serviceSlug = slug;
        newServiceState.type = '';
        renderNewServiceStep();
      });
      serviceListEl.appendChild(row);
    });

    var svc = newServiceState.serviceSlug ? NEW_SERVICES[newServiceState.serviceSlug] : null;
    var showType = !!(svc && svc.pack);
    if (svc && !showType) newServiceState.type = 'single';

    typeField.classList.toggle('hidden', !showType);
    typeListEl.innerHTML = '';
    if (showType) {
      ['single', 'pack'].forEach(function (typeKey) {
        var opt = svc[typeKey];
        if (!opt) return;
        var card = document.createElement('button');
        card.type = 'button';
        card.className = 'type-card' + (newServiceState.type === typeKey ? ' active' : '');
        card.innerHTML = '<span class="top">' + opt.label + '</span><span class="bottom">' + opt.price + '</span>';
        card.addEventListener('click', function () {
          newServiceState.type = typeKey;
          renderNewServiceStep();
        });
        typeListEl.appendChild(card);
      });
    }

    var chosenOption = svc && newServiceState.type ? svc[newServiceState.type] : null;
    bookingSummary.classList.toggle('hidden', !chosenOption);
    checkoutBtn.classList.toggle('hidden', !chosenOption);
    if (chosenOption) {
      summaryName.textContent = svc.label + ' - ' + chosenOption.label;
      summaryPrice.textContent = chosenOption.price;
    }
  }

  if (rolesParentBtn) {
    rolesParentBtn.addEventListener('click', function () {
      newServiceState = { role: 'parent', serviceSlug: '', type: '' };
      renderNewServiceStep();
    });
  }
  if (roleSchoolBtn) {
    roleSchoolBtn.addEventListener('click', function () {
      newServiceState = { role: 'school', serviceSlug: '', type: '' };
      renderNewServiceStep();
    });
  }

  if (checkoutBtn) {
    checkoutBtn.addEventListener('click', function () {
      checkoutError.classList.add('hidden');
      checkoutBtn.disabled = true;
      checkoutBtn.textContent = 'Redirecting to payment…';

      fetch('/api/client-auth/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ serviceSlug: newServiceState.serviceSlug, type: newServiceState.type })
      })
        .then(function (res) { return res.json().then(function (data) { return { ok: res.ok, data: data }; }); })
        .then(function (result) {
          if (!result.ok || !result.data.url) throw new Error((result.data && result.data.error) || 'Could not start checkout.');
          window.location.href = result.data.url;
        })
        .catch(function (err) {
          checkoutError.textContent = err.message || 'Could not start checkout.';
          checkoutError.classList.remove('hidden');
          checkoutBtn.disabled = false;
          checkoutBtn.textContent = 'Pay & book →';
        });
    });
  }

  function openDetailModal(title, fill) {
    detailModalTitle.textContent = title;
    detailModalBody.innerHTML = '';
    fill(detailModalBody);
    detailModalOverlay.classList.remove('hidden');
  }
  function closeDetailModal() {
    detailModalOverlay.classList.add('hidden');
    detailModalBody.innerHTML = '';
  }
  detailModalClose.addEventListener('click', closeDetailModal);
  detailModalOverlay.addEventListener('click', function (e) {
    if (e.target === detailModalOverlay) closeDetailModal();
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') closeDetailModal();
  });

  function humanizeKey(key) {
    if (KEY_LABEL_OVERRIDES[key]) return KEY_LABEL_OVERRIDES[key];
    var spaced = String(key).replace(/([a-z0-9])([A-Z])/g, '$1 $2').replace(/_/g, ' ');
    return spaced.charAt(0).toUpperCase() + spaced.slice(1);
  }

  function renderDetailObject(obj, container, skipKeys) {
    if (!obj || typeof obj !== 'object') return;
    Object.keys(obj).forEach(function (key) {
      if (skipKeys && skipKeys.indexOf(key) !== -1) return;
      var value = obj[key];
      if (value == null || value === '') return;

      if (Array.isArray(value)) {
        if (!value.length) return;
        if (typeof value[0] === 'object') {
          value.forEach(function (item) {
            if (item && item.title) {
              var heading = document.createElement('p');
              heading.className = 'detail-subheading';
              heading.textContent = item.title;
              container.appendChild(heading);
            }
            renderDetailObject(item, container, ['title', 'type']);
          });
          return;
        }
        var items = value.filter(function (v) { return v != null && v !== ''; });
        if (!items.length) return;
        var row = document.createElement('p');
        row.className = 'detail-row';
        var label = document.createElement('strong');
        label.textContent = humanizeKey(key) + ': ';
        row.appendChild(label);
        row.appendChild(document.createTextNode(items.join(', ')));
        container.appendChild(row);
        return;
      }

      if (typeof value === 'object') {
        renderDetailObject(value, container);
        return;
      }

      var line = document.createElement('p');
      line.className = 'detail-row';
      var lineLabel = document.createElement('strong');
      lineLabel.textContent = humanizeKey(key) + ': ';
      line.appendChild(lineLabel);
      line.appendChild(document.createTextNode(String(value)));
      container.appendChild(line);
    });
  }

  function parseDetail(item) {
    if (!item.detail) return null;
    try { return JSON.parse(item.detail); } catch (e) { return null; }
  }

  function formatDateTime(iso) {
    if (!iso) return '';
    var d = new Date(iso.replace(' ', 'T') + 'Z');
    if (isNaN(d.getTime())) return iso;
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) +
      ' at ' + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  }

  function formatDateOnly(value) {
    if (!value) return '';
    var d = new Date(value.length <= 10 ? value + 'T00:00:00Z' : value.replace(' ', 'T') + 'Z');
    if (isNaN(d.getTime())) return value;
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
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

  function showError(message) {
    contentEl.classList.add('hidden');
    errorEl.textContent = message;
    errorEl.classList.remove('hidden');
  }

  if (logoutBtn) {
    logoutBtn.addEventListener('click', function () {
      fetch('/api/client-auth/logout', { method: 'POST' }).finally(function () {
        window.location.href = 'client-login.html';
      });
    });
  }

  function loadSlots(pack, slotsWrap, bookBtn) {
    slotsWrap.innerHTML = '<p class="lede">Loading available times…</p>';
    fetch('/api/portal/availability?packId=' + encodeURIComponent(pack.id))
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
                body: JSON.stringify({ packId: pack.id, date: slot.date, startTime: slot.startTime, endTime: slot.endTime })
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
        if (bookBtn) bookBtn.disabled = false;
      });
  }

  function renderPacks(packs) {
    packsWrap.innerHTML = '';
    if (!packs.length) {
      var empty = document.createElement('p');
      empty.className = 'lede';
      empty.textContent = 'No sessions set up on your account yet.';
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
      count.textContent = pack.pack_type === 'ongoing'
        ? 'Book one at a time'
        : pack.remaining_sessions + ' of ' + pack.total_sessions + ' sessions remaining';
      header.appendChild(name);
      header.appendChild(count);
      card.appendChild(header);

      var canBook = pack.pack_type === 'ongoing' || pack.remaining_sessions > 0;

      if (canBook) {
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
          body: JSON.stringify({ bookingId: b.id })
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

  function createPayNowButton(item) {
    var payBtn = document.createElement('button');
    payBtn.type = 'button';
    payBtn.className = 'btn btn-primary';
    payBtn.style.padding = '8px 16px';
    payBtn.style.fontSize = '14px';
    payBtn.textContent = 'Pay now';
    payBtn.addEventListener('click', function () {
      payBtn.disabled = true;
      payBtn.textContent = 'Redirecting…';
      fetch('/api/client-auth/pay-invoice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ interactionId: item.id })
      })
        .then(function (res) { return res.json().then(function (data) { return { ok: res.ok, data: data }; }); })
        .then(function (result) {
          if (!result.ok || !result.data.url) throw new Error((result.data && result.data.error) || 'Could not start checkout.');
          window.location.href = result.data.url;
        })
        .catch(function (err) {
          window.alert(err.message || 'Could not start checkout.');
          payBtn.disabled = false;
          payBtn.textContent = 'Pay now';
        });
    });
    return payBtn;
  }

  function renderPayments(payments) {
    paymentsList.innerHTML = '';
    if (!payments.length) {
      paymentsCard.classList.add('hidden');
      return;
    }
    paymentsCard.classList.remove('hidden');

    payments.forEach(function (item) {
      var row = document.createElement('div');
      row.className = 'service-row';
      row.style.cursor = 'default';

      var left = document.createElement('span');
      left.textContent = item.summary;
      row.appendChild(left);

      var right = document.createElement('span');
      right.style.display = 'flex';
      right.style.alignItems = 'center';
      right.style.gap = '10px';

      var isPaid = !!item.paid_at;
      var pill = document.createElement('span');
      pill.className = 'status-pill ' + (isPaid ? 'status-active' : 'status-enquiry');
      pill.textContent = isPaid ? 'Paid ' + formatDateOnly(item.paid_at) : 'Awaiting payment';
      right.appendChild(pill);

      if (!isPaid) {
        right.appendChild(createPayNowButton(item));
      }

      row.appendChild(right);
      paymentsList.appendChild(row);
    });
  }

  function renderForms(forms) {
    formsList.innerHTML = '';
    if (!forms.length) {
      formsList.innerHTML = '<p class="clients-empty">No forms completed yet.</p>';
      return;
    }
    forms.forEach(function (item) {
      var detailObj = parseDetail(item);
      var row = document.createElement('div');
      row.className = 'timeline-item';

      var titleEl = document.createElement('p');
      titleEl.className = 'document-label';
      titleEl.textContent = TYPE_LABELS[item.type] || item.summary;
      row.appendChild(titleEl);

      var dateEl = document.createElement('p');
      dateEl.className = 'timeline-date';
      dateEl.textContent = 'Completed ' + formatDateTime(item.created_at);
      row.appendChild(dateEl);

      var viewBtn = document.createElement('button');
      viewBtn.type = 'button';
      viewBtn.className = 'timeline-view-btn';
      viewBtn.textContent = 'View';
      viewBtn.addEventListener('click', function () {
        openDetailModal(TYPE_LABELS[item.type] || item.summary, function (body) {
          if (detailObj) renderDetailObject(detailObj, body);
          else body.innerHTML = '<p>No details stored for this submission.</p>';
        });
      });
      row.appendChild(viewBtn);

      formsList.appendChild(row);
    });
  }

  function markReportViewed(id) {
    return fetch('/api/client-auth/mark-report-viewed', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ interactionId: id })
    }).then(function () { load(); }).catch(function () {});
  }

  function buildReportRow(item, opts) {
    var detailObj = parseDetail(item) || {};
    var row = document.createElement('div');
    row.className = 'timeline-item';

    var titleEl = document.createElement('p');
    titleEl.className = 'document-label';
    titleEl.textContent = detailObj.title || item.summary;
    row.appendChild(titleEl);

    var dateEl = document.createElement('p');
    dateEl.className = 'timeline-date';
    var sessionDateLabel = detailObj.sessionDate ? formatDateOnly(detailObj.sessionDate) : '';
    dateEl.textContent = sessionDateLabel
      ? 'Session on ' + sessionDateLabel + ' · Sent ' + formatDateTime(item.created_at)
      : 'Sent ' + formatDateTime(item.created_at);
    row.appendChild(dateEl);

    if (item.file_key) {
      var fileUrl = '/api/client-auth/file?key=' + encodeURIComponent(item.file_key);

      var viewBtn = document.createElement('button');
      viewBtn.type = 'button';
      viewBtn.className = 'timeline-view-btn';
      viewBtn.textContent = 'View';
      viewBtn.addEventListener('click', function () {
        openDetailModal(detailObj.title || item.summary, function (body) {
          var iframe = document.createElement('iframe');
          iframe.src = fileUrl;
          body.appendChild(iframe);
        });
        if (!item.viewed_at) markReportViewed(item.id);
      });
      row.appendChild(viewBtn);

      var dl = document.createElement('a');
      dl.className = 'timeline-download';
      dl.href = fileUrl;
      dl.target = '_blank';
      dl.rel = 'noopener';
      dl.textContent = 'Download PDF';
      row.appendChild(dl);
    }

    if (opts && opts.newBadge) {
      var badge = document.createElement('span');
      badge.className = 'status-pill status-active';
      badge.textContent = 'New';
      badge.style.marginLeft = '10px';
      titleEl.appendChild(badge);
    }

    return row;
  }

  function renderReports(reports) {
    reportsList.innerHTML = '';
    if (!reports.length) {
      reportsList.innerHTML = '<p class="clients-empty">No reports sent yet.</p>';
      return;
    }
    reports.forEach(function (item) {
      reportsList.appendChild(buildReportRow(item));
    });
  }

  function renderHomeUpcoming(bookings) {
    homeUpcomingList.innerHTML = '';
    if (!bookings.length) {
      homeUpcomingList.innerHTML = '<p class="clients-empty">No upcoming sessions booked.</p>';
      return;
    }
    bookings.forEach(function (b) {
      var row = document.createElement('div');
      row.className = 'service-row';
      row.style.cursor = 'default';
      var left = document.createElement('span');
      left.textContent = b.service_label + ' — ' + formatBookingRange(b.start_at, b.end_at);
      row.appendChild(left);
      homeUpcomingList.appendChild(row);
    });
  }

  function renderHomePayments(payments) {
    var unpaid = payments.filter(function (p) { return !p.paid_at; });
    homePaymentsList.innerHTML = '';
    if (!unpaid.length) {
      homePaymentsCard.classList.add('hidden');
      return;
    }
    homePaymentsCard.classList.remove('hidden');
    unpaid.forEach(function (item) {
      var row = document.createElement('div');
      row.className = 'service-row';
      row.style.cursor = 'default';

      var left = document.createElement('span');
      left.textContent = item.summary;
      row.appendChild(left);
      row.appendChild(createPayNowButton(item));

      homePaymentsList.appendChild(row);
    });
  }

  function renderHomeReports(reports) {
    var unviewed = reports.filter(function (r) { return !r.viewed_at; });
    homeReportsList.innerHTML = '';
    if (!unviewed.length) {
      homeReportsCard.classList.add('hidden');
      return;
    }
    homeReportsCard.classList.remove('hidden');
    unviewed.forEach(function (item) {
      homeReportsList.appendChild(buildReportRow(item, { newBadge: true }));
    });
  }

  var TAB_NAMES = ['home', 'bookings', 'forms', 'reports'];

  function switchTab(tab) {
    if (tabsBar) {
      Array.prototype.forEach.call(tabsBar.querySelectorAll('.client-tab'), function (t) {
        t.classList.toggle('active', t.dataset.tab === tab);
      });
    }
    TAB_NAMES.forEach(function (name) {
      var panel = document.getElementById('tab-' + name);
      if (panel) panel.classList.toggle('hidden', name !== tab);
    });
  }

  if (tabsBar) {
    tabsBar.addEventListener('click', function (e) {
      var btn = e.target.closest('.client-tab');
      if (!btn) return;
      switchTab(btn.dataset.tab);
    });
  }

  if (manageBookingsBtn) {
    manageBookingsBtn.addEventListener('click', function () { switchTab('bookings'); });
  }

  function load() {
    fetch('/api/client-auth/me')
      .then(function (res) {
        if (res.status === 401) {
          window.location.href = 'client-login.html';
          return null;
        }
        return res.json().then(function (data) { return { ok: res.ok, data: data }; });
      })
      .then(function (result) {
        if (!result) return;
        if (!result.ok) throw new Error((result.data && result.data.error) || 'Could not load your account.');
        var data = result.data;
        ledeEl.textContent = 'Hi ' + (data.parentName || 'there') + (data.childName ? ', here’s your account for ' + data.childName : ', here’s your account overview') + '.';
        renderPacks(data.packs || []);
        renderUpcoming(data.bookings || []);
        renderPayments(data.payments || []);
        renderForms(data.forms || []);
        renderReports(data.reports || []);
        renderHomeUpcoming(data.bookings || []);
        renderHomePayments(data.payments || []);
        renderHomeReports(data.reports || []);
        contentEl.classList.remove('hidden');
        errorEl.classList.add('hidden');
      })
      .catch(function (err) {
        showError(err.message || 'Could not load your account.');
      });
  }

  var urlParams = new URLSearchParams(window.location.search);
  var tabParam = urlParams.get('tab');
  var serviceParam = urlParams.get('service');
  var typeParam = urlParams.get('type');
  var checkoutParam = urlParams.get('checkout');

  if (serviceParam && NEW_SERVICES[serviceParam]) {
    var presetSvc = NEW_SERVICES[serviceParam];
    newServiceState = {
      role: presetSvc.role,
      serviceSlug: serviceParam,
      type: (typeParam === 'pack' && presetSvc.pack) ? 'pack' : 'single'
    };
    renderNewServiceStep();
  }

  if (checkoutParam && checkoutReturnMessage) {
    if (checkoutParam === 'success') {
      checkoutReturnMessage.innerHTML = '<p>Payment received! Your sessions will appear below shortly - refresh in a moment if you don’t see them yet.</p>';
      checkoutReturnMessage.classList.remove('hidden');
    } else if (checkoutParam === 'cancelled') {
      checkoutReturnMessage.innerHTML = '<p>Checkout was cancelled - no payment was taken.</p>';
      checkoutReturnMessage.classList.remove('hidden');
    }
  }

  if (tabParam === 'bookings' || checkoutParam) {
    switchTab('bookings');
  }
  if (tabParam || serviceParam || checkoutParam) {
    window.history.replaceState({}, '', window.location.pathname);
  }

  load();
})();
