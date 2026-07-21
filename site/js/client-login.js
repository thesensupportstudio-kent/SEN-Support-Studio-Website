(function () {
  // Only ever allow redirecting to a same-site .html page (with an optional
  // query string) - blocks the ?next= param being used as an open redirect.
  function safeNext(value) {
    if (value && /^[a-zA-Z0-9_-]+\.html(\?[a-zA-Z0-9_=&%.-]*)?$/.test(value)) return value;
    return 'client-portal.html';
  }

  var nextParam = new URLSearchParams(window.location.search).get('next');

  var loginForm = document.getElementById('login-form');
  var loginError = document.getElementById('login-error');
  var loginSubmit = document.getElementById('login-submit');
  var showResetBtn = document.getElementById('show-reset-btn');
  var resetForm = document.getElementById('reset-form');
  var resetError = document.getElementById('reset-error');
  var resetSuccess = document.getElementById('reset-success');
  var resetSubmit = document.getElementById('reset-submit');

  showResetBtn.addEventListener('click', function () {
    loginForm.classList.toggle('hidden');
    resetForm.classList.toggle('hidden');
    showResetBtn.textContent = resetForm.classList.contains('hidden') ? 'Forgot your password?' : 'Back to log in';
  });

  loginForm.addEventListener('submit', function (e) {
    e.preventDefault();
    loginError.classList.add('hidden');
    loginSubmit.disabled = true;
    loginSubmit.textContent = 'Logging in…';

    fetch('/api/client-auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: document.getElementById('login-email').value.trim(),
        password: document.getElementById('login-password').value
      })
    })
      .then(function (res) { return res.json().then(function (data) { return { ok: res.ok, data: data }; }); })
      .then(function (result) {
        if (!result.ok) throw new Error((result.data && result.data.error) || 'Could not log in.');
        window.location.href = safeNext(nextParam);
      })
      .catch(function (err) {
        loginError.textContent = err.message || 'Could not log in.';
        loginError.classList.remove('hidden');
      })
      .finally(function () {
        loginSubmit.disabled = false;
        loginSubmit.textContent = 'Log in';
      });
  });

  resetForm.addEventListener('submit', function (e) {
    e.preventDefault();
    resetError.classList.add('hidden');
    resetSuccess.classList.add('hidden');
    resetSubmit.disabled = true;
    resetSubmit.textContent = 'Sending…';

    fetch('/api/client-auth/request-reset', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: document.getElementById('reset-email').value.trim() })
    })
      .then(function (res) { return res.json().then(function (data) { return { ok: res.ok, data: data }; }); })
      .then(function (result) {
        if (!result.ok) throw new Error((result.data && result.data.error) || 'Could not send a reset link.');
        resetSuccess.classList.remove('hidden');
        resetForm.reset();
      })
      .catch(function (err) {
        resetError.textContent = err.message || 'Could not send a reset link.';
        resetError.classList.remove('hidden');
      })
      .finally(function () {
        resetSubmit.disabled = false;
        resetSubmit.textContent = 'Send reset link';
      });
  });
})();
