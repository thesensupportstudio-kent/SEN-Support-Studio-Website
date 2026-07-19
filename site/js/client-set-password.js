(function () {
  var token = new URLSearchParams(window.location.search).get('token');
  var noTokenMessage = document.getElementById('no-token-message');
  var card = document.getElementById('set-password-card');
  var form = document.getElementById('set-password-form');
  var errorEl = document.getElementById('set-password-error');
  var submitBtn = document.getElementById('set-password-submit');

  if (!token) {
    noTokenMessage.classList.remove('hidden');
    card.classList.add('hidden');
    return;
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    errorEl.classList.add('hidden');

    var password = document.getElementById('new-password').value;
    var confirm = document.getElementById('confirm-password').value;

    if (password !== confirm) {
      errorEl.textContent = 'Those passwords don’t match.';
      errorEl.classList.remove('hidden');
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = 'Saving…';

    fetch('/api/client-auth/set-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: token, password: password })
    })
      .then(function (res) { return res.json().then(function (data) { return { ok: res.ok, data: data }; }); })
      .then(function (result) {
        if (!result.ok) throw new Error((result.data && result.data.error) || 'Could not set your password.');
        window.location.href = 'client-portal.html';
      })
      .catch(function (err) {
        errorEl.textContent = err.message || 'Could not set your password.';
        errorEl.classList.remove('hidden');
      })
      .finally(function () {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Set password & log in';
      });
  });
})();
