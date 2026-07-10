(function () {
  var form = document.getElementById('report-form');
  var success = document.getElementById('report-success');
  var successDetail = document.getElementById('report-success-detail');
  var errorBox = document.getElementById('report-error');
  var submitBtn = document.getElementById('report-submit');
  var resetBtn = document.getElementById('report-reset');
  var dateInput = document.getElementById('session-date');
  var topicOtherCheck = document.getElementById('topic-other-check');
  var topicOtherWrap = document.getElementById('topic-other-wrap');
  var topicOtherDetail = document.getElementById('topic-other-detail');

  if (!form) return;

  function todayIso() {
    var d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }

  if (dateInput && !dateInput.value) dateInput.value = todayIso();

  if (topicOtherCheck) {
    topicOtherCheck.addEventListener('change', function () {
      topicOtherWrap.classList.toggle('hidden', !topicOtherCheck.checked);
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

    var topics = Array.prototype.slice.call(form.querySelectorAll('input[name="topics"]:checked'))
      .map(function (el) { return el.value === 'Other' ? (topicOtherDetail.value.trim() || 'Other') : el.value; });

    var clientEmail = form.clientEmail.value.trim();
    var sessionDate = form.sessionDate.value;

    var sections = [
      { heading: 'What we discussed', content: topics.join(', ') },
      { heading: 'Where the family is finding things hardest / support requested', content: form.struggles.value.trim() },
      { heading: 'Guidance & suggestions offered', content: form.suggestions.value.trim() },
      { heading: 'Suggested next steps', content: form.nextSteps.value.trim() }
    ];

    var payload = {
      title: 'Support Session Summary',
      service: 'Support Session Root',
      clientLabel: 'Family',
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
          var msg = (result.data && result.data.error) || 'Something went wrong sending the summary.';
          if (result.data && result.data.detail) msg += ' (' + result.data.detail + ')';
          throw new Error(msg);
        }
        successDetail.textContent = 'Sent to ' + payload.clientEmail + ' for the ' + payload.sessionDate + ' session.';
        form.classList.add('hidden');
        success.classList.remove('hidden');
      })
      .catch(function (err) {
        showError(err.message || 'Something went wrong sending the summary. Please try again.');
      })
      .finally(function () {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Send Summary to Parent';
      });
  });

  if (resetBtn) {
    resetBtn.addEventListener('click', function () {
      form.reset();
      if (dateInput) dateInput.value = todayIso();
      topicOtherWrap.classList.add('hidden');
      clearError();
      success.classList.add('hidden');
      form.classList.remove('hidden');
    });
  }
})();
