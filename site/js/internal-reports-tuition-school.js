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
  var deliveredGroup = document.getElementById('delivered-group');
  var deliveredDetailWrap = document.getElementById('delivered-detail-wrap');
  var deliveredDetail = document.getElementById('delivered-detail');
  var targetsContainer = document.getElementById('targets-container');
  var addTargetBtn = document.getElementById('add-target');

  if (!form) return;

  function todayIso() {
    var d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }

  if (dateInput && !dateInput.value) dateInput.value = todayIso();

  if (window.SENClientContext && window.SENClientContext.clientId) {
    window.SENClientContext.ready.then(function (client) {
      if (!client) return;
      window.SENClientContext.showBanner(client);
      if (client.child_name) document.getElementById('pupil-name').value = client.child_name;
      if (client.school || client.parent_name) document.getElementById('school-name').value = client.school || client.parent_name;
      if (client.parent_email) document.getElementById('client-email').value = client.parent_email;
    });
  }

  if (areaOtherCheck) {
    areaOtherCheck.addEventListener('change', function () {
      areaOtherWrap.classList.toggle('hidden', !areaOtherCheck.checked);
    });
  }

  if (deliveredGroup) {
    deliveredGroup.addEventListener('change', function (e) {
      if (e.target.name === 'delivered') {
        deliveredDetailWrap.classList.toggle('hidden', e.target.value !== 'no');
      }
    });
  }

  var targetCount = 0;

  function addTargetRow() {
    targetCount += 1;
    var idx = targetCount;
    var row = document.createElement('div');
    row.className = 'target-row';
    row.dataset.index = idx;

    var textWrap = document.createElement('div');
    textWrap.className = 'target-text-wrap';
    var textInput = document.createElement('input');
    textInput.type = 'text';
    textInput.placeholder = 'Target ' + idx + ' — e.g. Blend CVC words independently';
    textInput.className = 'target-text';
    textWrap.appendChild(textInput);

    var removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.className = 'target-remove-btn';
    removeBtn.textContent = 'Remove';
    removeBtn.addEventListener('click', function () {
      row.remove();
    });
    textWrap.appendChild(removeBtn);

    var progressRow = document.createElement('div');
    progressRow.className = 'toggle-row';
    ['Not yet met', 'Emerging', 'Achieved'].forEach(function (label) {
      var id = 'target-' + idx + '-' + label.replace(/\s+/g, '-').toLowerCase();
      var wrap = document.createElement('label');
      wrap.className = 'pill-option';
      wrap.setAttribute('for', id);
      var input = document.createElement('input');
      input.type = 'radio';
      input.name = 'target-progress-' + idx;
      input.id = id;
      input.value = label;
      wrap.appendChild(input);
      wrap.appendChild(document.createTextNode(label));
      progressRow.appendChild(wrap);
    });

    row.appendChild(textWrap);
    row.appendChild(progressRow);
    targetsContainer.appendChild(row);
  }

  addTargetRow();
  addTargetBtn.addEventListener('click', addTargetRow);

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
    var deliveredEl = form.querySelector('input[name="delivered"]:checked');
    var areas = Array.prototype.slice.call(form.querySelectorAll('input[name="areas"]:checked'))
      .map(function (el) { return el.value === 'Other' ? (areaOtherDetail.value.trim() || 'Other') : el.value; });
    var coreStandards = Array.prototype.slice.call(form.querySelectorAll('input[name="coreStandards"]:checked'))
      .map(function (el) { return el.value; });

    var targetRows = Array.prototype.slice.call(targetsContainer.querySelectorAll('.target-row'));
    var targetLines = [];
    targetRows.forEach(function (row) {
      var text = row.querySelector('.target-text').value.trim();
      var progressEl = row.querySelector('input[type="radio"]:checked');
      if (text) {
        targetLines.push(text + (progressEl ? ' — ' + progressEl.value : ' — no progress rating selected'));
      }
    });

    var clientEmail = form.clientEmail.value.trim();
    var sessionDate = form.sessionDate.value;
    var pupilName = form.pupilName.value.trim();
    var schoolName = form.schoolName.value.trim();
    var hoursLogged = form.hoursLogged.value.trim();

    var sections = [
      { heading: 'School', content: schoolName },
      { heading: 'Kent Core Standards area', content: coreStandards.join(', ') },
      { heading: 'Hours logged', content: hoursLogged },
      {
        heading: 'Session delivered as planned',
        content: deliveredEl
          ? (deliveredEl.value === 'no' ? 'No — ' + (deliveredDetail.value.trim() || 'see notes') : 'Yes')
          : ''
      },
      { heading: 'Engagement today', content: engagementEl ? engagementEl.value : '' },
      { heading: 'Areas covered', content: areas.join(', ') },
      { heading: 'Targets worked on this session', content: targetLines.join('\n') },
      { heading: 'Session detail / evidence notes', content: form.summary.value.trim() },
      { heading: 'Recommendations / next steps', content: form.nextSteps.value.trim() }
    ];

    var payload = {
      title: '1:1 Pupil Tuition Report',
      service: 'Tuition Root',
      clientLabel: 'Pupil',
      recipientName: schoolName,
      clientName: pupilName,
      clientEmail: clientEmail,
      ccEmail: form.ccEmail.value.trim(),
      sessionDate: sessionDate,
      sections: sections,
      clientId: (window.SENClientContext && window.SENClientContext.clientId) || undefined
    };

    submitBtn.disabled = true;
    submitBtn.textContent = 'Sending...';

    fetch('/api/send-report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
      .then(function (res) {
        return res.json().then(function (data) { return { ok: res.ok, data: data }; });
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
        submitBtn.textContent = 'Send Report to School';
      });
  });

  if (resetBtn) {
    resetBtn.addEventListener('click', function () {
      form.reset();
      if (dateInput) dateInput.value = todayIso();
      areaOtherWrap.classList.add('hidden');
      deliveredDetailWrap.classList.add('hidden');
      targetsContainer.innerHTML = '';
      targetCount = 0;
      addTargetRow();
      clearError();
      success.classList.add('hidden');
      form.classList.remove('hidden');
    });
  }
})();
