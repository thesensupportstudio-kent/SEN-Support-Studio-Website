(function () {
  var links = window.PAYMENT_LINKS || {};

  document.querySelectorAll('[data-pay]').forEach(function (container) {
    var keys = container.getAttribute('data-pay').split(',').map(function (k) { return k.trim(); });
    var labels = (container.getAttribute('data-pay-labels') || '').split('|');

    keys.forEach(function (key, i) {
      var url = links[key];
      if (!url) return;

      var a = document.createElement('a');
      a.href = url;
      a.target = '_blank';
      a.rel = 'noopener';
      a.className = 'btn-pay-now';
      a.textContent = (labels[i] || 'Pay Now').trim() + ' →';
      container.appendChild(a);
    });
  });
})();
