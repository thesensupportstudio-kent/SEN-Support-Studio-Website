(function () {
  var loading = document.getElementById('client-loading');
  var detail = document.getElementById('client-detail');
  var errorBox = document.getElementById('client-error');
  var nameEl = document.getElementById('client-name');
  var childEl = document.getElementById('client-child');
  var contactEl = document.getElementById('client-contact');
  var statusSelect = document.getElementById('client-status-select');
  var statusSaveStatus = document.getElementById('status-save-status');
  var notesField = document.getElementById('client-notes');
  var notesSaveBtn = document.getElementById('notes-save-btn');
  var notesSaveStatus = document.getElementById('notes-save-status');
  var timeline = document.getElementById('client-timeline');

  if (!detail) return;

  var clientId = new URLSearchParams(window.location.search).get('id');

  function escapeHtml(str) {
    return String(str == null ? '' : str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function formatDateTime(iso) {
    if (!iso) return '';
    var d = new Date(iso.replace(' ', 'T') + 'Z');
    if (isNaN(d.getTime())) return iso;
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) +
      ' at ' + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  }

  var TYPE_LABELS = {
    contact_enquiry: 'Website enquiry',
    sensory_questionnaire: 'Sensory Profile Questionnaire',
    tuition_intake: 'Getting to Know form',
    client_agreement: 'Client Agreement',
    invoice_request: 'Invoice requested',
    invoice_sent: 'Invoice sent',
    session_report: 'Session report sent'
  };

  function renderTimelineItem(item) {
    var div = document.createElement('div');
    div.className = 'timeline-item';
    div.innerHTML =
      '<p class="timeline-type">' + escapeHtml(TYPE_LABELS[item.type] || item.type) + '</p>' +
      '<p class="timeline-summary">' + escapeHtml(item.summary) + '</p>' +
      '<p class="timeline-date">' + formatDateTime(item.created_at) + '</p>';
    return div;
  }

  function showError(message) {
    loading.classList.add('hidden');
    errorBox.textContent = message;
    errorBox.classList.remove('hidden');
  }

  if (!clientId) {
    showError('No client specified.');
    return;
  }

  fetch('/api/internal/client?id=' + encodeURIComponent(clientId))
    .then(function (res) { return res.json().then(function (data) { return { ok: res.ok, data: data }; }); })
    .then(function (result) {
      if (!result.ok) {
        throw new Error((result.data && result.data.error) || 'Could not load this client.');
      }
      var client = result.data.client;
      var interactions = result.data.interactions || [];

      nameEl.textContent = client.parent_name || client.parent_email;
      childEl.textContent = client.child_name ? 'Child: ' + client.child_name + (client.school ? ' — ' + client.school : '') : (client.school || '');
      contactEl.textContent = [client.parent_email, client.parent_phone].filter(Boolean).join(' · ');
      statusSelect.value = client.status || 'enquiry';
      notesField.value = client.notes || '';

      timeline.innerHTML = '';
      if (!interactions.length) {
        timeline.innerHTML = '<p class="clients-empty">No recorded interactions yet.</p>';
      } else {
        interactions.forEach(function (item) {
          timeline.appendChild(renderTimelineItem(item));
        });
      }

      loading.classList.add('hidden');
      detail.classList.remove('hidden');
    })
    .catch(function (err) {
      showError(err.message || 'Could not load this client.');
    });

  function saveUpdate(payload, statusEl, savedLabel) {
    statusEl.textContent = 'Saving…';
    fetch('/api/internal/update-client', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(Object.assign({ id: clientId }, payload))
    })
      .then(function (res) { return res.json().then(function (data) { return { ok: res.ok, data: data }; }); })
      .then(function (result) {
        if (!result.ok) throw new Error((result.data && result.data.error) || 'Could not save.');
        statusEl.textContent = savedLabel;
        setTimeout(function () { statusEl.textContent = ''; }, 2000);
      })
      .catch(function (err) {
        statusEl.textContent = err.message || 'Could not save.';
      });
  }

  statusSelect.addEventListener('change', function () {
    saveUpdate({ status: statusSelect.value }, statusSaveStatus, 'Saved');
  });

  notesSaveBtn.addEventListener('click', function () {
    saveUpdate({ notes: notesField.value }, notesSaveStatus, 'Notes saved');
  });
})();
