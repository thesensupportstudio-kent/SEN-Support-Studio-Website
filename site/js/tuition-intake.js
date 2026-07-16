(function () {
  var DIAGNOSES = [
    'ADHD', 'Autism (ASD)', 'Dyspraxia', 'Dyslexia', 'Dyscalculia',
    'Speech & language difficulty', 'Anxiety'
  ];
  var EHCP_OPTIONS = ['EHCP', 'SEN Support', 'Neither', 'Not sure'];
  var VERBAL_OPTIONS = ['Verbal', 'Non-verbal', 'Uses some words or signs', 'Varies'];
  var ATTENTION_OPTIONS = ['Very short (a few mins)', 'Short (5-10 mins)', 'Medium (10-20 mins)', 'Longer (20+ mins)'];

  var form = document.getElementById('intake-form');
  var success = document.getElementById('intake-success');
  var errorBox = document.getElementById('intake-error');
  if (!form || !success) return;

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text) node.textContent = text;
    return node;
  }

  function renderChecklist(containerId, items, name) {
    var container = document.getElementById(containerId);
    if (!container) return;
    items.forEach(function (item, i) {
      var label = el('label', 'checklist-item');
      var input = document.createElement('input');
      input.type = 'checkbox';
      input.name = name;
      input.value = item;
      input.id = name + '-' + i;
      label.appendChild(input);
      label.appendChild(document.createTextNode(item));
      container.appendChild(label);
    });
  }

  function renderToggle(containerId, items, name) {
    var container = document.getElementById(containerId);
    if (!container) return;
    items.forEach(function (item, i) {
      var id = name + '-' + i;
      var input = document.createElement('input');
      input.type = 'radio';
      input.name = name;
      input.value = item;
      input.id = id;
      var label = el('label', 'pill-option');
      label.setAttribute('for', id);
      label.appendChild(input);
      label.appendChild(document.createTextNode(item));
      container.appendChild(label);
    });
  }

  renderChecklist('diagnosis-checklist', DIAGNOSES, 'diagnosis');
  renderToggle('ehcp-toggle', EHCP_OPTIONS, 'ehcp');
  renderToggle('verbal-toggle', VERBAL_OPTIONS, 'verbal');
  renderToggle('attention-toggle', ATTENTION_OPTIONS, 'attention');

  function collectChecked(name) {
    return Array.prototype.slice
      .call(document.querySelectorAll('input[name="' + name + '"]:checked'))
      .map(function (input) { return input.value; });
  }

  function collectRadio(name) {
    var checked = document.querySelector('input[name="' + name + '"]:checked');
    return checked ? checked.value : '';
  }

  function showError(message) {
    if (!errorBox) return;
    errorBox.textContent = message;
    errorBox.classList.remove('hidden');
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (errorBox) errorBox.classList.add('hidden');

    var submitBtn = form.querySelector('.form-submit');
    submitBtn.disabled = true;

    var payload = {
      child: {
        childName: document.getElementById('child-name').value.trim(),
        dob: document.getElementById('child-dob').value,
        school: document.getElementById('child-school').value.trim(),
        yearGroup: document.getElementById('child-year').value.trim()
      },
      parent: {
        parentName: document.getElementById('parent-name').value.trim(),
        relationship: document.getElementById('parent-relationship').value,
        parentEmail: document.getElementById('parent-email').value.trim(),
        parentPhone: document.getElementById('parent-phone').value.trim()
      },
      diagnosis: {
        selected: collectChecked('diagnosis'),
        other: document.getElementById('diagnosis-other').value.trim(),
        ehcp: collectRadio('ehcp'),
        notes: document.getElementById('diagnosis-notes').value.trim()
      },
      goals: {
        focus: document.getElementById('goals-focus').value.trim(),
        targets: document.getElementById('goals-targets').value.trim()
      },
      profile: {
        interests: document.getElementById('interests').value.trim(),
        verbal: collectRadio('verbal'),
        attention: collectRadio('attention'),
        bigNos: document.getElementById('big-nos').value.trim(),
        anythingElse: document.getElementById('anything-else').value.trim()
      }
    };

    fetch('/api/tuition-intake', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
      .then(function (res) { return res.json().then(function (data) { return { ok: res.ok, data: data }; }); })
      .then(function (result) {
        if (!result.ok) {
          throw new Error((result.data && result.data.error) || 'Something went wrong sending this form.');
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
