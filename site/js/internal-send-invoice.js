(function () {
  var form = document.getElementById('invoice-send-form');
  var success = document.getElementById('invoice-send-success');
  var successDetail = document.getElementById('invoice-send-success-detail');
  var errorBox = document.getElementById('invoice-send-error');
  var submitBtn = document.getElementById('invoice-send-submit');
  var resetBtn = document.getElementById('invoice-send-reset');
  var fileInput = document.getElementById('invoice-file');
  var serviceSelect = document.getElementById('invoice-service');
  var serviceOtherWrap = document.getElementById('service-other-wrap');
  var serviceOtherDetail = document.getElementById('service-other-detail');

  if (!form) return;

  serviceSelect.addEventListener('change', function () {
    serviceOtherWrap.classList.toggle('hidden', serviceSelect.value !== 'other');
  });

  if (window.SENClientContext && window.SENClientContext.clientId) {
    window.SENClientContext.ready.then(function (client) {
      if (!client) return;
      window.SENClientContext.showBanner(client);
      if (client.school || client.parent_name) document.getElementById('recipient-name').value = client.school || client.parent_name;
      if (client.parent_email) document.getElementById('recipient-email').value = client.parent_email;
    });
  }

  var MAX_FILE_BYTES = 8 * 1024 * 1024; // 8MB

  function showError(message) {
    errorBox.textContent = message;
    errorBox.classList.remove('hidden');
  }

  function fileToBase64(file) {
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onload = function () {
        var result = reader.result;
        resolve(result.split(',')[1]);
      };
      reader.onerror = function () { reject(new Error('Could not read the selected file.')); };
      reader.readAsDataURL(file);
    });
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    errorBox.classList.add('hidden');

    var file = fileInput.files[0];
    if (!file) {
      showError('Please choose an invoice PDF to attach.');
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      showError('That file is too large (max 8MB). Please compress the PDF and try again.');
      return;
    }

    var service = serviceSelect.value === 'other'
      ? serviceOtherDetail.value.trim()
      : serviceSelect.value;

    if (!service) {
      showError('Please choose or describe the service this invoice is for.');
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = 'Sending…';

    var recipientEmail = document.getElementById('recipient-email').value.trim();

    fileToBase64(file)
      .then(function (base64) {
        var payload = {
          recipientName: document.getElementById('recipient-name').value.trim(),
          recipientEmail: recipientEmail,
          service: service,
          fileName: file.name,
          fileBase64: base64,
          clientId: (window.SENClientContext && window.SENClientContext.clientId) || undefined
        };

        return fetch('/api/send-invoice', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      })
      .then(function (res) { return res.json().then(function (data) { return { ok: res.ok, data: data }; }); })
      .then(function (result) {
        if (!result.ok) {
          var msg = (result.data && result.data.error) || 'Something went wrong sending the invoice.';
          if (result.data && result.data.detail) msg += ' (' + result.data.detail + ')';
          throw new Error(msg);
        }
        successDetail.textContent = 'Sent to ' + recipientEmail + '.';
        form.classList.add('hidden');
        success.classList.remove('hidden');
      })
      .catch(function (err) {
        showError(err.message || 'Something went wrong sending the invoice. Please try again.');
      })
      .finally(function () {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Send Invoice';
      });
  });

  if (resetBtn) {
    resetBtn.addEventListener('click', function () {
      form.reset();
      form.classList.remove('hidden');
      success.classList.add('hidden');
    });
  }
})();
