(function () {
  // Mirrors functions/api/_lib/serviceCatalog.js (server-side source of
  // truth for pricing) - same small duplicated display copy used in
  // client-portal.js, kept in sync by hand since there's no build step
  // joining browser/worker code in this project.
  var SERVICES = {
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

  var state = { role: '', serviceSlug: '', type: '' };

  var els = {
    roleParent: document.getElementById('role-parent'),
    roleSchool: document.getElementById('role-school'),
    serviceField: document.getElementById('service-field'),
    serviceList: document.getElementById('service-list'),
    typeField: document.getElementById('type-field'),
    typeList: document.getElementById('type-list'),
    summary: document.getElementById('booking-summary'),
    summaryName: document.getElementById('summary-name'),
    summaryPrice: document.getElementById('summary-price')
  };

  function render() {
    els.roleParent.classList.toggle('active', state.role === 'parent');
    els.roleSchool.classList.toggle('active', state.role === 'school');

    var slugs = state.role
      ? Object.keys(SERVICES).filter(function (k) { return SERVICES[k].role === state.role; })
      : [];

    els.serviceField.classList.toggle('hidden', !state.role);
    els.serviceList.innerHTML = '';
    slugs.forEach(function (slug) {
      var svc = SERVICES[slug];
      var row = document.createElement('button');
      row.type = 'button';
      row.className = 'service-row' + (state.serviceSlug === slug ? ' active' : '');
      row.innerHTML = '<span>' + svc.label + '</span><span class="from-price">' + svc.single.price + '</span>';
      row.addEventListener('click', function () {
        state.serviceSlug = slug;
        state.type = '';
        render();
      });
      els.serviceList.appendChild(row);
    });

    var svc = state.serviceSlug ? SERVICES[state.serviceSlug] : null;
    var showType = !!(svc && svc.pack);
    if (svc && !showType) state.type = 'single';

    els.typeField.classList.toggle('hidden', !showType);
    els.typeList.innerHTML = '';
    if (showType) {
      ['single', 'pack'].forEach(function (typeKey) {
        var opt = svc[typeKey];
        if (!opt) return;
        var card = document.createElement('button');
        card.type = 'button';
        card.className = 'type-card' + (state.type === typeKey ? ' active' : '');
        card.innerHTML = '<span class="top">' + opt.label + '</span><span class="bottom">' + opt.price + '</span>';
        card.addEventListener('click', function () {
          state.type = typeKey;
          render();
        });
        els.typeList.appendChild(card);
      });
    }

    var chosenOption = svc && state.type ? svc[state.type] : null;
    els.summary.classList.toggle('hidden', !chosenOption);
    if (chosenOption) {
      els.summaryName.textContent = svc.label + ' - ' + chosenOption.label;
      els.summaryPrice.textContent = chosenOption.price;
    }
  }

  els.roleParent.addEventListener('click', function () {
    state = { role: 'parent', serviceSlug: '', type: '' };
    render();
  });
  els.roleSchool.addEventListener('click', function () {
    state = { role: 'school', serviceSlug: '', type: '' };
    render();
  });

  try {
    var params = new URLSearchParams(window.location.search);
    var service = params.get('service');
    if (service && SERVICES[service]) {
      state.role = SERVICES[service].role;
      state.serviceSlug = service;
    }
  } catch (e) {}

  render();

  var form = document.getElementById('enquiry-form');
  var success = document.getElementById('enquiry-success');
  var errorBox = document.getElementById('enquiry-error');
  if (!form) return;

  function showError(message) {
    errorBox.textContent = message;
    errorBox.classList.remove('hidden');
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    errorBox.classList.add('hidden');

    var submitBtn = form.querySelector('.form-submit');
    submitBtn.disabled = true;

    var svc = state.serviceSlug ? SERVICES[state.serviceSlug] : null;
    var chosenOption = svc && state.type ? svc[state.type] : null;
    var serviceLabel = svc ? svc.label + (chosenOption ? ' - ' + chosenOption.label : '') : '';
    var message = document.getElementById('enquiry-message').value.trim();

    var payload = {
      name: document.getElementById('enquiry-name').value.trim(),
      email: document.getElementById('enquiry-email').value.trim(),
      role: state.role,
      serviceLabel: serviceLabel,
      message: message || (serviceLabel ? 'Interested in: ' + serviceLabel : 'Enquiry via Enquire Now page')
    };

    fetch('/api/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
      .then(function (res) { return res.json().then(function (data) { return { ok: res.ok, data: data }; }); })
      .then(function (result) {
        if (!result.ok) {
          throw new Error((result.data && result.data.error) || 'Something went wrong sending your enquiry.');
        }
        form.classList.add('hidden');
        success.classList.remove('hidden');
      })
      .catch(function (err) {
        showError(err.message || 'Something went wrong. Please try again, or email hello@sensupportstudio.com directly.');
      })
      .finally(function () {
        submitBtn.disabled = false;
      });
  });
})();
