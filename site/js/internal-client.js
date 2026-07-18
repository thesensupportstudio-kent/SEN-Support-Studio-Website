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
  var sendReportBtn = document.getElementById('send-report-btn');
  var sendReportMenu = document.getElementById('send-report-menu');
  var sendInvoiceBtn = document.getElementById('send-invoice-btn');
  var sendLinksBtn = document.getElementById('send-links-btn');
  var sendLinksMenu = document.getElementById('send-links-menu');
  var sendLinksSubmit = document.getElementById('send-links-submit');
  var sendLinksStatus = document.getElementById('send-links-status');
  var assignmentsWrap = document.getElementById('assignments-wrap');
  var assignmentsList = document.getElementById('assignments-list');
  var tabsBar = document.getElementById('client-tabs');

  if (!detail) return;

  var clientId = new URLSearchParams(window.location.search).get('id');

  var FORM_TYPES = ['contact_enquiry', 'sensory_questionnaire', 'tuition_intake', 'client_agreement', 'links_sent'];
  var REPORT_TYPES = ['session_report'];
  var INVOICE_TYPES = ['invoice_request', 'invoice_sent'];
  var DOCUMENT_TYPES = ['document_uploaded'];

  var TYPE_LABELS = {
    contact_enquiry: 'Website enquiry',
    sensory_questionnaire: 'Sensory Profile Questionnaire',
    tuition_intake: 'Getting to Know form',
    client_agreement: 'Client Agreement',
    invoice_request: 'Invoice requested',
    invoice_sent: 'Invoice sent',
    session_report: 'Session report sent',
    links_sent: 'Forms assigned',
    document_uploaded: 'Document uploaded'
  };

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

  function formatDateOnly(value) {
    if (!value) return '';
    var d = new Date(value.length <= 10 ? value + 'T00:00:00Z' : value.replace(' ', 'T') + 'Z');
    if (isNaN(d.getTime())) return value;
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  function humanizeKey(key) {
    var spaced = String(key).replace(/([a-z0-9])([A-Z])/g, '$1 $2').replace(/_/g, ' ');
    return spaced.charAt(0).toUpperCase() + spaced.slice(1);
  }

  // Generic renderer for a submitted form's stored JSON: walks the object,
  // showing each leaf field as a labelled line rather than raw JSON.
  // skipKeys lets a caller hide fields that are pure internal metadata (e.g.
  // a "type" flag used only to decide how a report gets laid out) or that
  // would just repeat something already shown, like a heading above it.
  function renderDetailObject(obj, container, skipKeys) {
    if (!obj || typeof obj !== 'object') return;
    Object.keys(obj).forEach(function (key) {
      if (skipKeys && skipKeys.indexOf(key) !== -1) return;
      var value = obj[key];
      if (value == null || value === '') return;

      if (Array.isArray(value)) {
        if (!value.length) return;
        if (typeof value[0] === 'object') {
          value.forEach(function (item) {
            if (item && item.title) {
              var heading = document.createElement('p');
              heading.className = 'detail-subheading';
              heading.textContent = item.title;
              container.appendChild(heading);
            }
            renderDetailObject(item, container, ['title', 'type']);
          });
          return;
        }
        var items = value.filter(function (v) { return v != null && v !== ''; });
        if (!items.length) return;
        var row = document.createElement('p');
        row.className = 'detail-row';
        var label = document.createElement('strong');
        label.textContent = humanizeKey(key) + ': ';
        row.appendChild(label);
        row.appendChild(document.createTextNode(items.join(', ')));
        container.appendChild(row);
        return;
      }

      if (typeof value === 'object') {
        renderDetailObject(value, container);
        return;
      }

      var line = document.createElement('p');
      line.className = 'detail-row';
      var lineLabel = document.createElement('strong');
      lineLabel.textContent = humanizeKey(key) + ': ';
      line.appendChild(lineLabel);
      line.appendChild(document.createTextNode(String(value)));
      container.appendChild(line);
    });
  }

  function parseDetail(item) {
    if (!item.detail) return null;
    try { return JSON.parse(item.detail); } catch (e) { return null; }
  }

  function renderTimelineItem(item) {
    var div = document.createElement('div');
    div.className = 'timeline-item';

    var typeEl = document.createElement('p');
    typeEl.className = 'timeline-type';
    typeEl.textContent = TYPE_LABELS[item.type] || item.type;
    div.appendChild(typeEl);

    var summaryEl = document.createElement('p');
    summaryEl.className = 'timeline-summary';
    summaryEl.textContent = item.summary;
    div.appendChild(summaryEl);

    var dateEl = document.createElement('p');
    dateEl.className = 'timeline-date';
    dateEl.textContent = formatDateTime(item.created_at);
    div.appendChild(dateEl);

    if (item.type === 'invoice_sent') {
      var invoiceRow = document.createElement('div');
      invoiceRow.className = 'invoice-status-row';

      var pill = document.createElement('span');
      var isPaid = !!item.paid_at;
      pill.className = 'status-pill ' + (isPaid ? 'status-active' : 'status-enquiry');
      pill.textContent = isPaid ? 'Paid ' + formatDateOnly(item.paid_at) : (item.due_date ? 'Due ' + formatDateOnly(item.due_date) : 'Awaiting payment');
      invoiceRow.appendChild(pill);

      var payBtn = document.createElement('button');
      payBtn.type = 'button';
      payBtn.className = 'invoice-paid-btn';
      payBtn.textContent = isPaid ? 'Mark as unpaid' : 'Mark as paid';
      payBtn.addEventListener('click', function () {
        payBtn.disabled = true;
        fetch('/api/internal/mark-invoice-paid', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ interactionId: item.id, paid: !isPaid })
        })
          .then(function (res) { return res.json().then(function (data) { return { ok: res.ok, data: data }; }); })
          .then(function (result) {
            if (!result.ok) throw new Error((result.data && result.data.error) || 'Could not update this invoice.');
            loadClient();
          })
          .catch(function (err) {
            payBtn.disabled = false;
            window.alert(err.message || 'Could not update this invoice.');
          });
      });
      invoiceRow.appendChild(payBtn);

      div.appendChild(invoiceRow);
    }

    if (item.file_key) {
      var dl = document.createElement('a');
      dl.className = 'timeline-download';
      dl.href = '/api/internal/file?key=' + encodeURIComponent(item.file_key);
      dl.target = '_blank';
      dl.rel = 'noopener';
      dl.textContent = 'Download PDF';
      div.appendChild(dl);
    }

    var detailObj = parseDetail(item);
    if (detailObj && Object.keys(detailObj).length) {
      var details = document.createElement('details');
      var summaryToggle = document.createElement('summary');
      summaryToggle.textContent = 'View full submission';
      details.appendChild(summaryToggle);
      var detailBody = document.createElement('div');
      renderDetailObject(detailObj, detailBody);
      details.appendChild(detailBody);
      div.appendChild(details);
    }

    return div;
  }

  function renderTabPanel(panelEl, items, emptyMessage) {
    panelEl.innerHTML = '';
    if (!items.length) {
      panelEl.innerHTML = '<p class="clients-empty">' + escapeHtml(emptyMessage) + '</p>';
      return;
    }
    var wrap = document.createElement('div');
    wrap.className = 'timeline';
    items.forEach(function (item) { wrap.appendChild(renderTimelineItem(item)); });
    panelEl.appendChild(wrap);
  }

  // Reports get their own clean list - just the title, session date and a
  // download link, since that's what's actually useful when looking back at
  // what was sent (the generic form-detail dump was too noisy to scan).
  function renderReports(panelEl, items) {
    panelEl.innerHTML = '';
    if (!items.length) {
      panelEl.innerHTML = '<p class="clients-empty">No reports sent yet.</p>';
      return;
    }
    var wrap = document.createElement('div');
    wrap.className = 'timeline';
    items.forEach(function (item) {
      var detailObj = parseDetail(item) || {};
      var div = document.createElement('div');
      div.className = 'timeline-item';

      var titleEl = document.createElement('p');
      titleEl.className = 'document-label';
      titleEl.textContent = detailObj.title || item.summary;
      div.appendChild(titleEl);

      var dateEl = document.createElement('p');
      dateEl.className = 'timeline-date';
      var sessionDateLabel = detailObj.sessionDate ? formatDateOnly(detailObj.sessionDate) : '';
      dateEl.textContent = sessionDateLabel
        ? 'Session on ' + sessionDateLabel + ' · Sent ' + formatDateTime(item.created_at)
        : 'Sent ' + formatDateTime(item.created_at);
      div.appendChild(dateEl);

      if (item.file_key) {
        var dl = document.createElement('a');
        dl.className = 'timeline-download';
        dl.href = '/api/internal/file?key=' + encodeURIComponent(item.file_key);
        dl.target = '_blank';
        dl.rel = 'noopener';
        dl.textContent = 'Download PDF';
        div.appendChild(dl);
      }

      wrap.appendChild(div);
    });
    panelEl.appendChild(wrap);
  }

  function renderAssignments(assignments) {
    if (!assignmentsWrap || !assignmentsList) return;
    if (!assignments || !assignments.length) {
      assignmentsWrap.classList.add('hidden');
      return;
    }
    assignmentsList.innerHTML = '';
    assignments.forEach(function (a) {
      var div = document.createElement('div');
      div.className = 'timeline-item';
      var label = TYPE_LABELS[a.form_type] || a.form_type;
      var completed = a.status === 'completed';

      var typeEl = document.createElement('p');
      typeEl.className = 'timeline-type';
      typeEl.textContent = label;
      div.appendChild(typeEl);

      var pill = document.createElement('span');
      pill.className = 'status-pill ' + (completed ? 'status-active' : 'status-enquiry');
      pill.textContent = completed ? 'Completed' : 'Sent, not yet completed';
      div.appendChild(pill);

      var dateEl = document.createElement('p');
      dateEl.className = 'timeline-date';
      dateEl.textContent = 'Sent ' + formatDateTime(a.sent_at) + (completed ? ' · Completed ' + formatDateTime(a.completed_at) : '');
      div.appendChild(dateEl);

      assignmentsList.appendChild(div);
    });
    assignmentsWrap.classList.remove('hidden');
  }

  var documentsList = document.getElementById('documents-list');

  function renderDocuments(items) {
    if (!documentsList) return;
    documentsList.innerHTML = '';
    if (!items.length) {
      documentsList.innerHTML = '<p class="clients-empty">No documents uploaded yet.</p>';
      return;
    }
    var wrap = document.createElement('div');
    wrap.className = 'timeline';
    items.forEach(function (item) {
      var detailObj = parseDetail(item) || {};
      var div = document.createElement('div');
      div.className = 'timeline-item';

      var row = document.createElement('div');
      row.className = 'document-row-top';
      var badge = document.createElement('span');
      badge.className = 'status-pill status-enquiry';
      badge.textContent = detailObj.category || 'Other';
      row.appendChild(badge);
      var labelEl = document.createElement('p');
      labelEl.className = 'document-label';
      labelEl.textContent = item.summary;
      row.appendChild(labelEl);
      div.appendChild(row);

      var dateEl = document.createElement('p');
      dateEl.className = 'timeline-date';
      dateEl.textContent = 'Uploaded ' + formatDateTime(item.created_at);
      div.appendChild(dateEl);

      var actionsRow = document.createElement('div');
      actionsRow.className = 'document-actions-row';

      if (item.file_key) {
        var dl = document.createElement('a');
        dl.className = 'timeline-download';
        dl.href = '/api/internal/file?key=' + encodeURIComponent(item.file_key);
        dl.target = '_blank';
        dl.rel = 'noopener';
        dl.textContent = 'Download';
        actionsRow.appendChild(dl);
      }

      var deleteBtn = document.createElement('button');
      deleteBtn.type = 'button';
      deleteBtn.className = 'invoice-paid-btn';
      deleteBtn.textContent = 'Delete';
      deleteBtn.addEventListener('click', function () {
        if (!window.confirm('Delete "' + item.summary + '"? This cannot be undone.')) return;
        deleteBtn.disabled = true;
        fetch('/api/internal/delete-document', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ interactionId: item.id })
        })
          .then(function (res) { return res.json().then(function (data) { return { ok: res.ok, data: data }; }); })
          .then(function (result) {
            if (!result.ok) throw new Error((result.data && result.data.error) || 'Could not delete this document.');
            loadClient();
          })
          .catch(function (err) {
            deleteBtn.disabled = false;
            window.alert(err.message || 'Could not delete this document.');
          });
      });
      actionsRow.appendChild(deleteBtn);

      div.appendChild(actionsRow);
      wrap.appendChild(div);
    });
    documentsList.appendChild(wrap);
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

  function closeMenus() {
    if (sendReportMenu) sendReportMenu.classList.add('hidden');
    if (sendLinksMenu) sendLinksMenu.classList.add('hidden');
  }

  function toggleMenu(btn, menu) {
    if (!btn || !menu) return;
    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      var willOpen = menu.classList.contains('hidden');
      closeMenus();
      if (willOpen) menu.classList.remove('hidden');
    });
    menu.addEventListener('click', function (e) { e.stopPropagation(); });
  }

  toggleMenu(sendReportBtn, sendReportMenu);
  toggleMenu(sendLinksBtn, sendLinksMenu);
  document.addEventListener('click', closeMenus);

  if (sendLinksSubmit) {
    sendLinksSubmit.addEventListener('click', function () {
      var checked = Array.prototype.slice.call(sendLinksMenu.querySelectorAll('input[type="checkbox"]:checked'))
        .map(function (c) { return c.value; });

      if (!checked.length) {
        sendLinksStatus.textContent = 'Choose at least one.';
        return;
      }

      sendLinksStatus.textContent = 'Sending…';
      sendLinksSubmit.disabled = true;

      fetch('/api/internal/send-links', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId: clientId, forms: checked })
      })
        .then(function (res) { return res.json().then(function (data) { return { ok: res.ok, data: data }; }); })
        .then(function (result) {
          if (!result.ok) throw new Error((result.data && result.data.error) || 'Could not send.');
          sendLinksStatus.textContent = 'Sent!';
          Array.prototype.forEach.call(sendLinksMenu.querySelectorAll('input[type="checkbox"]'), function (c) { c.checked = false; });
          loadClient();
          setTimeout(function () {
            sendLinksStatus.textContent = '';
            sendLinksMenu.classList.add('hidden');
          }, 1200);
        })
        .catch(function (err) {
          sendLinksStatus.textContent = err.message || 'Could not send.';
        })
        .finally(function () {
          sendLinksSubmit.disabled = false;
        });
    });
  }

  if (tabsBar) {
    tabsBar.addEventListener('click', function (e) {
      var btn = e.target.closest('.client-tab');
      if (!btn) return;
      Array.prototype.forEach.call(tabsBar.querySelectorAll('.client-tab'), function (t) {
        t.classList.toggle('active', t === btn);
      });
      var tab = btn.dataset.tab;
      ['overview', 'forms', 'reports', 'invoices', 'documents'].forEach(function (name) {
        var panel = document.getElementById('tab-' + name);
        if (panel) panel.classList.toggle('hidden', name !== tab);
      });
    });
  }

  function loadClient() {
    return fetch('/api/internal/client?id=' + encodeURIComponent(clientId))
      .then(function (res) { return res.json().then(function (data) { return { ok: res.ok, data: data }; }); })
      .then(function (result) {
        if (!result.ok) {
          throw new Error((result.data && result.data.error) || 'Could not load this client.');
        }
        var client = result.data.client;
        var interactions = result.data.interactions || [];
        var assignments = result.data.assignments || [];

        nameEl.textContent = client.parent_name || client.parent_email;
        childEl.textContent = client.child_name ? 'Child: ' + client.child_name + (client.school ? ' - ' + client.school : '') : (client.school || '');
        contactEl.textContent = [client.parent_email, client.parent_phone].filter(Boolean).join(' · ');
        statusSelect.value = client.status || 'enquiry';
        notesField.value = client.notes || '';

        if (sendReportMenu) {
          Array.prototype.forEach.call(sendReportMenu.querySelectorAll('a'), function (a) {
            a.setAttribute('href', a.getAttribute('href').split('?')[0] + '?clientId=' + encodeURIComponent(clientId));
          });
        }
        if (sendInvoiceBtn) {
          sendInvoiceBtn.setAttribute('href', 'send-invoice.html?clientId=' + encodeURIComponent(clientId));
        }

        var formItems = interactions.filter(function (i) { return FORM_TYPES.indexOf(i.type) !== -1; });
        var reportItems = interactions.filter(function (i) { return REPORT_TYPES.indexOf(i.type) !== -1; });
        var invoiceItems = interactions.filter(function (i) { return INVOICE_TYPES.indexOf(i.type) !== -1; });
        var documentItems = interactions.filter(function (i) { return DOCUMENT_TYPES.indexOf(i.type) !== -1; });

        renderTabPanel(document.getElementById('tab-forms'), formItems, 'No forms submitted yet.');
        renderReports(document.getElementById('tab-reports'), reportItems);
        renderTabPanel(document.getElementById('tab-invoices'), invoiceItems, 'No invoices sent or requested yet.');
        renderDocuments(documentItems);
        renderAssignments(assignments);

        loading.classList.add('hidden');
        detail.classList.remove('hidden');
      })
      .catch(function (err) {
        showError(err.message || 'Could not load this client.');
      });
  }

  loadClient();

  var documentUploadForm = document.getElementById('document-upload-form');
  var documentUploadError = document.getElementById('document-upload-error');
  var documentUploadSubmit = document.getElementById('document-upload-submit');
  var MAX_DOCUMENT_BYTES = 8 * 1024 * 1024;

  function fileToBase64(file) {
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onload = function () { resolve(reader.result.split(',')[1]); };
      reader.onerror = function () { reject(new Error('Could not read the selected file.')); };
      reader.readAsDataURL(file);
    });
  }

  if (documentUploadForm) {
    documentUploadForm.addEventListener('submit', function (e) {
      e.preventDefault();
      documentUploadError.classList.add('hidden');

      var fileInput = document.getElementById('document-file');
      var file = fileInput.files[0];
      if (!file) {
        documentUploadError.textContent = 'Please choose a file to upload.';
        documentUploadError.classList.remove('hidden');
        return;
      }
      if (file.size > MAX_DOCUMENT_BYTES) {
        documentUploadError.textContent = 'That file is too large (max 8MB).';
        documentUploadError.classList.remove('hidden');
        return;
      }

      documentUploadSubmit.disabled = true;
      documentUploadSubmit.textContent = 'Uploading…';

      fileToBase64(file)
        .then(function (base64) {
          return fetch('/api/internal/upload-document', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              clientId: clientId,
              label: document.getElementById('document-label').value.trim(),
              category: document.getElementById('document-category').value,
              fileName: file.name,
              contentType: file.type,
              fileBase64: base64
            })
          });
        })
        .then(function (res) { return res.json().then(function (data) { return { ok: res.ok, data: data }; }); })
        .then(function (result) {
          if (!result.ok) throw new Error((result.data && result.data.error) || 'Could not upload this document.');
          documentUploadForm.reset();
          loadClient();
        })
        .catch(function (err) {
          documentUploadError.textContent = err.message || 'Could not upload this document.';
          documentUploadError.classList.remove('hidden');
        })
        .finally(function () {
          documentUploadSubmit.disabled = false;
          documentUploadSubmit.textContent = 'Upload document';
        });
    });
  }

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
