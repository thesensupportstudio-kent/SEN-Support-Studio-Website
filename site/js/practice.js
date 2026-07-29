(function () {
  var ledeEl = document.getElementById('practice-lede');
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

  function escapeHtml(str) {
    return String(str == null ? '' : str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function shuffled(arr) {
    var copy = arr.slice();
    for (var i = copy.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = copy[i]; copy[i] = copy[j]; copy[j] = tmp;
    }
    return copy;
  }

  function pictureHtml(item, sizeClass) {
    if (item.image_key) {
      return '<img src="/api/client-auth/file?key=' + encodeURIComponent(item.image_key) + '" alt="" class="' + sizeClass + '">';
    }
    if (item.emoji) {
      return '<span class="' + sizeClass + '">' + escapeHtml(item.emoji) + '</span>';
    }
    return '';
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
    if (!item) return;

    if (!flashRevealed) {
      var frontPic = pictureHtml(item, 'practice-card-pic');
      var frontText = item.kind === 'letter'
        ? '<div class="practice-card-letter">' + escapeHtml(item.main_text) + '</div>'
        : (frontPic ? '' : '<div class="practice-card-word">' + escapeHtml(item.main_text) + '</div>');
      flashcardEl.innerHTML = frontPic + frontText;
    } else {
      var backPic = pictureHtml(item, 'practice-card-pic');
      var backText = item.kind === 'letter'
        ? '<div class="practice-card-word">' + escapeHtml(item.main_text) + ' is for ' + escapeHtml(item.example_text) + '</div>'
        : '<div class="practice-card-word">' + escapeHtml(item.main_text) + '</div>';
      flashcardEl.innerHTML = backPic + backText;
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
    quizResultEl.textContent = '';
    quizProgress.textContent = 'Question ' + (quizIndex + 1) + ' of ' + quizOrder.length + ' · Score: ' + quizScore;

    if (item.kind === 'letter') {
      quizPromptEl.innerHTML = '<div class="practice-card-letter">' + escapeHtml(item.main_text) + '</div>';
      quizQuestionText.textContent = 'What sound does this letter make?';
    } else {
      quizPromptEl.innerHTML = pictureHtml(item, 'practice-card-pic');
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
      btn.className = 'btn btn-outline practice-quiz-option';
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

    quizResultEl.textContent = isCorrect ? 'Well done!' : 'Good try - the answer is ' + correct + '.';
    quizResultEl.classList.remove('hidden');
    quizResultEl.classList.toggle('practice-result-correct', isCorrect);
    quizResultEl.classList.toggle('practice-result-incorrect', !isCorrect);

    var nextBtn = document.createElement('button');
    nextBtn.type = 'button';
    nextBtn.className = 'btn btn-primary';
    nextBtn.style.marginTop = '12px';
    nextBtn.textContent = quizIndex + 1 < quizOrder.length ? 'Next question →' : 'See my score';
    nextBtn.addEventListener('click', function () {
      quizIndex++;
      if (quizIndex >= quizOrder.length) {
        finishQuiz();
      } else {
        renderQuizQuestion();
      }
    });
    quizResultEl.appendChild(document.createElement('br'));
    quizResultEl.appendChild(nextBtn);
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
      var pic = pictureHtml(item, 'print-card-pic');
      var label = item.kind === 'letter'
        ? escapeHtml(item.main_text) + ' is for ' + escapeHtml(item.example_text)
        : escapeHtml(item.main_text);
      card.innerHTML = pic + '<div class="print-card-label">' + label + '</div>';
      printSheet.appendChild(card);
    });
  }

  printBtn.addEventListener('click', function () {
    window.print();
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
      if (!result.ok) throw new Error((result.data && result.data.error) || 'Could not load your practice words.');

      allItems = result.data.items || [];
      ledeEl.textContent = allItems.length
        ? 'Play, quiz, or print off what you’ve been working on together.'
        : 'Nothing added yet.';

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
      errorBox.textContent = err.message || 'Could not load your practice words.';
      errorBox.classList.remove('hidden');
    });
})();
