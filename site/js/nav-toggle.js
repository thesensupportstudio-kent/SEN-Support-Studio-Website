(function () {
  var toggle = document.querySelector('.nav-toggle');
  var navbar = document.querySelector('.navbar');
  if (!toggle || !navbar) return;

  toggle.addEventListener('click', function () {
    var isOpen = navbar.classList.toggle('nav-open');
    toggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
  });

  navbar.querySelectorAll('.nav-links a, .btn-book').forEach(function (link) {
    link.addEventListener('click', function () {
      navbar.classList.remove('nav-open');
      toggle.setAttribute('aria-expanded', 'false');
    });
  });
})();
