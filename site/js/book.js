(function () {
  var SERVICES = {
    'tuition-parent': {
      role: 'parent', label: '1:1 Tuition',
      calendlyUrl: 'https://calendly.com/thesensupportstudio/1-1-parent-tuition',
      options: [
        { id: 'single', label: 'Single session', price: '£50 / hour' },
        { id: 'pack', label: 'Monthly pack (4 sessions)', price: '£190 total (5% off)' }
      ]
    },
    'sensory-parent': {
      role: 'parent', label: 'Sensory Profile Builder',
      calendlyUrl: 'https://calendly.com/thesensupportstudio/parent-support-sessions-clone',
      bookingUrl: 'https://calendar.google.com/calendar/appointments/schedules/AcZssZ06EqqpvHUaXI5CozeOcVMUMoX4YKtSouygGVPFEdKHIT--nwbI4pochLagX0oPf9AeyyGpmEhV?gv=true',
      options: [
        { id: 'single', label: 'One profile', price: '£100 (initial chat, questionnaire, findings call & report)' }
      ]
    },
    'support': {
      role: 'parent', label: 'Support Sessions',
      calendlyUrl: 'https://calendly.com/thesensupportstudio/1-1-parent-tuition-clone',
      bookingUrl: 'https://calendar.google.com/calendar/appointments/schedules/AcZssZ2YMKZnUKxlUHv3pB_3qb3CTqttezkIBJIauYrYYdUAeCejJW0JgOgpjU7WKPOgtYW5T2FRlcE5?gv=true',
      options: [
        { id: 'single', label: 'Single hour', price: '£50 / hour, in person or online' }
      ]
    },
    'tuition-school': {
      role: 'school', label: '1:1 Pupil Tuition',
      calendlyUrl: 'https://calendly.com/thesensupportstudio/1-1-parent-tuition-clone-1',
      bookingUrl: 'https://calendar.google.com/calendar/appointments/schedules/AcZssZ2vUJ5ZnDaU7-h8wRRovDAmKYdr_v_Vxfi368blbPFs18KZgH5DfgtFbudTsuWmUTwzfmTETvtL?gv=true',
      options: [
        { id: 'single', label: 'Single session', price: '£60 / hour' },
        { id: 'pack', label: 'Term pack (7 sessions)', price: '£399 total (5% off)' }
      ]
    },
    'sensory-school': {
      role: 'school', label: 'Sensory Profile Builder',
      calendlyUrl: 'https://calendly.com/thesensupportstudio/sensory-profile-builder-parents-carers-clone',
      bookingUrl: 'https://calendar.google.com/calendar/appointments/schedules/AcZssZ1j5Sw5vHALvL4lUI6nTSijEanCKYruOTMmW6RANHI4597a_MScCawb8jwaE-wnpqBGUsf_pe_t?gv=true',
      options: [
        { id: 'single', label: 'Single profile', price: '£100 per profile' },
        { id: 'pack', label: 'Pack of 5 profiles', price: '£475 total (5% off)' }
      ]
    },
    'sentence-steps': {
      role: 'school', label: 'Sentence Steps Intervention',
      calendlyUrl: 'https://calendly.com/thesensupportstudio/brick-buddies-intervention-schools-clone',
      options: [
        { id: 'single', label: 'Single hour (2 sessions, up to 4 pupils)', price: '£100 / hour' },
        { id: 'pack', label: 'Term pack (7 x 1hr slots)', price: '£665 total (5% off)' }
      ]
    },
    'build-buddies': {
      role: 'school', label: 'Build Buddies Intervention',
      calendlyUrl: 'https://calendly.com/thesensupportstudio/1-1-tuition-schools-clone',
      bookingUrl: 'https://calendar.google.com/calendar/appointments/AcZssZ1VVcjc9sLchWThU2bNG7O99FDydTmXkrJ3-Qk=?gv=true',
      options: [
        { id: 'single', label: 'Single hour (2 sessions, up to 3 pupils)', price: '£100 / hour' },
        { id: 'pack', label: 'Term pack (7 x 1hr slots)', price: '£665 total (5% off)' }
      ]
    }
  };

  var state = { role: '', serviceSlug: '', bookingType: '' };

  var els = {
    roleParent: document.getElementById('role-parent'),
    roleSchool: document.getElementById('role-school'),
    serviceField: document.getElementById('service-field'),
    serviceList: document.getElementById('service-list'),
    typeField: document.getElementById('type-field'),
    typeList: document.getElementById('type-list'),
    summary: document.getElementById('booking-summary'),
    summaryName: document.getElementById('summary-name'),
    summaryPrice: document.getElementById('summary-price'),
    calendlyHint: document.getElementById('calendly-hint'),
    calendlyWidget: document.getElementById('calendly-widget'),
    paymentHint: document.getElementById('payment-hint'),
    paymentButtons: document.getElementById('payment-buttons')
  };

  function paymentKeyFor(serviceSlug, optionId) {
    return optionId === 'pack' ? serviceSlug + '-pack' : serviceSlug;
  }

  function updatePayment(svc, chosenOption) {
    if (!els.paymentButtons) return;

    els.paymentButtons.innerHTML = '';

    if (!svc || !chosenOption) {
      els.paymentButtons.classList.add('hidden');
      els.paymentHint.textContent = 'Select a service above to see payment options.';
      return;
    }

    var key = paymentKeyFor(state.serviceSlug, chosenOption.id);
    var links = window.PAYMENT_LINKS || {};
    var invoiceServices = window.INVOICE_SERVICES || {};
    var payUrl = links[key];
    var canInvoice = !!invoiceServices[key];

    if (payUrl) {
      var payLink = document.createElement('a');
      payLink.href = payUrl;
      payLink.target = '_blank';
      payLink.rel = 'noopener';
      payLink.className = 'btn btn-primary';
      payLink.textContent = 'Pay by card (Tide) →';
      els.paymentButtons.appendChild(payLink);
    } else {
      var payPlaceholder = document.createElement('button');
      payPlaceholder.type = 'button';
      payPlaceholder.className = 'btn-disabled';
      payPlaceholder.disabled = true;
      payPlaceholder.textContent = 'Pay by card (coming soon)';
      els.paymentButtons.appendChild(payPlaceholder);
    }

    if (canInvoice) {
      var invoiceLink = document.createElement('a');
      invoiceLink.href = 'request-invoice.html?service=' + encodeURIComponent(key);
      invoiceLink.className = 'btn btn-outline';
      invoiceLink.textContent = 'Request an Invoice →';
      els.paymentButtons.appendChild(invoiceLink);
    }

    els.paymentHint.textContent = payUrl
      ? 'Pay online now to secure your place, or get in touch if you’d rather arrange it another way.'
      : 'Card payments are being set up for this service — in the meantime, get in touch' + (canInvoice ? ', or request an invoice below' : '') + '.';
    els.paymentButtons.classList.remove('hidden');
  }

  var CALENDLY_BRAND_PARAMS = 'background_color=fbfaf5&text_color=2d5439&primary_color=a0daad';

  function brandedCalendlyUrl(url) {
    return url + (url.indexOf('?') === -1 ? '?' : '&') + CALENDLY_BRAND_PARAMS;
  }

  function waitForCalendly(callback, attemptsLeft) {
    if (window.Calendly) {
      callback();
      return;
    }
    if (attemptsLeft <= 0) return;
    setTimeout(function () { waitForCalendly(callback, attemptsLeft - 1); }, 150);
  }

  function updateCalendly(svc) {
    if (!els.calendlyWidget) return;

    if (!svc || (!svc.bookingUrl && !svc.calendlyUrl)) {
      els.calendlyHint.classList.remove('hidden');
      els.calendlyWidget.classList.add('hidden');
      els.calendlyWidget.innerHTML = '';
      els.calendlyWidget.removeAttribute('data-current-url');
      return;
    }

    if (svc.bookingUrl) {
      if (els.calendlyWidget.getAttribute('data-current-url') === svc.bookingUrl) return;

      els.calendlyHint.classList.add('hidden');
      els.calendlyWidget.classList.remove('hidden');
      els.calendlyWidget.setAttribute('data-current-url', svc.bookingUrl);
      els.calendlyWidget.style.minWidth = '';
      els.calendlyWidget.style.width = '';
      els.calendlyWidget.style.height = '';
      els.calendlyWidget.innerHTML = '';

      var iframe = document.createElement('iframe');
      iframe.src = svc.bookingUrl;
      iframe.style.border = '0';
      iframe.width = '100%';
      iframe.height = '700';
      iframe.setAttribute('frameborder', '0');
      els.calendlyWidget.appendChild(iframe);
      return;
    }

    if (els.calendlyWidget.getAttribute('data-current-url') === svc.calendlyUrl) return;

    els.calendlyHint.classList.add('hidden');
    els.calendlyWidget.classList.remove('hidden');
    els.calendlyWidget.setAttribute('data-current-url', svc.calendlyUrl);
    els.calendlyWidget.style.minWidth = '320px';
    els.calendlyWidget.style.width = '100%';
    els.calendlyWidget.style.height = '950px';
    els.calendlyWidget.innerHTML = '';

    waitForCalendly(function () {
      window.Calendly.initInlineWidget({
        url: brandedCalendlyUrl(svc.calendlyUrl),
        parentElement: els.calendlyWidget
      });
    }, 40);
  }

  function selectRole(role) {
    state.role = role;
    state.serviceSlug = '';
    state.bookingType = '';
    render();
  }

  function selectService(slug) {
    state.serviceSlug = slug;
    state.bookingType = '';
    render();
  }

  function selectType(typeId) {
    state.bookingType = typeId;
    render();
  }

  function render() {
    els.roleParent.classList.toggle('active', state.role === 'parent');
    els.roleSchool.classList.toggle('active', state.role === 'school');

    var slugsForRole = state.role
      ? Object.keys(SERVICES).filter(function (k) { return SERVICES[k].role === state.role; })
      : [];

    els.serviceField.classList.toggle('hidden', !state.role);
    els.serviceList.innerHTML = '';
    slugsForRole.forEach(function (slug) {
      var svc = SERVICES[slug];
      var row = document.createElement('button');
      row.type = 'button';
      row.className = 'service-row' + (state.serviceSlug === slug ? ' active' : '');
      row.innerHTML = '<span>' + svc.label + '</span><span class="from-price">' + svc.options[0].price + '</span>';
      row.addEventListener('click', function () { selectService(slug); });
      els.serviceList.appendChild(row);
    });

    var svc = state.serviceSlug ? SERVICES[state.serviceSlug] : null;
    updateCalendly(svc);
    var showBookingType = !!(svc && svc.options.length > 1);

    els.typeField.classList.toggle('hidden', !showBookingType);
    els.typeList.innerHTML = '';
    if (svc) {
      svc.options.forEach(function (opt) {
        var active = showBookingType
          ? state.bookingType === opt.id
          : true;
        var card = document.createElement('button');
        card.type = 'button';
        card.className = 'type-card' + (active ? ' active' : '');
        card.innerHTML = '<span class="top">' + opt.label + '</span><span class="bottom">' + opt.price + '</span>';
        card.addEventListener('click', function () { selectType(opt.id); });
        els.typeList.appendChild(card);
      });
    }

    var effectiveType = svc ? (svc.options.length > 1 ? state.bookingType : svc.options[0].id) : '';
    var chosenOption = svc ? svc.options.filter(function (o) { return o.id === effectiveType; })[0] : null;
    var hasFullSelection = !!(svc && chosenOption);

    els.summary.classList.toggle('hidden', !hasFullSelection);
    if (hasFullSelection) {
      els.summaryName.textContent = svc.label + ' — ' + chosenOption.label;
      els.summaryPrice.textContent = chosenOption.price;
    }

    updatePayment(svc, chosenOption);
  }

  els.roleParent.addEventListener('click', function () { selectRole('parent'); });
  els.roleSchool.addEventListener('click', function () { selectRole('school'); });

  try {
    var params = new URLSearchParams(window.location.search);
    var service = params.get('service');
    if (service && SERVICES[service]) {
      state.role = SERVICES[service].role;
      state.serviceSlug = service;
    }
  } catch (e) {}

  render();
})();
