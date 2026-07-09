(function () {
  var form = document.getElementById('report-form');
  var success = document.getElementById('report-success');
  var successDetail = document.getElementById('report-success-detail');
  var errorBox = document.getElementById('report-error');
  var submitBtn = document.getElementById('report-submit');
  var resetBtn = document.getElementById('report-reset');
  var dateInput = document.getElementById('session-date');
  var areaOtherCheck = document.getElementById('area-other-check');
  var areaOtherWrap = document.getElementById('area-other-wrap');
  var areaOtherDetail = document.getElementById('area-other-detail');
  var homeworkGroup = document.getElementById('homework-group');
  var homeworkDetailWrap = document.getElementById('homework-detail-wrap');
  var homeworkDetail = document.getElementById('homework-detail');

  if (!form) return;

  function todayIso() {
    var d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }

  if (dateInput && !dateInput.value) dateInput.value = todayIso();

  if (areaOtherCheck) {
    areaOtherCheck.addEventListener('change', function () {
      areaOtherWrap.classList.toggle('hidden', !areaOtherCheck.checked);
    });
  }

  if (homeworkGroup) {
    homeworkGroup.addEventListener('change', function (e) {
      if (e.target.name === 'homework') {
        homeworkDetailWrap.classList.toggle('hidden', e.target.value !== 'yes');
      }
    });
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

    var engagementEl = form.querySelector('input[name="engagement"]:checked');
    var homeworkEl = form.querySelector('input[name="homework"]:checked');
    var areas = Array.prototype.slice.call(form.querySelectorAll('input[name="areas"]:checked'))
      .map(function (el) { return el.value === 'Other' ? (areaOtherDetail.value.trim() || 'Other') : el.value; });

    var clientEmail = form.clientEmail.value.trim();
    var sessionDate = form.sessionDate.value;

    var sections = [
      { heading: 'Engagement today', content: engagementEl ? engagementEl.value : '' },
      { heading: 'Areas covered', content: areas.join(', ') },
      { heading: 'What we worked on', content: form.summary.value.trim() },
      {
        heading: 'Homework / practice set',
        content: homeworkEl
          ? (homeworkEl.value === 'yes' ? 'Yes — ' + (homeworkDetail.value.trim() || 'set, see above') : 'No')
          : ''
      },
      { heading: 'Next steps', content: form.nextSteps.value.trim() }
    ];

    var payload = {
      title: '1:1 Tuition Report',
      clientName: form.clientName.value.trim(),
      clientEmail: clientEmail,
      ccEmail: form.ccEmail.value.trim(),
      sessionDate: sessionDate,
      sections: sections
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
          var msg = (result.data && result.data.error) || 'Something went wrong sending the report.';
          if (result.data && result.data.detail) msg += ' (' + result.data.detail + ')';
          throw new Error(msg);
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
      if (dateInput) dateInput.value = todayIso();
      areaOtherWrap.classList.add('hidden');
      homeworkDetailWrap.classList.add('hidden');
      clearError();
      success.classList.add('hidden');
      form.classList.remove('hidden');
    });
  }
})();
