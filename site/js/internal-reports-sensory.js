(function () {
  var DOMAINS = [
    {
      key: 'auditory',
      label: 'Auditory',
      subtitle: 'Hearing, sound sensitivity, spoken language',
      classifications: ['Under responsive', 'Over responsive', 'Mixed', 'Other'],
      behaviours: {
        over: [
          'Does not like loud noises but makes own ‘loud’ noises',
          'Unable to locate the source of a sound',
          'Can hear sounds others are not aware of',
          'Puts fingers in ears',
          'Puts hands over ears',
          'Hides under table',
          'Speaks in really quiet voice',
          'Gets tired'
        ],
        under: [
          'Shouts',
          'Talks off topic',
          'Talks out loud',
          'Sings / talks inappropriately',
          'Hums / sings / talks to self',
          'Unaware of sounds or where they come from',
          'Difficulty recalling / repeating / speaking articulately',
          'Gets tired'
        ]
      },
      strategies: {
        avoiding: [
          'Low arousal/safe space', 'Ear defenders', 'Sit away from door', 'Close door/window',
          'Workstation', 'Pre-warn of fire alarm', 'Noise meter', 'Mat to mute sound',
          'Avoid busy transitions', 'Monitor noise from equipment (e.g. ticking clock, buzzing IWB/speaker)',
          'Monitor overload of language', 'Visual support', 'Makaton (key vocabulary)', 'Language Link',
          'Social narrative re strategies available', 'Silent timers'
        ],
        seeking: [
          'Singing', 'Music', 'Shaker', 'Audio stories', 'White noise app',
          'Opportunities to make noise (e.g. musical instruments)', 'Cue name for attention',
          'Visuals/Makaton to support auditory input'
        ]
      }
    },
    {
      key: 'visual',
      label: 'Visual',
      subtitle: 'Sight, light sensitivity, visual attention',
      classifications: ['Under responsive', 'Over responsive', 'Mixed', 'Other'],
      behaviours: {
        over: [
          'Child covers eyes / withdraws from bright lights',
          'Avoids certain / bright colours',
          'Gets headaches from lights / reading / watching TV',
          'Looks down to the side or out of corner of eyes',
          'Focus on detail',
          'Pays attention to small details',
          'Poor / or avoids eye contact',
          'Prefers dark areas / playing in the dark',
          'Avoids looking at TV or computer screen',
          'Difficulty matching / sorting objects',
          'Seems not to see objects on busy pictures',
          'Constantly scans visual information',
          'Finds coloured lenses useful when reading'
        ],
        under: [
          'Has difficulty distinguishing certain letters – p/q, b/d, x/+',
          'Makes reversals in words – saw/was, no/on',
          'Loses place when reading or doing maths problems',
          'Difficulty in seeing different colours, shapes, sizes',
          'Craves bright, colourful and cluttered spaces',
          'Seeks bright lights / flickering lights',
          'Likes shiny objects / colourful resources',
          'Rubs eyes hard / inappropriate staring',
          'Uses peripheral vision / sees double',
          'Watches repetitive movements',
          'Enjoys flicking lights on and off',
          'Likes watching sand falling and water',
          'Lines up objects',
          'Likes looking at spinning/shiny objects',
          'Flicks fingers/hand/toys in front of eyes'
        ]
      },
      strategies: {
        avoiding: [
          'Low arousal/safe space', 'Uncluttered environment', 'Monitor seating (distractions)',
          'IWB on standby', 'Buff/preferred colour paper/IWB', 'Colorveil app', 'Dim lighting',
          'Den', 'Blinds', 'Sunglasses', 'Awareness of impact of colours (displays/visuals/clothing/patterns)',
          'Cover displays when not used', 'Monitor reflections/patterns', 'Laminate using matt pouches',
          "Don't insist on eye contact"
        ],
        seeking: [
          'Makaton (key vocabulary)', 'Visual aids (e.g. task planners)', 'Lanyard cards', 'Light',
          'Lava lamp', 'Glitter bottle', 'Visual timer', 'Colourful items',
          "Activity/book (e.g. Where's Wally?)"
        ]
      }
    },
    {
      key: 'tactile',
      label: 'Tactile',
      subtitle: 'Touch, texture, pressure',
      classifications: ['Under responsive', 'Over responsive', 'Mixed', 'Other'],
      behaviours: {
        over: [
          'Pulls away from light touch / avoids holding hands',
          'Avoids crowded situations',
          'Dislikes certain textures / removes clothes',
          'Avoids messy activities',
          'Resists having teeth brushed / nails or hair cut / brushed',
          'Likes labels cut out of clothes',
          'Does not like getting hands or body wet',
          'Dislikes wearing shoes / socks / hats / gloves',
          'Dislikes being dried by a towel / being tickled',
          'Low pain threshold',
          'Gets fearful, anxious or aggressive with light or unexpected touch',
          'May become frightened when touched by someone/something that they cannot see',
          'May avoid group situations and/or sporting activities',
          'Avoids being out in windy weather, or when raining',
          'May get distressed by dirty hands/face',
          'May avoid wiping after toileting',
          'May refuse to wear socks/shoes',
          'Walks on toes on new flooring/textures'
        ],
        under: [
          'High pain threshold',
          'Excessively touches objects',
          'Seeks messy play',
          'Likes to touch/stroke objects/surfaces/textures',
          'Needs to fiddle',
          'Likes pressure',
          'Has trouble keeping hands to self',
          'Cannot feel changes in temperature / wind on their body',
          'Plays rough and tumble and aggressive games',
          'Unaware of hurting others whilst playing',
          'Gets frustrated when buttoning or unzipping clothes',
          'Not aware if being touched/bumped into unless done with intensity',
          'Can be heavy handed, too much force used when around children/pets when playing',
          'Craves vibration',
          'Self-harming, i.e. may pick skin'
        ]
      },
      strategies: {
        avoiding: [
          'Low arousal/safe space', 'Adaptations to uniform', 'Loose clothing', 'Seamless socks',
          'Opportunities for removing shoes', 'Alternatives to handwriting (e.g. laptop)',
          'Choice of pens/pencils', 'Avoid busy desk location', 'Explore preferred seat',
          'Avoid busy transitions', 'Monitor desk sharing (offer left side if left-handed)',
          'Padded seat/cushion', 'Social narrative re strategies for busy places', 'Pencil grips'
        ],
        seeking: [
          'Fidget/transition tool (e.g. Tangle)', 'Blue Tack', 'Messy play', 'Sand play',
          'Finger paints', 'Velcro under desk', 'Rice pot', 'Blanket', 'Carpet square/marker'
        ]
      }
    },
    {
      key: 'oral',
      label: 'Oral',
      subtitle: 'Taste, food preferences, mouth sensitivity',
      classifications: ['Under responsive', 'Over responsive', 'Mixed', 'Other'],
      behaviours: {
        over: [
          'Only eats certain foods, picky eater',
          'Eats small range of foods, even certain brands',
          'Hesitant to try new foods / flavours / textures',
          'Drinks through a straw or special bottle',
          "Likes bland food / 'beige' food",
          'Refuses new food, may only eat soft food',
          'Sensitive to eating hot or cold foods',
          'May gag at some textures of food',
          'Complains about spicy, salty, sweet, sour food',
          'Does not like brushing teeth/taste of toothpaste',
          'Fears going to the dentist',
          'Dislikes or avoids fizzy drinks',
          'Dislikes or avoids chewing food',
          'Avoids crunchy food',
          'Dislikes having teeth brushed',
          'Dislikes fork / spoon'
        ],
        under: [
          'Will put non-food objects in mouth past the age of two',
          'May bite',
          'Eats very quickly',
          'Likes excessively spicy, sweet, sour or salty food',
          'Excessive drooling',
          'Chews on hair, shirt, fingers',
          'Has difficulty sucking, chewing and swallowing',
          'Acts as if all foods taste the same',
          'Demands sauce, condiments and seasoning on food',
          'May seek vibration to the mouth (e.g. loves vibrating toothbrushes)',
          'Likes to chew – may chew edible and inedible objects',
          'Likes to teeth grind',
          'May bite cheek, tongue or lips',
          'May chew pencils or fingers',
          'May overfill mouth with food, swallow large chunks'
        ]
      },
      strategies: {
        avoiding: [
          'Food separated on plate', 'Quiet space to eat', 'Extended time to eat', 'Choice board',
          'Social narrative'
        ],
        seeking: [
          'Sports bottle/straw to suck', 'Chewy tool', 'Crunchy fruit/veg/snacks',
          'Flavoured things to chew/suck', 'Visual sorting activity (can eat/cannot eat)',
          'Choice board', 'Symbol-supported ‘cannot eat’ sign'
        ]
      },
      extraField: { id: 'oral-diet', label: 'If the child has a limited diet, list the foods they will eat' }
    },
    {
      key: 'olfactory',
      label: 'Olfactory (Smell)',
      subtitle: 'Sensitivity to smells',
      classifications: ['Under responsive', 'Over responsive', 'Mixed', 'Other'],
      behaviours: {
        over: [
          'Avoids areas of school / home',
          'Bothered by smells that do not bother others',
          'Offended by bathroom smells',
          'Tells other people how bad, or how funny they smell',
          'Covers nose',
          'Refuses certain foods (see taste)'
        ],
        under: [
          'Seeks certain smells',
          'Finds it difficult discriminating unpleasant odours',
          'Puts unpleasant smelling objects into their mouth',
          "Cannot smell scratch'n'sniff stickers",
          'Smells objects / people',
          'Will excessively use smell to familiarise themselves when introduced to new foods, people, objects, and places'
        ]
      },
      strategies: {
        avoiding: [
          'Unscented products', 'Separate arrangements for eating', 'Fresh air/open window',
          'Monitor trigger pattern (e.g. Friday fish and chips)'
        ],
        seeking: [
          'Favourite smell (e.g. lavender, scented toy/fabric from home)',
          "'Not available' sign (e.g. paints)"
        ]
      }
    },
    {
      key: 'proprioception',
      label: 'Proprioception',
      subtitle: 'Body position, movement, spatial awareness',
      classifications: ['Under responsive', 'Other'],
      behaviours: {
        under: [
          'Unable to keep still, very fidgety, craves movement',
          'Often sits in a W position on the floor',
          'Poor fine motor skills',
          'Walks on toes or stomps feet',
          'Likes jumping / trampolining / bouncing on furniture',
          'Difficulty turning handles, opening and closing items',
          'Enjoys bear hugs (on own terms)',
          'Rocks, spins, flaps, takes risks',
          'Loves rough / tumble play, tackling / wrestling games/roughhousing',
          'Likes tight and small spaces',
          'Has sleeping difficulties',
          'Difficulties manipulating small objects – tying laces',
          'Clumsy, everything is done with too much force',
          'Enjoys falling off objects',
          'Likes being wrapped in blanket / firm touch / massage',
          'Grinds teeth',
          'Frequently cracks knuckles',
          'Exerts too much pressure when handling objects',
          'Excessive banging of toys and objects',
          'Unaware of personal space / body position in space',
          'Wears clothes (belts, shoelaces) as tight as possible',
          'Difficulty regulating pressure when writing or drawing, presses too lightly or too hard',
          'Often rips paper when erasing, pushing too hard',
          'May not understand how heavy or how light',
          'May love pushing, pulling or dragging objects'
        ]
      },
      strategies: {
        avoiding: [
          'Explore pens/pencil grips', 'Support when avoiding playground equipment',
          'Support when navigating busy places', 'Approach pupil from front',
          'Use visuals to indicate personal space (e.g. carpet mat)'
        ],
        seeking: [
          'Sensory Circuit activities (alerting, organising, calming)',
          'Movement breaks (e.g. wall/chair push-ups, Simon Says)', 'Lean against wall/furniture',
          'Wall push-ups', 'Carry', 'Stack', 'Lift', 'Office message/errand', 'Push', 'Pull', 'Dig',
          'Water plants', 'Sweep', 'Tap', 'Bang', 'Lego', 'Putty', 'Jumping', 'Armrest', 'Blanket',
          'Standing desk'
        ]
      }
    },
    {
      key: 'vestibular',
      label: 'Vestibular',
      subtitle: 'Balance, spatial orientation',
      classifications: ['Under responsive', 'Over responsive', 'Mixed', 'Other'],
      behaviours: {
        over: [
          'Fear of heights',
          'Fear of lifts / escalators / walking upstairs / uneven surfaces',
          'Avoids feet leaving the ground',
          'Dislikes head being tipped back (washing hair)',
          'Dislikes sudden movement / anxious if moved suddenly',
          'Fears challenges to balance (being pushed / falling)',
          'Dislikes playground equipment, ladders, slides, swings',
          'Avoids active games (PE), avoids games requiring balance, hopping, jumping',
          'May have difficulty riding a bike',
          'Travel sickness',
          'Dislikes stop and start of car',
          'Dislikes change of position, avoids rapid or rotating movements'
        ],
        under: [
          'Rocks, spins, hops, runs or bounces rather than walks',
          'Cannot keep still, i.e. shakes leg, moves head, rocks body when seated',
          'Likes fast rides',
          'Likes roundabout',
          'Spins self, possibly for hours and does not get dizzy',
          'Enjoys being thrown in air',
          'Enjoys rough and tumble',
          'Seeks balancing activities',
          'Likes climbing',
          'Poor balance',
          'Loves to swing as high as possible',
          'Is a thrill seeker and can be dangerous at times'
        ]
      },
      strategies: {
        avoiding: [
          'Adjust expectations in PE (e.g. hopping, forward rolls) & support visually', 'Partner work',
          'Extra time', 'Break down task/routine visually (e.g. task planner, concept vocab left/right)',
          'Jump Ahead programme'
        ],
        seeking: [
          'Sensory Circuit activities', 'Wobble board', 'Balance board', 'Scooter board', 'Running',
          'Spinning', 'Jumping', 'Movement breaks', 'Chores'
        ]
      }
    },
    {
      key: 'interoception',
      label: 'Interoception',
      subtitle: 'Internal body signals (hunger, thirst, toilet needs, pain, temperature, emotions)',
      draft: true,
      classifications: ['Under responsive', 'Over responsive', 'Mixed', 'Other'],
      behaviours: {
        over: [
          'Reports hunger or thirst very frequently or urgently',
          'Reports needing the toilet very frequently or urgently',
          'Overreacts to minor pain or discomfort',
          'Very aware of and distressed by heartbeat/breathing sensations',
          'Frequently reports feeling too hot or too cold',
          'Becomes distressed by internal sensations (e.g. stomach ache, dizziness)',
          'Overwhelmed easily by strong emotions'
        ],
        under: [
          'Doesn’t recognise when hungry or thirsty',
          'Doesn’t recognise when needing the toilet / has accidents',
          'Doesn’t notice pain from injuries',
          'Doesn’t notice when unwell',
          'Doesn’t recognise feeling too hot or too cold',
          'Doesn’t recognise tiredness / fatigue',
          'Struggles to identify or name their own emotions',
          'Doesn’t notice a fast or racing heartbeat',
          'Doesn’t recognise when they need to breathe deeply / calm down'
        ]
      },
      strategies: {
        avoiding: [
          'Low arousal/safe space', 'Self-awareness activities (e.g. "Who am I? What do I look like?")',
          'Group cohesion games', 'Mirror work', 'Adult label/comment (e.g. body temp, thirsty, hungry)',
          '‘Line up if...’ game', '‘Change places if...’ game', '‘Guess who?’ game',
          '‘The person I’m thinking of...’ game', 'Pop Up Pirate', 'Jenga', 'Simon Says',
          'Body scanning with visuals at transition points', 'Kelly Mahler activities', 'BEST strategies'
        ],
        seeking: [
          'Low arousal/safe space & trusted adult',
          'Adult label/comment (e.g. "I notice/wonder...", linked with body signals)',
          'Active, consistent emotional regulation framework (e.g. Zones of Regulation)', 'Stories',
          'Visual & verbal emotional check-ins (e.g. happy vs not happy)', 'BEST strategies'
        ]
      }
    }
  ];

  var state = {
    step: 0,
    client: { clientName: '', clientEmail: '', ccEmail: '', sessionDate: '' },
    domainData: {}
  };

  DOMAINS.forEach(function (d) {
    state.domainData[d.key] = { classification: '', otherText: '', behaviours: [], avoiding: [], seeking: [], notes: '', extra: '' };
  });

  var TOTAL_STEPS = 1 + DOMAINS.length + 1; // client info + domains + final notes/submit

  var root = document.getElementById('wizard-root');
  var progressEl = document.getElementById('wizard-progress');
  var errorBox = document.getElementById('report-error');
  var successBox = document.getElementById('report-success');
  var successDetail = document.getElementById('report-success-detail');
  var wizardCard = document.getElementById('wizard-card');

  if (!root) return;

  function todayIso() {
    var d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }

  function el(tag, attrs, children) {
    var node = document.createElement(tag);
    attrs = attrs || {};
    Object.keys(attrs).forEach(function (k) {
      if (k === 'class') node.className = attrs[k];
      else if (k === 'text') node.textContent = attrs[k];
      else node.setAttribute(k, attrs[k]);
    });
    (children || []).forEach(function (c) { if (c) node.appendChild(c); });
    return node;
  }

  function checklistGroup(title, items, storeArray, idPrefix) {
    var wrap = el('div', { class: 'form-field' });
    wrap.appendChild(el('label', { text: title }));
    var group = el('div', { class: 'pill-group' });
    items.forEach(function (item, i) {
      var id = idPrefix + '-' + i;
      var input = el('input', { type: 'checkbox', id: id, value: item });
      input.checked = storeArray.indexOf(item) !== -1;
      input.addEventListener('change', function () {
        var idx = storeArray.indexOf(item);
        if (input.checked && idx === -1) storeArray.push(item);
        if (!input.checked && idx !== -1) storeArray.splice(idx, 1);
      });
      var label = el('label', { class: 'pill-option', for: id }, [input, document.createTextNode(item)]);
      group.appendChild(label);
    });
    wrap.appendChild(group);
    return wrap;
  }

  function renderClientStep() {
    var wrap = el('div', {});
    wrap.appendChild(el('h2', { text: 'Client details', class: 'step-title' }));

    var row1 = el('div', { class: 'internal-form-row' });
    var nameField = el('div', { class: 'form-field' }, [el('label', { text: 'Client / family name', for: 'client-name' })]);
    var nameInput = el('input', { type: 'text', id: 'client-name', placeholder: 'e.g. The Wilson family' });
    nameInput.value = state.client.clientName;
    nameInput.addEventListener('input', function () { state.client.clientName = nameInput.value; });
    nameField.appendChild(nameInput);

    var dateField = el('div', { class: 'form-field' }, [el('label', { text: 'Session date', for: 'session-date' })]);
    var dateInput = el('input', { type: 'date', id: 'session-date' });
    dateInput.value = state.client.sessionDate || todayIso();
    state.client.sessionDate = dateInput.value;
    dateInput.addEventListener('input', function () { state.client.sessionDate = dateInput.value; });
    dateField.appendChild(dateInput);

    row1.appendChild(nameField);
    row1.appendChild(dateField);

    var row2 = el('div', { class: 'internal-form-row' });
    var emailField = el('div', { class: 'form-field' }, [el('label', { text: 'Client email', for: 'client-email' })]);
    var emailInput = el('input', { type: 'email', id: 'client-email', placeholder: 'parent@example.com or school SENCO' });
    emailInput.value = state.client.clientEmail;
    emailInput.addEventListener('input', function () { state.client.clientEmail = emailInput.value; });
    emailField.appendChild(emailInput);

    var ccField = el('div', { class: 'form-field' }, [el('label', { text: 'CC email (optional)', for: 'cc-email' })]);
    var ccInput = el('input', { type: 'email', id: 'cc-email' });
    ccInput.value = state.client.ccEmail;
    ccInput.addEventListener('input', function () { state.client.ccEmail = ccInput.value; });
    ccField.appendChild(ccInput);

    row2.appendChild(emailField);
    row2.appendChild(ccField);

    wrap.appendChild(row1);
    wrap.appendChild(row2);
    return wrap;
  }

  function renderDomainStep(domain) {
    var data = state.domainData[domain.key];
    var wrap = el('div', {});
    wrap.appendChild(el('h2', { text: domain.label, class: 'step-title' }));
    wrap.appendChild(el('p', { text: domain.subtitle, class: 'step-subtitle' }));
    if (domain.draft) {
      wrap.appendChild(el('p', { class: 'form-error', text: 'Draft section — no source checklist existed for Interoception, please review these items carefully.' }));
    }

    // Classification
    var classField = el('div', { class: 'form-field' });
    classField.appendChild(el('label', { text: 'Response type' }));
    var toggleRow = el('div', { class: 'toggle-row' });
    domain.classifications.forEach(function (opt, i) {
      var id = domain.key + '-class-' + i;
      var input = el('input', { type: 'radio', name: domain.key + '-classification', id: id, value: opt });
      input.checked = data.classification === opt;
      input.addEventListener('change', function () {
        data.classification = opt;
        otherWrap.classList.toggle('hidden', opt !== 'Other');
      });
      toggleRow.appendChild(el('label', { class: 'pill-option', for: id }, [input, document.createTextNode(opt)]));
    });
    classField.appendChild(toggleRow);
    var otherWrap = el('div', { class: 'subfield' + (data.classification === 'Other' ? '' : ' hidden') });
    var otherInput = el('input', { type: 'text', placeholder: 'Describe the response type...' });
    otherInput.value = data.otherText;
    otherInput.addEventListener('input', function () { data.otherText = otherInput.value; });
    otherWrap.appendChild(otherInput);
    classField.appendChild(otherWrap);
    wrap.appendChild(classField);

    // Behaviours checklist
    if (domain.behaviours.over && domain.behaviours.over.length) {
      wrap.appendChild(checklistGroup('Observed behaviours — over responsive', domain.behaviours.over, data.behaviours, domain.key + '-over'));
    }
    if (domain.behaviours.under && domain.behaviours.under.length) {
      wrap.appendChild(checklistGroup('Observed behaviours — under responsive', domain.behaviours.under, data.behaviours, domain.key + '-under'));
    }

    // Strategies
    wrap.appendChild(checklistGroup('Strategies suggested — avoiding (calming/reducing input)', domain.strategies.avoiding, data.avoiding, domain.key + '-avoid'));
    wrap.appendChild(checklistGroup('Strategies suggested — seeking (alerting/providing input)', domain.strategies.seeking, data.seeking, domain.key + '-seek'));

    if (domain.extraField) {
      var extraField = el('div', { class: 'form-field' });
      extraField.appendChild(el('label', { text: domain.extraField.label, for: domain.extraField.id }));
      var extraInput = el('textarea', { id: domain.extraField.id, rows: '2' });
      extraInput.value = data.extra;
      extraInput.addEventListener('input', function () { data.extra = extraInput.value; });
      extraField.appendChild(extraInput);
      wrap.appendChild(extraField);
    }

    var notesField = el('div', { class: 'form-field' });
    notesField.appendChild(el('label', { text: 'Additional notes (optional)' }));
    var notesInput = el('textarea', { rows: '2', placeholder: 'Anything else observed...' });
    notesInput.value = data.notes;
    notesInput.addEventListener('input', function () { data.notes = notesInput.value; });
    notesField.appendChild(notesInput);
    wrap.appendChild(notesField);

    return wrap;
  }

  function renderFinalStep() {
    var wrap = el('div', {});
    wrap.appendChild(el('h2', { text: 'Overall summary', class: 'step-title' }));
    wrap.appendChild(el('p', { text: 'Anything you want to add to the top of the report before sending.', class: 'step-subtitle' }));
    var field = el('div', { class: 'form-field' });
    field.appendChild(el('label', { text: 'Overall summary / recommendations (optional)', for: 'final-summary' }));
    var textarea = el('textarea', { id: 'final-summary', rows: '5' });
    textarea.value = state.finalSummary || '';
    textarea.addEventListener('input', function () { state.finalSummary = textarea.value; });
    field.appendChild(textarea);
    wrap.appendChild(field);
    return wrap;
  }

  function stepLabel(i) {
    if (i === 0) return 'Client details';
    if (i === TOTAL_STEPS - 1) return 'Summary';
    return DOMAINS[i - 1].label;
  }

  function render() {
    root.innerHTML = '';
    var content;
    if (state.step === 0) content = renderClientStep();
    else if (state.step === TOTAL_STEPS - 1) content = renderFinalStep();
    else content = renderDomainStep(DOMAINS[state.step - 1]);
    root.appendChild(content);
    progressEl.textContent = 'Step ' + (state.step + 1) + ' of ' + TOTAL_STEPS + ' — ' + stepLabel(state.step);

    document.getElementById('wizard-back').disabled = state.step === 0;
    var nextBtn = document.getElementById('wizard-next');
    var submitBtn = document.getElementById('wizard-submit');
    if (state.step === TOTAL_STEPS - 1) {
      nextBtn.classList.add('hidden');
      submitBtn.classList.remove('hidden');
    } else {
      nextBtn.classList.remove('hidden');
      submitBtn.classList.add('hidden');
    }
    window.scrollTo(0, 0);
  }

  function validateClientStep() {
    if (!state.client.clientName.trim() || !state.client.clientEmail.trim() || !state.client.sessionDate) {
      return 'Please fill in client name, email and session date.';
    }
    var emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRe.test(state.client.clientEmail.trim())) return 'Please check the client email address.';
    if (state.client.ccEmail.trim() && !emailRe.test(state.client.ccEmail.trim())) return 'Please check the CC email address.';
    return null;
  }

  function showError(msg) {
    errorBox.textContent = msg;
    errorBox.classList.remove('hidden');
    window.scrollTo(0, 0);
  }

  function clearError() {
    errorBox.classList.add('hidden');
    errorBox.textContent = '';
  }

  document.getElementById('wizard-back').addEventListener('click', function () {
    if (state.step > 0) { state.step -= 1; clearError(); render(); }
  });

  document.getElementById('wizard-next').addEventListener('click', function () {
    if (state.step === 0) {
      var err = validateClientStep();
      if (err) { showError(err); return; }
    }
    clearError();
    state.step += 1;
    render();
  });

  function buildSections() {
    var sections = [];
    if (state.finalSummary && state.finalSummary.trim()) {
      sections.push({ heading: 'Overall summary', content: state.finalSummary.trim() });
    }
    DOMAINS.forEach(function (d) {
      var data = state.domainData[d.key];
      var lines = [];
      var classification = data.classification === 'Other' ? ('Other — ' + (data.otherText || '')) : data.classification;
      if (classification) lines.push('Response type: ' + classification);
      if (data.behaviours.length) lines.push('Observed behaviours: ' + data.behaviours.join(', '));
      if (data.avoiding.length) lines.push('Strategies suggested (avoiding): ' + data.avoiding.join(', '));
      if (data.seeking.length) lines.push('Strategies suggested (seeking): ' + data.seeking.join(', '));
      if (d.extraField && data.extra && data.extra.trim()) lines.push(d.extraField.label + ': ' + data.extra.trim());
      if (data.notes && data.notes.trim()) lines.push('Notes: ' + data.notes.trim());
      if (lines.length) {
        sections.push({ heading: d.label, content: lines.join('\n\n') });
      }
    });
    return sections;
  }

  document.getElementById('wizard-submit').addEventListener('click', function () {
    clearError();
    var sections = buildSections();
    if (sections.length === 0) {
      showError('Please fill in at least one section before sending.');
      return;
    }
    var payload = {
      title: 'Sensory Profile Report',
      service: 'Sensory Profile Root',
      clientLabel: 'Child',
      clientName: state.client.clientName.trim(),
      clientEmail: state.client.clientEmail.trim(),
      ccEmail: state.client.ccEmail.trim(),
      sessionDate: state.client.sessionDate,
      sections: sections
    };

    var submitBtn = document.getElementById('wizard-submit');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Sending...';

    fetch('/api/send-report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
      .then(function (res) {
        return res.json().then(function (data) { return { ok: res.ok, data: data }; });
      })
      .then(function (result) {
        if (!result.ok) {
          var msg = (result.data && result.data.error) || 'Something went wrong sending the report.';
          if (result.data && result.data.detail) msg += ' (' + result.data.detail + ')';
          throw new Error(msg);
        }
        successDetail.textContent = 'Sent to ' + payload.clientEmail + ' for the ' + payload.sessionDate + ' session.';
        wizardCard.classList.add('hidden');
        successBox.classList.remove('hidden');
      })
      .catch(function (err) {
        showError(err.message || 'Something went wrong sending the report. Please try again.');
      })
      .finally(function () {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Send Report to Client';
      });
  });

  document.getElementById('report-reset').addEventListener('click', function () {
    state.step = 0;
    state.client = { clientName: '', clientEmail: '', ccEmail: '', sessionDate: todayIso() };
    state.finalSummary = '';
    DOMAINS.forEach(function (d) {
      state.domainData[d.key] = { classification: '', otherText: '', behaviours: [], avoiding: [], seeking: [], notes: '', extra: '' };
    });
    clearError();
    successBox.classList.add('hidden');
    wizardCard.classList.remove('hidden');
    render();
  });

  state.client.sessionDate = todayIso();
  render();
})();
