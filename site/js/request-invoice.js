(function () {
  var form = document.getElementById('invoice-form');
  var success = document.getElementById('invoice-success');
  var errorBox = document.getElementById('invoice-error');
  var nameEl = document.getElementById('invoice-service-name');
  var priceEl = document.getElementById('invoice-service-price');
  var ledeEl = document.getElementById('invoice-service-lede');

  var params = new URLSearchParams(window.location.search);
  var serviceKey = params.get('service') || '';
  var svc = (window.INVOICE_SERVICES || {})[serviceKey];

  if (svc) {
    nameEl.textContent = svc.label;
    priceEl.textContent = svc.price;
    ledeEl.textContent = 'Requesting an invoice for: ' + svc.label + '.';
  } else {
    nameEl.textContent = 'Not specified';
    priceEl.textContent = '—';
  }

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

    var payload = {
      service: serviceKey,
      serviceLabel: svc ? svc.label : '',
      servicePrice: svc ? svc.price : '',
      schoolName: document.getElementById('school-name').value.trim(),
      contactName: document.getElementById('contact-name').value.trim(),
      contactEmail: document.getElementById('contact-email').value.trim(),
      poNumber: document.getElementById('po-number').value.trim(),
      notes: document.getElementById('invoice-notes').value.trim()
    };

    fetch('/api/request-invoice', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
      .then(function (res) { return res.json().then(function (data) { return { ok: res.ok, data: data }; }); })
      .then(function (result) {
        if (!result.ok) {
          throw new Error((result.data && result.data.error) || 'Something went wrong sending your request.');
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
