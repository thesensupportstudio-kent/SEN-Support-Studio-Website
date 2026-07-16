(function () {
  var FOUNDATIONAL_SKILLS = [
    'Attends and listens to a modelled spoken sentence or instruction',
    'Understands and responds to "wh-" questions relevant to the current stage (who / what / where / when / why)',
    'Engages with the colour-coded visual system (cards, symbols or colour dots) to construct a sentence',
    'Takes turns during a structured sentence-building activity',
    'Uses a built sentence functionally — to communicate a want, need, comment or idea, not just as an exercise',
    'Self-corrects or self-checks word order with reducing adult support'
  ];

  var STAGES = [
    {
      id: 'stage1',
      label: 'Stage 1 — Building the core sentence',
      colors: 'Orange = Who     Yellow = What doing',
      skills: [
        'Identifies "who" in a picture or scene (points to / selects / names the person or character)',
        'Identifies "what doing" — the action being carried out',
        'Answers "who" and "what doing" questions when asked directly',
        'Sequences Who before What doing in the correct spoken word order',
        'Builds and says a complete 2-element sentence (e.g. "boy jumping") using the colour cue cards',
        'Begins to use the present progressive verb ending (–ing) correctly within the sentence'
      ]
    },
    {
      id: 'stage2',
      label: 'Stage 2 — Adding the object',
      colors: '+ Green = What',
      skills: [
        'Identifies "what" — the object involved in the action',
        'Answers "who / what doing / what" questions',
        'Sequences all three elements in the correct order independently',
        'Builds and says a complete 3-element sentence using the colour cue cards',
        'Uses an article ("a" / "the") correctly before the object noun',
        'Uses a regular plural –s appropriately when the object is more than one'
      ]
    },
    {
      id: 'stage3',
      label: 'Stage 3 — Elaborating the sentence',
      colors: '+ Blue = Where',
      skills: [
        'Identifies "where" — the location of the action',
        'Answers "where" questions',
        'Builds and says a complete 4-element sentence (Who + What doing + What + Where)',
        'Uses a preposition correctly (in, on, under, behind, next to)',
        'Maintains correct word order with reducing visual support (colour dots rather than full cards)',
        'Begins to use past tense correctly (regular –ed and common irregulars) when retelling a completed action'
      ]
    },
    {
      id: 'stage4',
      label: 'Stage 4 — Extending the sentence',
      colors: 'Brown/Pink = When     Purple = What like     Red = Why',
      skills: [
        'Identifies "when" — the time an action happened or happens',
        'Identifies "what like" — a descriptive word or quality (adjective)',
        'Identifies "why" — the reason for the action',
        'Builds and says an elaborated sentence including one or more extension elements',
        'Uses a causal connective correctly ("because", "so") to join two ideas',
        'Uses a coordinating connective correctly ("and", "but") to build a compound sentence',
        'Uses pronouns correctly in place of a named subject or object (he / she / it / they)',
        'Retells a short 2–3 step sequence or event using the sentence structure',
        'Constructs a sentence with minimal or no colour-coded visual support (independent generalisation)',
        'Uses a taught sentence structure spontaneously in conversation, outside the structured task'
      ]
    }
  ];

  var PUPIL_COUNT = 4;

  var state = {
    step: 0,
    session: { schoolName: '', clientEmail: '', ccEmail: '', sessionDate: '' },
    pupils: []
  };

  for (var p = 0; p < PUPIL_COUNT; p++) {
    state.pupils.push({ pupilName: '', foundational: {}, stage: '', stageSkills: {}, notes: '' });
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

  function skillsChecklist(skills, store, idPrefix) {
    var list = el('div', { class: 'skills-list' });
    skills.forEach(function (skill, si) {
      var row = el('div', { class: 'skill-row' });
      row.appendChild(el('span', { class: 'skill-label', text: skill }));
      var toggle = el('div', { class: 'toggle-row' });
      var groupName = idPrefix + '-' + si;
      ['Achieved', 'Working towards'].forEach(function (status, oi) {
        var id = groupName + '-' + oi;
        var input = el('input', { type: 'radio', name: groupName, id: id, value: status });
        input.checked = store[skill] === status;
        input.addEventListener('change', function () { store[skill] = status; });
        toggle.appendChild(el('label', { class: 'pill-option', for: id }, [input, document.createTextNode(status)]));
      });
      row.appendChild(toggle);
      list.appendChild(row);
    });
    return list;
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

    var foundField = el('div', { class: 'form-field' });
    foundField.appendChild(el('label', { text: 'Foundational skills (every session, at any stage)' }));
    foundField.appendChild(skillsChecklist(FOUNDATIONAL_SKILLS, pupil.foundational, 'pupil-' + index + '-found'));
    wrap.appendChild(foundField);

    var stageField = el('div', { class: 'form-field' });
    stageField.appendChild(el('label', { text: 'Current stage' }));
    var stageRow = el('div', { class: 'toggle-row' });
    STAGES.forEach(function (stage, i) {
      var id = 'pupil-' + index + '-stage-' + i;
      var input = el('input', { type: 'radio', name: 'pupil-' + index + '-stage', id: id, value: stage.id });
      input.checked = pupil.stage === stage.id;
      input.addEventListener('change', function () {
        pupil.stage = stage.id;
        render();
      });
      stageRow.appendChild(el('label', { class: 'pill-option', for: id }, [input, document.createTextNode('Stage ' + (i + 1))]));
    });
    stageField.appendChild(stageRow);
    wrap.appendChild(stageField);

    var currentStage = STAGES.filter(function (s) { return s.id === pupil.stage; })[0];
    if (currentStage) {
      var stageSkillsField = el('div', { class: 'form-field' });
      stageSkillsField.appendChild(el('label', { text: currentStage.label }));
      stageSkillsField.appendChild(el('p', { text: currentStage.colors, class: 'step-subtitle' }));
      stageSkillsField.appendChild(skillsChecklist(currentStage.skills, pupil.stageSkills, 'pupil-' + index + '-stage-' + currentStage.id));
      wrap.appendChild(stageSkillsField);
    }

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
    var error = null;
    var pages = state.pupils
      .filter(function (pupil) { return pupil.pupilName.trim(); })
      .map(function (pupil) {
        if (!pupil.stage) error = 'Please select a current stage for ' + pupil.pupilName.trim() + '.';
        var currentStage = STAGES.filter(function (s) { return s.id === pupil.stage; })[0];

        var sections = [];

        var foundLines = [];
        FOUNDATIONAL_SKILLS.forEach(function (skill) {
          if (pupil.foundational[skill]) foundLines.push(skill + ' — ' + pupil.foundational[skill]);
        });
        if (foundLines.length) sections.push({ heading: 'Foundational skills', content: foundLines.join('\n') });

        if (currentStage) {
          sections.push({ heading: 'Current stage', content: currentStage.label + '  (' + currentStage.colors + ')' });

          var stageLines = [];
          currentStage.skills.forEach(function (skill) {
            if (pupil.stageSkills[skill]) stageLines.push(skill + ' — ' + pupil.stageSkills[skill]);
          });
          if (stageLines.length) sections.push({ heading: currentStage.label + ' skills', content: stageLines.join('\n') });
        }

        if (pupil.notes.trim()) sections.push({ heading: 'Additional information', content: pupil.notes.trim() });

        return { pupilName: pupil.pupilName.trim(), sections: sections };
      });
    return { pages: pages, error: error };
  }

  document.getElementById('wizard-submit').addEventListener('click', function () {
    clearError();
    var result = buildChildPages();
    if (result.error) {
      showError(result.error);
      return;
    }
    if (result.pages.length === 0) {
      showError('Please add at least one pupil before sending.');
      return;
    }

    var payload = {
      title: 'Sentence Steps Intervention Report',
      service: 'Sentence Steps Root',
      clientLabel: 'School',
      clientName: state.session.schoolName.trim(),
      recipientName: state.session.schoolName.trim(),
      clientEmail: state.session.clientEmail.trim(),
      ccEmail: state.session.ccEmail.trim(),
      sessionDate: state.session.sessionDate,
      childPages: result.pages,
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
        successDetail.textContent = 'Sent to ' + payload.clientEmail + ' for the ' + payload.sessionDate + ' session (' + payload.childPages.length + ' pupil page' + (payload.childPages.length === 1 ? '' : 's') + ').';
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
        state.pupils.push({ pupilName: '', foundational: {}, stage: '', stageSkills: {}, notes: '' });
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
