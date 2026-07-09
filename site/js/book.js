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
      options: [
        { id: 'single', label: 'One profile', price: '£80 (questionnaire, 1hr chat & report)' }
      ]
    },
    'support': {
      role: 'parent', label: 'Support Sessions',
      calendlyUrl: 'https://calendly.com/thesensupportstudio/1-1-parent-tuition-clone',
      options: [
        { id: 'single', label: 'Single hour', price: '£50 / hour, in person or online' }
      ]
    },
    'tuition-school': {
      role: 'school', label: '1:1 Pupil Tuition',
      calendlyUrl: 'https://calendly.com/thesensupportstudio/1-1-parent-tuition-clone-1',
      options: [
        { id: 'single', label: 'Single session', price: '£60 / hour' },
        { id: 'pack', label: 'Term pack (7 sessions)', price: '£399 total (5% off)' }
      ]
    },
    'sensory-school': {
      role: 'school', label: 'Sensory Profile Builder',
      calendlyUrl: 'https://calendly.com/thesensupportstudio/sensory-profile-builder-parents-carers-clone',
      options: [
        { id: 'single', label: 'Single profile', price: '£80 / hour' },
        { id: 'pack', label: 'Pack of 5 profiles', price: '£380 total (5% off)' }
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
    calendlyWidget: document.getElementById('calendly-widget')
  };

  var CALENDLY_BRAND_PARAMS = 'background_color=2d5439&text_color=f8f1de&primary_color=f8f1de';

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

    if (!svc || !svc.calendlyUrl) {
      els.calendlyHint.classList.remove('hidden');
      els.calendlyWidget.classList.add('hidden');
      els.calendlyWidget.innerHTML = '';
      els.calendlyWidget.removeAttribute('data-current-url');
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
