(function () {
  var form = document.getElementById('report-form');
  var success = document.getElementById('report-success');
  var successDetail = document.getElementById('report-success-detail');
  var errorBox = document.getElementById('report-error');
  var submitBtn = document.getElementById('report-submit');
  var resetBtn = document.getElementById('report-reset');
  var dateInput = document.getElementById('session-date');

  if (!form) return;

  if (dateInput && !dateInput.value) {
    var today = new Date();
    var yyyy = today.getFullYear();
    var mm = String(today.getMonth() + 1).padStart(2, '0');
    var dd = String(today.getDate()).padStart(2, '0');
    dateInput.value = yyyy + '-' + mm + '-' + dd;
  }

  function showError(message) {
    errorBox.textContent = message;
    errorBox.classList.remove('hidden');
  }

  function clearError() {
    errorBox.classList.add('hidden');
    errorBox.textContent = '';
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    clearError();

    var payload = {
      clientName: form.clientName.value.trim(),
      clientEmail: form.clientEmail.value.trim(),
      ccEmail: form.ccEmail.value.trim(),
      sessionDate: form.sessionDate.value,
      serviceType: form.serviceType.value,
      summary: form.summary.value.trim(),
      nextSteps: form.nextSteps.value.trim()
    };

    submitBtn.disabled = true;
    submitBtn.textContent = 'Sending...';

    fetch('/api/send-report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
      .then(function (res) {
        return res.json().then(function (data) {
          return { ok: res.ok, data: data };
        });
      })
      .then(function (result) {
        if (!result.ok) {
          throw new Error(result.data && result.data.error ? result.data.error : 'Something went wrong sending the report.');
        }
        successDetail.textContent = 'Sent to ' + payload.clientEmail + ' for the ' + payload.sessionDate + ' session.';
        form.classList.add('hidden');
        success.classList.remove('hidden');
      })
      .catch(function (err) {
        showError(err.message || 'Something went wrong sending the report. Please try again.');
      })
      .finally(function () {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Send Report to Client';
      });
  });

  if (resetBtn) {
    resetBtn.addEventListener('click', function () {
      form.reset();
      if (dateInput) {
        var today = new Date();
        dateInput.value = today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0') + '-' + String(today.getDate()).padStart(2, '0');
      }
      success.classList.add('hidden');
      form.classList.remove('hidden');
    });
  }
})();
