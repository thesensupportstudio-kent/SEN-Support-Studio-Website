(function () {
  function getClientId() {
    return new URLSearchParams(window.location.search).get('clientId') || '';
  }

  function fetchClient(id) {
    if (!id) return Promise.resolve(null);
    return fetch('/api/internal/client?id=' + encodeURIComponent(id))
      .then(function (res) { return res.ok ? res.json() : null; })
      .then(function (data) { return data ? data.client : null; })
      .catch(function () { return null; });
  }

  function showBanner(client) {
    var banner = document.getElementById('client-context-banner');
    if (!banner || !client) return;
    banner.innerHTML = '';
    var name = client.parent_name || client.parent_email;
    var label = document.createElement('span');
    label.textContent = 'Prefilled from ' + name + (client.child_name ? ' (' + client.child_name + ')' : '') + '.';
    var link = document.createElement('a');
    link.href = window.location.pathname;
    link.textContent = 'Clear';
    banner.appendChild(label);
    banner.appendChild(link);
    banner.classList.remove('hidden');
  }

  var clientId = getClientId();

  window.SENClientContext = {
    clientId: clientId,
    ready: fetchClient(clientId),
    showBanner: showBanner
  };
})();
