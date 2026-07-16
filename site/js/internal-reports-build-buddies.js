(function () {
  var ROLES = ['Builder', 'Supplier', 'Engineer'];

  var SKILLS = [
    'Asking for more information',
    'Collaborative play',
    'Giving concise instructions',
    'Listening',
    'Interacting with peers',
    'Inviting peers',
    'Joining in',
    'Parallel play',
    'Recognising worry',
    'Recognising worry & applying strategies',
    'Showing interest in peers',
    'Taking turns',
    'Problem solving'
  ];

  var PUPIL_COUNT = 3;

  var state = {
    step: 0,
    session: { schoolName: '', clientEmail: '', ccEmail: '', sessionDate: '' },
    pupils: []
  };

  for (var p = 0; p < PUPIL_COUNT; p++) {
    state.pupils.push({ pupilName: '', role: '', skills: {}, notes: '' });
  }

  var TOTAL_STEPS = 1 + PUPIL_COUNT;

  var root = document.getElementById('wizard-root');
  var progressEl = document.getElementById('wizard-progress');
  var errorBox = document.getElementById('report-error');
  var successBox = document.getElementById('report-success');
  var successDetail = document.getElementById('report-success-detail');
  var wizardCard = document.getElementById('wizard-card');

  if (!root) return;

  function todayIso() {
    var d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }

  function el(tag, attrs, children) {
    var node = document.createElement(tag);
    attrs = attrs || {};
    Object.keys(attrs).forEach(function (k) {
      if (k === 'class') node.className = attrs[k];
      else if (k === 'text') node.textContent = attrs[k];
      else node.setAttribute(k, attrs[k]);
    });
    (children || []).forEach(function (c) { if (c) node.appendChild(c); });
    return node;
  }

  function renderSessionStep() {
    var wrap = el('div', {});
    wrap.appendChild(el('h2', { text: 'Session details', class: 'step-title' }));

    var row1 = el('div', { class: 'internal-form-row' });
    var schoolField = el('div', { class: 'form-field' }, [el('label', { text: 'School / recipient name', for: 'school-name' })]);
    var schoolInput = el('input', { type: 'text', id: 'school-name', placeholder: 'e.g. Oakwood Primary — SENCO' });
    schoolInput.value = state.session.schoolName;
    schoolInput.addEventListener('input', function () { state.session.schoolName = schoolInput.value; });
    schoolField.appendChild(schoolInput);

    var dateField = el('div', { class: 'form-field' }, [el('label', { text: 'Session date', for: 'session-date' })]);
    var dateInput = el('input', { type: 'date', id: 'session-date' });
    dateInput.value = state.session.sessionDate || todayIso();
    state.session.sessionDate = dateInput.value;
    dateInput.addEventListener('input', function () { state.session.sessionDate = dateInput.value; });
    dateField.appendChild(dateInput);

    row1.appendChild(schoolField);
    row1.appendChild(dateField);

    var row2 = el('div', { class: 'internal-form-row' });
    var emailField = el('div', { class: 'form-field' }, [el('label', { text: 'Recipient email', for: 'client-email' })]);
    var emailInput = el('input', { type: 'email', id: 'client-email', placeholder: 'senco@school.example.com' });
    emailInput.value = state.session.clientEmail;
    emailInput.addEventListener('input', function () { state.session.clientEmail = emailInput.value; });
    emailField.appendChild(emailInput);

    var ccField = el('div', { class: 'form-field' }, [el('label', { text: 'CC email (optional)', for: 'cc-email' })]);
    var ccInput = el('input', { type: 'email', id: 'cc-email' });
    ccInput.value = state.session.ccEmail;
    ccInput.addEventListener('input', function () { state.session.ccEmail = ccInput.value; });
    ccField.appendChild(ccInput);

    row2.appendChild(emailField);
    row2.appendChild(ccField);

    wrap.appendChild(row1);
    wrap.appendChild(row2);
    return wrap;
  }

  function renderPupilStep(index) {
    var pupil = state.pupils[index];
    var wrap = el('div', {});
    wrap.appendChild(el('h2', { text: 'Pupil ' + (index + 1), class: 'step-title' }));
    wrap.appendChild(el('p', { text: 'Leave the name blank if this pupil wasn\'t in this session — their page will be left out of the report.', class: 'step-subtitle' }));

    var nameField = el('div', { class: 'form-field' });
    nameField.appendChild(el('label', { text: 'Pupil name', for: 'pupil-name-' + index }));
    var nameInput = el('input', { type: 'text', id: 'pupil-name-' + index, placeholder: 'e.g. J. Smith' });
    nameInput.value = pupil.pupilName;
    nameInput.addEventListener('input', function () { pupil.pupilName = nameInput.value; });
    nameField.appendChild(nameInput);
    wrap.appendChild(nameField);

    var roleField = el('div', { class: 'form-field' });
    roleField.appendChild(el('label', { text: 'Role in this session' }));
    var roleRow = el('div', { class: 'toggle-row' });
    ROLES.forEach(function (roleOpt, i) {
      var id = 'pupil-' + index + '-role-' + i;
      var input = el('input', { type: 'radio', name: 'pupil-' + index + '-role', id: id, value: roleOpt });
      input.checked = pupil.role === roleOpt;
      input.addEventListener('change', function () { pupil.role = roleOpt; });
      roleRow.appendChild(el('label', { class: 'pill-option', for: id }, [input, document.createTextNode(roleOpt)]));
    });
    roleField.appendChild(roleRow);
    wrap.appendChild(roleField);

    var skillsField = el('div', { class: 'form-field' });
    skillsField.appendChild(el('label', { text: 'Build Buddies skills' }));
    var skillsList = el('div', { class: 'skills-list' });
    SKILLS.forEach(function (skill, si) {
      var row = el('div', { class: 'skill-row' });
      row.appendChild(el('span', { class: 'skill-label', text: skill }));
      var toggle = el('div', { class: 'toggle-row' });
      ['Achieved', 'Working towards'].forEach(function (status, oi) {
        var id = 'pupil-' + index + '-skill-' + si + '-' + oi;
        var input = el('input', { type: 'radio', name: 'pupil-' + index + '-skill-' + si, id: id, value: status });
        input.checked = pupil.skills[skill] === status;
        input.addEventListener('change', function () { pupil.skills[skill] = status; });
        toggle.appendChild(el('label', { class: 'pill-option', for: id }, [input, document.createTextNode(status)]));
      });
      row.appendChild(toggle);
      skillsList.appendChild(row);
    });
    skillsField.appendChild(skillsList);
    wrap.appendChild(skillsField);

    var notesField = el('div', { class: 'form-field' });
    notesField.appendChild(el('label', { text: 'Additional information (optional)', for: 'pupil-notes-' + index }));
    var notesInput = el('textarea', { id: 'pupil-notes-' + index, rows: '3', placeholder: 'Anything else worth noting for this pupil...' });
    notesInput.value = pupil.notes;
    notesInput.addEventListener('input', function () { pupil.notes = notesInput.value; });
    notesField.appendChild(notesInput);
    wrap.appendChild(notesField);

    return wrap;
  }

  function stepLabel(i) {
    if (i === 0) return 'Session details';
    return 'Pupil ' + i;
  }

  function render() {
    root.innerHTML = '';
    var content = state.step === 0 ? renderSessionStep() : renderPupilStep(state.step - 1);
    root.appendChild(content);
    progressEl.textContent = 'Step ' + (state.step + 1) + ' of ' + TOTAL_STEPS + ' — ' + stepLabel(state.step);

    document.getElementById('wizard-back').disabled = state.step === 0;
    var nextBtn = document.getElementById('wizard-next');
    var submitBtn = document.getElementById('wizard-submit');
    if (state.step === TOTAL_STEPS - 1) {
      nextBtn.classList.add('hidden');
      submitBtn.classList.remove('hidden');
    } else {
      nextBtn.classList.remove('hidden');
      submitBtn.classList.add('hidden');
    }
    window.scrollTo(0, 0);
  }

  var emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  function validateSessionStep() {
    if (!state.session.schoolName.trim() || !state.session.clientEmail.trim() || !state.session.sessionDate) {
      return 'Please fill in school name, recipient email and session date.';
    }
    if (!emailRe.test(state.session.clientEmail.trim())) return 'Please check the recipient email address.';
    if (state.session.ccEmail.trim() && !emailRe.test(state.session.ccEmail.trim())) return 'Please check the CC email address.';
    return null;
  }

  function showError(msg) {
    errorBox.textContent = msg;
    errorBox.classList.remove('hidden');
    window.scrollTo(0, 0);
  }

  function clearError() {
    errorBox.classList.add('hidden');
    errorBox.textContent = '';
  }

  document.getElementById('wizard-back').addEventListener('click', function () {
    if (state.step > 0) { state.step -= 1; clearError(); render(); }
  });

  document.getElementById('wizard-next').addEventListener('click', function () {
    if (state.step === 0) {
      var err = validateSessionStep();
      if (err) { showError(err); return; }
    }
    clearError();
    state.step += 1;
    render();
  });

  function buildChildPages() {
    return state.pupils
      .filter(function (pupil) { return pupil.pupilName.trim(); })
      .map(function (pupil) {
        var sections = [];
        if (pupil.role) sections.push({ heading: 'Role', content: pupil.role });

        var skillLines = [];
        SKILLS.forEach(function (skill) {
          if (pupil.skills[skill]) skillLines.push(skill + ' — ' + pupil.skills[skill]);
        });
        if (skillLines.length) sections.push({ heading: 'Build Buddies skills', content: skillLines.join('\n') });

        if (pupil.notes.trim()) sections.push({ heading: 'Additional information', content: pupil.notes.trim() });

        return { pupilName: pupil.pupilName.trim(), sections: sections };
      });
  }

  document.getElementById('wizard-submit').addEventListener('click', function () {
    clearError();
    var childPages = buildChildPages();
    if (childPages.length === 0) {
      showError('Please add at least one pupil before sending.');
      return;
    }

    var payload = {
      title: 'Build Buddies Intervention Report',
      service: 'Build Buddies Root',
      clientLabel: 'School',
      clientName: state.session.schoolName.trim(),
      recipientName: state.session.schoolName.trim(),
      clientEmail: state.session.clientEmail.trim(),
      ccEmail: state.session.ccEmail.trim(),
      sessionDate: state.session.sessionDate,
      childPages: childPages,
      clientId: (window.SENClientContext && window.SENClientContext.clientId) || undefined
    };

    var submitBtn = document.getElementById('wizard-submit');
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
        successDetail.textContent = 'Sent to ' + payload.clientEmail + ' for the ' + payload.sessionDate + ' session (' + childPages.length + ' pupil page' + (childPages.length === 1 ? '' : 's') + ').';
        wizardCard.classList.add('hidden');
        successBox.classList.remove('hidden');
      })
      .catch(function (err) {
        showError(err.message || 'Something went wrong sending the report. Please try again.');
      })
      .finally(function () {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Send Report to School';
      });
  });

  if (document.getElementById('report-reset')) {
    document.getElementById('report-reset').addEventListener('click', function () {
      state.step = 0;
      state.session = { schoolName: '', clientEmail: '', ccEmail: '', sessionDate: todayIso() };
      state.pupils = [];
      for (var p = 0; p < PUPIL_COUNT; p++) {
        state.pupils.push({ pupilName: '', role: '', skills: {}, notes: '' });
      }
      clearError();
      successBox.classList.add('hidden');
      wizardCard.classList.remove('hidden');
      render();
    });
  }

  render();

  if (window.SENClientContext && window.SENClientContext.clientId) {
    window.SENClientContext.ready.then(function (client) {
      if (!client) return;
      window.SENClientContext.showBanner(client);
      if (client.school || client.parent_name) state.session.schoolName = client.school || client.parent_name;
      if (client.parent_email) state.session.clientEmail = client.parent_email;
      if (client.child_name) state.pupils[0].pupilName = client.child_name;
      if (state.step === 0) render();
    });
  }
})();
