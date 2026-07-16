(function () {
  var DATA = window.SENSORY_CHECKLIST || { categories: [], adlItems: [] };

  var form = document.getElementById('sensory-form');
  var success = document.getElementById('sensory-success');
  var errorBox = document.getElementById('sensory-error');
  var categoriesRoot = document.getElementById('checklist-categories');
  var adlRoot = document.getElementById('adl-fields');
  if (!form || !success) return;

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text) node.textContent = text;
    return node;
  }

  function renderChecklistItem(name, value) {
    var label = el('label', 'checklist-item');
    var input = document.createElement('input');
    input.type = 'checkbox';
    input.name = name;
    input.value = value;
    label.appendChild(input);
    label.appendChild(document.createTextNode(value));
    return label;
  }

  function renderCategories() {
    if (!categoriesRoot) return;
    DATA.categories.forEach(function (cat, ci) {
      var card = el('div', 'book-card');
      var heading = el('div', 'book-step-heading');
      heading.appendChild(el('h2', null, cat.title));
      card.appendChild(heading);
      if (cat.subtitle) card.appendChild(el('p', 'checklist-note', cat.subtitle));

      if (cat.type === 'single') {
        if (cat.note) card.appendChild(el('p', 'checklist-note', cat.note));
        var column = el('div', 'checklist-column');
        cat.items.forEach(function (item) {
          column.appendChild(renderChecklistItem('cat' + ci, item));
        });
        var wrap = el('div', 'checklist-columns');
        wrap.appendChild(column);
        card.appendChild(wrap);
      } else {
        var columnsWrap = el('div', 'checklist-columns');
        cat.columns.forEach(function (col, coli) {
          var colNode = el('div', 'checklist-column');
          colNode.appendChild(el('h3', null, col.label));
          col.items.forEach(function (item) {
            colNode.appendChild(renderChecklistItem('cat' + ci + '_col' + coli, item));
          });
          columnsWrap.appendChild(colNode);
        });
        card.appendChild(columnsWrap);
      }

      if (cat.extraField) {
        var extraFieldWrap = el('div', 'form-field');
        var extraId = 'cat-extra-' + ci;
        var extraLabel = el('label', null, cat.extraField.label);
        extraLabel.setAttribute('for', extraId);
        var extraTextarea = document.createElement('textarea');
        extraTextarea.id = extraId;
        extraTextarea.rows = 2;
        extraTextarea.placeholder = 'Optional';
        extraFieldWrap.appendChild(extraLabel);
        extraFieldWrap.appendChild(extraTextarea);
        card.appendChild(extraFieldWrap);
      }

      categoriesRoot.appendChild(card);
    });
  }

  function renderAdlFields() {
    if (!adlRoot) return;
    DATA.adlItems.forEach(function (item, i) {
      var field = el('div', 'form-field');
      var label = el('label', null, item);
      var id = 'adl-' + i;
      label.setAttribute('for', id);
      var textarea = document.createElement('textarea');
      textarea.id = id;
      textarea.name = 'adl-' + i;
      textarea.rows = 2;
      textarea.placeholder = 'Optional';
      field.appendChild(label);
      field.appendChild(textarea);
      adlRoot.appendChild(field);
    });
  }

  function collectChecked(name) {
    return Array.prototype.slice
      .call(document.querySelectorAll('input[name="' + name + '"]:checked'))
      .map(function (input) { return input.value; });
  }

  function collectCategories() {
    return DATA.categories.map(function (cat, ci) {
      var extra = '';
      if (cat.extraField) {
        var extraField = document.getElementById('cat-extra-' + ci);
        if (extraField) extra = extraField.value.trim();
      }

      if (cat.type === 'single') {
        return { title: cat.title, type: 'single', selected: collectChecked('cat' + ci), extra: extra, extraLabel: cat.extraField ? cat.extraField.label : '' };
      }
      return {
        title: cat.title,
        type: 'double',
        columns: cat.columns.map(function (col, coli) {
          return { label: col.label, selected: collectChecked('cat' + ci + '_col' + coli) };
        }),
        extra: extra,
        extraLabel: cat.extraField ? cat.extraField.label : ''
      };
    });
  }

  function collectAdl() {
    var adl = {};
    DATA.adlItems.forEach(function (item, i) {
      var field = document.getElementById('adl-' + i);
      if (field && field.value.trim()) adl[item] = field.value.trim();
    });
    return adl;
  }

  function showError(message) {
    if (!errorBox) return;
    errorBox.textContent = message;
    errorBox.classList.remove('hidden');
  }

  renderCategories();
  renderAdlFields();

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (errorBox) errorBox.classList.add('hidden');

    var submitBtn = form.querySelector('.form-submit');
    submitBtn.disabled = true;

    var payload = {
      child: {
        childName: document.getElementById('child-name').value.trim(),
        dob: document.getElementById('child-dob').value,
        school: document.getElementById('child-school').value.trim(),
        klass: document.getElementById('child-class').value.trim(),
        completedBy: document.getElementById('completed-by').value.trim(),
        contactEmail: document.getElementById('contact-email').value.trim()
      },
      categories: collectCategories(),
      adl: collectAdl(),
      token: new URLSearchParams(window.location.search).get('token') || undefined
    };

    fetch('/api/sensory-questionnaire', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
      .then(function (res) { return res.json().then(function (data) { return { ok: res.ok, data: data }; }); })
      .then(function (result) {
        if (!result.ok) {
          throw new Error((result.data && result.data.error) || 'Something went wrong sending your questionnaire.');
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
