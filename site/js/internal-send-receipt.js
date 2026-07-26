(function () {
  var form = document.getElementById('receipt-send-form');
  var success = document.getElementById('receipt-send-success');
  var successDetail = document.getElementById('receipt-send-success-detail');
  var errorBox = document.getElementById('receipt-send-error');
  var submitBtn = document.getElementById('receipt-send-submit');
  var resetBtn = document.getElementById('receipt-send-reset');

  if (!form) return;

  var dateField = document.getElementById('receipt-date');
  if (dateField && !dateField.value) {
    var today = new Date();
    dateField.value = today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0') + '-' + String(today.getDate()).padStart(2, '0');
  }

  if (window.SENClientContext && window.SENClientContext.clientId) {
    window.SENClientContext.ready.then(function (client) {
      if (!client) return;
      window.SENClientContext.showBanner(client);
      if (client.parent_name) document.getElementById('recipient-name').value = client.parent_name;
      if (client.parent_email) document.getElementById('recipient-email').value = client.parent_email;
    });
  }

  function showError(message) {
    errorBox.textContent = message;
    errorBox.classList.remove('hidden');
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    errorBox.classList.add('hidden');

    var recipientEmail = document.getElementById('recipient-email').value.trim();

    var payload = {
      recipientName: document.getElementById('recipient-name').value.trim(),
      recipientEmail: recipientEmail,
      description: document.getElementById('receipt-description').value.trim(),
      amount: document.getElementById('receipt-amount').value,
      dateReceived: document.getElementById('receipt-date').value,
      paymentMethod: document.getElementById('receipt-method').value,
      notes: document.getElementById('receipt-notes').value.trim(),
      clientId: (window.SENClientContext && window.SENClientContext.clientId) || undefined
    };

    submitBtn.disabled = true;
    submitBtn.textContent = 'Sending…';

    fetch('/api/internal/send-receipt', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
      .then(function (res) { return res.json().then(function (data) { return { ok: res.ok, data: data }; }); })
      .then(function (result) {
        if (!result.ok) {
          var msg = (result.data && result.data.error) || 'Something went wrong sending the receipt.';
          if (result.data && result.data.detail) msg += ' (' + result.data.detail + ')';
          throw new Error(msg);
        }
        successDetail.textContent = 'Sent to ' + recipientEmail + '.';
        form.classList.add('hidden');
        success.classList.remove('hidden');
      })
      .catch(function (err) {
        showError(err.message || 'Something went wrong sending the receipt. Please try again.');
      })
      .finally(function () {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Send Receipt';
      });
  });

  if (resetBtn) {
    resetBtn.addEventListener('click', function () {
      form.reset();
      if (dateField) {
        var d = new Date();
        dateField.value = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
      }
      form.classList.remove('hidden');
      success.classList.add('hidden');
    });
  }
})();
