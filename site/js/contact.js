(function () {
  var form = document.getElementById('contact-form');
  var success = document.getElementById('contact-success');
  if (!form || !success) return;

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    form.classList.add('hidden');
    success.classList.remove('hidden');
  });
})();
