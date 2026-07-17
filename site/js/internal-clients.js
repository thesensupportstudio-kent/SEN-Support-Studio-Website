(function () {
  var searchInput = document.getElementById('clients-search-input');
  var tableBody = document.getElementById('clients-table-body');
  var loading = document.getElementById('clients-loading');
  var empty = document.getElementById('clients-empty');
  var errorBox = document.getElementById('clients-error');

  var addBtn = document.getElementById('clients-add-btn');
  var addFormWrap = document.getElementById('clients-add-form-wrap');
  var addForm = document.getElementById('clients-add-form');
  var addError = document.getElementById('clients-add-error');
  var addSaveBtn = document.getElementById('clients-add-save-btn');
  var addCancelBtn = document.getElementById('clients-add-cancel-btn');

  if (!tableBody) return;

  var debounceTimer = null;

  function escapeHtml(str) {
    return String(str == null ? '' : str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function formatDate(iso) {
    if (!iso) return '';
    var d = new Date(iso.replace(' ', 'T') + 'Z');
    if (isNaN(d.getTime())) return iso;
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  function renderRow(client) {
    var tr = document.createElement('tr');
    tr.className = 'client-row';
    tr.innerHTML =
      '<td class="client-name-cell">' + escapeHtml(client.parent_name || client.parent_email) +
        '<span class="client-sub">' + escapeHtml(client.parent_email) + '</span>' +
      '</td>' +
      '<td data-label="Child">' + escapeHtml(client.child_name || '-') +
        (client.school ? '<span class="client-sub">' + escapeHtml(client.school) + '</span>' : '') +
      '</td>' +
      '<td data-label="Status"><span class="status-pill status-' + escapeHtml(client.status) + '">' + escapeHtml(client.status) + '</span></td>' +
      '<td data-label="Last activity">' + formatDate(client.updated_at) + '</td>';
    tr.addEventListener('click', function () {
      window.location.href = 'client.html?id=' + encodeURIComponent(client.id);
    });
    return tr;
  }

  function load(query) {
    loading.classList.remove('hidden');
    empty.classList.add('hidden');
    errorBox.classList.add('hidden');
    tableBody.innerHTML = '';

    var url = '/api/internal/clients' + (query ? '?q=' + encodeURIComponent(query) : '');

    fetch(url)
      .then(function (res) { return res.json().then(function (data) { return { ok: res.ok, data: data }; }); })
      .then(function (result) {
        loading.classList.add('hidden');
        if (!result.ok) {
          throw new Error((result.data && result.data.error) || 'Could not load clients.');
        }
        var clients = result.data.clients || [];
        if (!clients.length) {
          empty.classList.remove('hidden');
          return;
        }
        clients.forEach(function (client) {
          tableBody.appendChild(renderRow(client));
        });
      })
      .catch(function (err) {
        loading.classList.add('hidden');
        errorBox.textContent = err.message || 'Could not load clients.';
        errorBox.classList.remove('hidden');
      });
  }

  searchInput.addEventListener('input', function () {
    clearTimeout(debounceTimer);
    var value = searchInput.value.trim();
    debounceTimer = setTimeout(function () { load(value); }, 250);
  });

  function openAddForm() {
    addForm.reset();
    addError.classList.add('hidden');
    addFormWrap.classList.remove('hidden');
    addFormWrap.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function closeAddForm() {
    addFormWrap.classList.add('hidden');
  }

  addBtn.addEventListener('click', openAddForm);
  addCancelBtn.addEventListener('click', closeAddForm);

  addForm.addEventListener('submit', function (e) {
    e.preventDefault();
    addError.classList.add('hidden');

    var payload = {
      parentName: document.getElementById('add-parent-name').value.trim(),
      parentEmail: document.getElementById('add-parent-email').value.trim(),
      parentPhone: document.getElementById('add-parent-phone').value.trim(),
      childName: document.getElementById('add-child-name').value.trim(),
      school: document.getElementById('add-school').value.trim()
    };

    addSaveBtn.disabled = true;
    addSaveBtn.textContent = 'Adding…';

    fetch('/api/internal/create-client', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
      .then(function (res) { return res.json().then(function (data) { return { ok: res.ok, data: data }; }); })
      .then(function (result) {
        if (!result.ok) throw new Error((result.data && result.data.error) || 'Could not add this client.');
        window.location.href = 'client.html?id=' + encodeURIComponent(result.data.id);
      })
      .catch(function (err) {
        addError.textContent = err.message || 'Could not add this client.';
        addError.classList.remove('hidden');
        addSaveBtn.disabled = false;
        addSaveBtn.textContent = 'Add client';
      });
  });

  load('');
})();
