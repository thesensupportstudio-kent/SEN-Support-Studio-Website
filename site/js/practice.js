(function () {
  var loadingEl = document.getElementById('practice-loading');
  var errorBox = document.getElementById('practice-error');
  var emptyBox = document.getElementById('practice-empty');
  var contentBox = document.getElementById('practice-content');
  var pdfsBox = document.getElementById('practice-pdfs');
  var pdfsList = document.getElementById('practice-pdfs-list');

  var flashcardEl = document.getElementById('flashcard');
  var flashcardProgress = document.getElementById('flashcard-progress');
  var flashcardPrevBtn = document.getElementById('flashcard-prev-btn');
  var flashcardNextBtn = document.getElementById('flashcard-next-btn');
  var flashcardShuffleBtn = document.getElementById('flashcard-shuffle-btn');

  if (!contentBox) return;

  var allItems = [];
  var flashOrder = [];
  var flashIndex = 0;
  var flashRevealed = false;

  function shuffled(arr) {
    var copy = arr.slice();
    for (var i = copy.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = copy[i]; copy[i] = copy[j]; copy[j] = tmp;
    }
    return copy;
  }

  // Sized with inline styles rather than relying purely on an external
  // class, so an uploaded photo can never render at its native size
  // regardless of anything else on the page.
  function picElement(item, maxSize) {
    if (item.image_key) {
      var img = document.createElement('img');
      img.src = '/api/client-auth/file?key=' + encodeURIComponent(item.image_key);
      img.alt = '';
      img.style.display = 'block';
      img.style.width = maxSize + 'px';
      img.style.height = maxSize + 'px';
      img.style.maxWidth = '100%';
      img.style.objectFit = 'cover';
      img.style.borderRadius = '14px';
      return img;
    }
    if (item.emoji) {
      var span = document.createElement('span');
      span.className = 'practice-card-emoji';
      span.textContent = item.emoji;
      return span;
    }
    return null;
  }

  // ---------- Flashcards ----------

  function renderFlashcard() {
    var item = flashOrder[flashIndex];
    flashcardProgress.textContent = (flashIndex + 1) + ' of ' + flashOrder.length;
    flashcardEl.innerHTML = '';
    if (!item) return;

    var pic = picElement(item, 130);

    if (!flashRevealed) {
      if (pic) flashcardEl.appendChild(pic);
      if (item.kind === 'letter') {
        var letterEl = document.createElement('div');
        letterEl.className = 'practice-card-letter';
        letterEl.textContent = item.main_text;
        flashcardEl.appendChild(letterEl);
      } else if (!pic) {
        var wordEl = document.createElement('div');
        wordEl.className = 'practice-card-word';
        wordEl.textContent = item.main_text;
        flashcardEl.appendChild(wordEl);
      }
    } else {
      if (pic) flashcardEl.appendChild(pic);
      var backEl = document.createElement('div');
      backEl.className = 'practice-card-word';
      backEl.textContent = (item.kind === 'letter' && item.example_text) ? (item.main_text + ' is for ' + item.example_text) : item.main_text;
      flashcardEl.appendChild(backEl);
    }
    flashcardEl.classList.toggle('revealed', flashRevealed);
  }

  function flipFlashcard() {
    flashRevealed = !flashRevealed;
    renderFlashcard();
  }

  function goFlashcard(delta) {
    flashIndex = (flashIndex + delta + flashOrder.length) % flashOrder.length;
    flashRevealed = false;
    renderFlashcard();
  }

  flashcardEl.addEventListener('click', flipFlashcard);
  flashcardEl.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); flipFlashcard(); }
  });
  flashcardNextBtn.addEventListener('click', function () { goFlashcard(1); });
  flashcardPrevBtn.addEventListener('click', function () { goFlashcard(-1); });
  flashcardShuffleBtn.addEventListener('click', function () {
    flashOrder = shuffled(allItems);
    flashIndex = 0;
    flashRevealed = false;
    renderFlashcard();
  });

  // ---------- Flashcard PDFs ----------

  function renderPdfs(documents) {
    if (!documents.length) return;
    pdfsList.innerHTML = '';
    documents.forEach(function (doc) {
      var link = document.createElement('a');
      link.href = '/api/client-auth/file?key=' + encodeURIComponent(doc.file_key);
      link.target = '_blank';
      link.rel = 'noopener';
      link.className = 'practice-btn practice-pdf-link';
      link.textContent = doc.file_name || 'Print flashcards';
      pdfsList.appendChild(link);
    });
    pdfsBox.classList.remove('hidden');
  }

  // ---------- Load ----------

  fetch('/api/client-auth/practice')
    .then(function (res) {
      if (res.status === 401) {
        window.location.href = 'client-login.html';
        return null;
      }
      return res.json().then(function (data) { return { ok: res.ok, data: data }; });
    })
    .then(function (result) {
      if (!result) return;
      loadingEl.classList.add('hidden');
      if (!result.ok) throw new Error((result.data && result.data.error) || 'Could not load your practice words.');

      allItems = result.data.items || [];
      var documents = result.data.documents || [];
      renderPdfs(documents);

      if (!allItems.length) {
        if (!documents.length) emptyBox.classList.remove('hidden');
        return;
      }

      contentBox.classList.remove('hidden');
      flashOrder = shuffled(allItems);
      renderFlashcard();
    })
    .catch(function (err) {
      loadingEl.classList.add('hidden');
      errorBox.textContent = err.message || 'Could not load your practice words.';
      errorBox.classList.remove('hidden');
    });
})();
