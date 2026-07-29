(function () {
  var loadingEl = document.getElementById('practice-loading');
  var errorBox = document.getElementById('practice-error');
  var emptyBox = document.getElementById('practice-empty');
  var contentBox = document.getElementById('practice-content');

  var modeFlashcardsBtn = document.getElementById('mode-flashcards-btn');
  var modeQuizBtn = document.getElementById('mode-quiz-btn');
  var flashcardsView = document.getElementById('flashcards-view');
  var quizView = document.getElementById('quiz-view');
  var printBtn = document.getElementById('print-btn');
  var printSheet = document.getElementById('print-sheet');

  var flashcardEl = document.getElementById('flashcard');
  var flashcardProgress = document.getElementById('flashcard-progress');
  var flashcardPrevBtn = document.getElementById('flashcard-prev-btn');
  var flashcardNextBtn = document.getElementById('flashcard-next-btn');
  var flashcardShuffleBtn = document.getElementById('flashcard-shuffle-btn');

  var quizUnavailable = document.getElementById('quiz-unavailable');
  var quizPlay = document.getElementById('quiz-play');
  var quizDone = document.getElementById('quiz-done');
  var quizProgress = document.getElementById('quiz-progress');
  var quizPromptEl = document.getElementById('quiz-prompt');
  var quizQuestionText = document.getElementById('quiz-question-text');
  var quizOptionsEl = document.getElementById('quiz-options');
  var quizResultEl = document.getElementById('quiz-result');
  var quizScoreEl = document.getElementById('quiz-score');
  var quizAgainBtn = document.getElementById('quiz-again-btn');

  if (!contentBox) return;

  var allItems = [];
  var flashOrder = [];
  var flashIndex = 0;
  var flashRevealed = false;

  var quizOrder = [];
  var quizIndex = 0;
  var quizScore = 0;
  var quizAnswered = false;

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

  function answerText(item) {
    return item.kind === 'letter' ? item.example_text : item.main_text;
  }

  function quizUsable(item) {
    return item.kind === 'letter' || !!item.image_key || !!item.emoji;
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
      backEl.textContent = item.kind === 'letter' ? (item.main_text + ' is for ' + item.example_text) : item.main_text;
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

  // ---------- Quiz ----------

  function startQuiz() {
    var usable = allItems.filter(quizUsable);
    if (usable.length < 2) {
      quizUnavailable.classList.remove('hidden');
      quizPlay.classList.add('hidden');
      quizDone.classList.add('hidden');
      return;
    }
    quizUnavailable.classList.add('hidden');
    quizOrder = shuffled(usable);
    quizIndex = 0;
    quizScore = 0;
    quizPlay.classList.remove('hidden');
    quizDone.classList.add('hidden');
    renderQuizQuestion();
  }

  function renderQuizQuestion() {
    var item = quizOrder[quizIndex];
    quizAnswered = false;
    quizResultEl.classList.add('hidden');
    quizResultEl.innerHTML = '';
    quizProgress.textContent = 'Question ' + (quizIndex + 1) + ' of ' + quizOrder.length + ' · Score: ' + quizScore;

    quizPromptEl.innerHTML = '';
    if (item.kind === 'letter') {
      var letterEl = document.createElement('div');
      letterEl.className = 'practice-card-letter';
      letterEl.textContent = item.main_text;
      quizPromptEl.appendChild(letterEl);
      quizQuestionText.textContent = 'What sound does this letter make?';
    } else {
      var pic = picElement(item, 130);
      if (pic) quizPromptEl.appendChild(pic);
      quizQuestionText.textContent = 'What word is this?';
    }

    var correct = answerText(item);
    var pool = quizOrder.filter(function (i) { return i !== item && answerText(i) !== correct; }).map(answerText);
    var distractors = shuffled(pool).slice(0, 3);
    var options = shuffled([correct].concat(distractors));

    quizOptionsEl.innerHTML = '';
    options.forEach(function (optionText) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'practice-quiz-option';
      btn.textContent = optionText;
      btn.addEventListener('click', function () { answerQuiz(optionText, correct, btn); });
      quizOptionsEl.appendChild(btn);
    });
  }

  function answerQuiz(chosen, correct, btn) {
    if (quizAnswered) return;
    quizAnswered = true;
    var isCorrect = chosen === correct;
    if (isCorrect) quizScore++;

    Array.prototype.forEach.call(quizOptionsEl.querySelectorAll('.practice-quiz-option'), function (b) {
      b.disabled = true;
      if (b.textContent === correct) b.classList.add('practice-quiz-correct');
      else if (b === btn) b.classList.add('practice-quiz-incorrect');
    });

    var message = document.createElement('p');
    message.textContent = isCorrect ? 'Well done!' : 'Good try - the answer is ' + correct + '.';
    message.className = isCorrect ? 'practice-result-correct' : 'practice-result-incorrect';
    quizResultEl.appendChild(message);

    var nextBtn = document.createElement('button');
    nextBtn.type = 'button';
    nextBtn.className = 'practice-btn';
    nextBtn.textContent = quizIndex + 1 < quizOrder.length ? 'Next question →' : 'See my score';
    nextBtn.addEventListener('click', function () {
      quizIndex++;
      if (quizIndex >= quizOrder.length) {
        finishQuiz();
      } else {
        renderQuizQuestion();
      }
    });
    quizResultEl.appendChild(nextBtn);
    quizResultEl.classList.remove('hidden');
  }

  function finishQuiz() {
    quizPlay.classList.add('hidden');
    quizDone.classList.remove('hidden');
    quizScoreEl.textContent = 'You scored ' + quizScore + ' out of ' + quizOrder.length + '.';
  }

  quizAgainBtn.addEventListener('click', startQuiz);

  // ---------- Mode toggle ----------

  function setMode(mode) {
    modeFlashcardsBtn.classList.toggle('active', mode === 'flashcards');
    modeQuizBtn.classList.toggle('active', mode === 'quiz');
    flashcardsView.classList.toggle('hidden', mode !== 'flashcards');
    quizView.classList.toggle('hidden', mode !== 'quiz');
    if (mode === 'quiz') startQuiz();
  }
  modeFlashcardsBtn.addEventListener('click', function () { setMode('flashcards'); });
  modeQuizBtn.addEventListener('click', function () { setMode('quiz'); });

  // ---------- Print sheet ----------

  function renderPrintSheet() {
    printSheet.innerHTML = '';
    allItems.forEach(function (item) {
      var card = document.createElement('div');
      card.className = 'print-card';
      var pic = picElement(item, 90);
      if (pic) card.appendChild(pic);
      var label = document.createElement('div');
      label.className = 'print-card-label';
      label.textContent = item.kind === 'letter' ? (item.main_text + ' is for ' + item.example_text) : item.main_text;
      card.appendChild(label);
      printSheet.appendChild(card);
    });
  }

  // Toggled with a plain body class rather than relying only on
  // @media print, so the swap works even if print-media detection
  // doesn't behave as expected in a given browser.
  printBtn.addEventListener('click', function () {
    document.body.classList.add('practice-printing');
    window.print();
  });
  window.addEventListener('afterprint', function () {
    document.body.classList.remove('practice-printing');
  });

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

      if (!allItems.length) {
        emptyBox.classList.remove('hidden');
        return;
      }

      contentBox.classList.remove('hidden');
      flashOrder = shuffled(allItems);
      renderFlashcard();
      renderPrintSheet();
    })
    .catch(function (err) {
      loadingEl.classList.add('hidden');
      errorBox.textContent = err.message || 'Could not load your practice words.';
      errorBox.classList.remove('hidden');
    });
})();
