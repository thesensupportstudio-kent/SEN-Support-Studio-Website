(function () {
  var form = document.getElementById('contact-form');
  var success = document.getElementById('contact-success');
  var errorBox = document.getElementById('contact-error');
  if (!form || !success) return;

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
      name: document.getElementById('name').value.trim(),
      email: document.getElementById('email').value.trim(),
      role: document.getElementById('role').value,
      message: document.getElementById('message').value.trim()
    };

    fetch('/api/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
      .then(function (res) { return res.json().then(function (data) { return { ok: res.ok, data: data }; }); })
      .then(function (result) {
        if (!result.ok) {
          throw new Error((result.data && result.data.error) || 'Something went wrong sending your enquiry.');
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
