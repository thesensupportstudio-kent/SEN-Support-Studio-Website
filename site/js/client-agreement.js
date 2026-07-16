(function () {
  var CONTACT_OPTIONS = ['Phone call', 'Text / WhatsApp', 'Email'];
  var PHOTO_OPTIONS = ['Yes', 'No'];

  var form = document.getElementById('agreement-form');
  var success = document.getElementById('agreement-success');
  var errorBox = document.getElementById('agreement-error');
  if (!form || !success) return;

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text) node.textContent = text;
    return node;
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

  renderToggle('contact-toggle', CONTACT_OPTIONS, 'preferredContact');
  renderToggle('photo-toggle', PHOTO_OPTIONS, 'photoConsent');

  var dateField = document.getElementById('signature-date');
  if (dateField && !dateField.value) {
    var today = new Date();
    dateField.value = today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0') + '-' + String(today.getDate()).padStart(2, '0');
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
      parent: {
        parentName: document.getElementById('parent-name').value.trim(),
        relationship: document.getElementById('parent-relationship').value,
        parentEmail: document.getElementById('parent-email').value.trim(),
        parentPhone: document.getElementById('parent-phone').value.trim(),
        parentAddress: document.getElementById('parent-address').value.trim(),
        preferredContact: collectRadio('preferredContact')
      },
      child: {
        childName: document.getElementById('child-name').value.trim(),
        dob: document.getElementById('child-dob').value,
        school: document.getElementById('child-school').value.trim()
      },
      emergency: {
        emergencyName: document.getElementById('emergency-name').value.trim(),
        emergencyPhone: document.getElementById('emergency-phone').value.trim()
      },
      medicalInfo: document.getElementById('medical-info').value.trim(),
      photoConsent: collectRadio('photoConsent'),
      agreements: {
        emergency: document.getElementById('agree-emergency').checked,
        cancellation: document.getElementById('agree-cancellation').checked,
        privacy: document.getElementById('agree-privacy').checked,
        safeguarding: document.getElementById('agree-safeguarding').checked
      },
      signature: {
        name: document.getElementById('signature-name').value.trim(),
        date: document.getElementById('signature-date').value
      },
      token: new URLSearchParams(window.location.search).get('token') || undefined
    };

    if (!payload.agreements.emergency || !payload.agreements.cancellation || !payload.agreements.privacy || !payload.agreements.safeguarding) {
      showError('Please agree to all the required boxes before submitting.');
      submitBtn.disabled = false;
      return;
    }

    fetch('/api/client-agreement', {
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
