/* Pakainin ang mga Alaga — a calm, reusable single-player learning activity. */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const questions = window.AVSinglePlayerQuestions1582;
  const store = window.ARAL_STORAGE;
  const PREFS = 'avPetFeedingPreferencesV1', CHARACTERS = 'avPetFeedingCharactersV1';
  const pets = { puppy: { name: 'Tuta', x: 0 }, owl: { name: 'Kuwago', x: 50 }, carabao: { name: 'Kalabaw', x: 100 } };
  const nina = { id: 'nina', name: 'Nina', image: 'assets/nina-back-1582.webp' };
  const read = (key, fallback) => { try { return JSON.parse(store.getItem(key)) || fallback; } catch (_) { return fallback; } };
  const loadedCharacters = read(CHARACTERS, []);
  let custom = (Array.isArray(loadedCharacters) ? loadedCharacters : []).filter(x => x && typeof x.id === 'string' && typeof x.name === 'string' && /^data:image\/(?:webp|png|jpeg);base64,/.test(x.image || '')).slice(0,30);
  const saved = read(PREFS, {});
  let pet = pets[saved.pet] ? saved.pet : 'puppy', heroId = saved.heroId || 'nina', sound = saved.sound !== false;
  let phase = 'setup', energy = 100, hunger = 100, feeds = 0, attempts = 0, correct = 0, question = null;
  let feedbackCorrect = false, refreshOnClose = false, pending = null, imageToken = 0, audio = null;
  const pauses = new Set();
  const hero = () => [nina, ...custom].find(x => x.id === heroId) || nina;
  function savePreferences() {
    try {
      store.setItem(PREFS, JSON.stringify({ pet, heroId, sound, activity: $('petActivityName').value.slice(0,70) }));
      window.parent.mathAPangDesktop?.saveNow?.().catch(() => {});
    } catch (_) { $('petSetupStatus').textContent = 'Hindi na-save ang pagpili. Maaari mo pa ring ituloy ang gawain.'; }
  }
  function updateHeroes() {
    const select = $('petHeroSelect'); select.replaceChildren();
    for (const entry of [nina, ...custom]) { const option = document.createElement('option'); option.value = entry.id; option.textContent = entry.name; select.append(option); }
    if (![nina, ...custom].some(x => x.id === heroId)) heroId = 'nina';
    select.value = heroId;
    $('petHeroPreview').src = hero().image;
    $('petHeroPreview').alt = hero().name === 'Nina' ? 'Nina sa dilaw na damit, tanaw mula sa likod' : 'Tauhang ' + hero().name;
  }
  function updatePetButtons() {
    for (const button of document.querySelectorAll('[data-pet]')) button.setAttribute('aria-pressed', String(button.dataset.pet === pet));
  }
  function meters() {
    $('petEnergyLabel').textContent = 'Lakas ni ' + hero().name;
    $('petEnergyText').textContent = `${energy} / 100`;
    $('petHungerText').textContent = hunger ? `${hunger} / 100` : '0 — BUSOG!';
    $('petEnergyFill').style.width = energy + '%';
    $('petHungerFill').style.width = hunger + '%';
    $('petEnergyMeter').setAttribute('aria-valuenow', String(energy));
    $('petHungerMeter').setAttribute('aria-valuenow', String(hunger));
    $('petGrowth').style.setProperty('--pet-scale', String(.58 + feeds * .1));
    $('petSummary').textContent = `Pagpapakain: ${feeds} / 5 · Tamang sagot: ${correct} · Pagsubok: ${attempts}`;
  }
  function controls() {
    document.body.dataset.phase = phase;
    document.body.classList.toggle('paused', pauses.size > 0);
    $('petPauseBanner').hidden = !pauses.size;
    $('petPause').textContent = pauses.has('manual') ? '▶ MAGPATULOY' : '⏸ PAHINGA';
    for (const button of $('petAnswers').querySelectorAll('button')) button.disabled = phase !== 'question' || pauses.size > 0;
    $('petNext').disabled = pauses.size > 0;
    $('petRest').disabled = pauses.size > 0;
    $('petQuestions').disabled = phase === 'feeding';
    $('petHome').disabled = phase === 'feeding';
    $('petSound').textContent = sound ? '🔊 TUNOG' : '🔇 TUNOG';
    $('petSound').setAttribute('aria-pressed', String(sound));
  }
  function arm() {
    if (!pending || pauses.size || pending.id) return;
    pending.started = performance.now();
    pending.id = setTimeout(() => { const action = pending; pending = null; action.fn(); }, pending.remaining);
  }
  function after(ms, fn) { cancelAction(); pending = { fn, remaining: ms, started: performance.now(), id: null }; arm(); }
  function cancelAction() { if (pending?.id) clearTimeout(pending.id); pending = null; }
  function pause(reason) {
    if (!pauses.size && pending?.id) { clearTimeout(pending.id); pending.remaining = Math.max(0, pending.remaining - (performance.now() - pending.started)); pending.id = null; }
    pauses.add(reason); controls();
  }
  function resume(reason) { pauses.delete(reason); controls(); arm(); }
  function cue(kind) {
    if (!sound || pauses.size) return;
    try {
      audio ||= new (window.AudioContext || window.webkitAudioContext)(); audio.resume().catch(() => {});
      const notes = kind === 'rumble' ? [90, 76] : kind === 'complete' ? [523, 659, 784, 1047] : [523, 659, 784];
      notes.forEach((frequency, index) => {
        const oscillator = audio.createOscillator(), gain = audio.createGain(), time = audio.currentTime + index * .12;
        oscillator.type = 'sine'; oscillator.frequency.value = frequency;
        gain.gain.setValueAtTime(0, time); gain.gain.linearRampToValueAtTime(kind === 'rumble' ? .045 : .035, time + .025); gain.gain.exponentialRampToValueAtTime(.001, time + .18);
        oscillator.connect(gain).connect(audio.destination); oscillator.start(time); oscillator.stop(time + .2);
      });
    } catch (_) { /* The activity remains usable without an audio device. */ }
  }
  function scene(happy = false) {
    $('petHeroImage').src = hero().image;
    $('petHeroImage').alt = hero().id === 'nina' ? 'Nina sa dilaw na damit, tanaw mula sa likod' : hero().name;
    $('petAnimalSprite').style.setProperty('--pet-x', pets[pet].x + '%');
    $('petAnimalSprite').style.setProperty('--pet-y', happy ? '100%' : '0%');
    $('petAnimalSprite').setAttribute('aria-label', (happy ? 'Masayang ' : 'Gutom na ') + pets[pet].name.toLowerCase());
  }
  function showQuestion(fresh = true) {
    if (!questions.ready()) { $('petFeedback').textContent = 'Mag-import muna ng mga tanong para sa napiling aralin, o gumamit ng Built-in Questions.'; $('petAnswers').replaceChildren(); phase = 'blocked'; controls(); return; }
    try {
      if (fresh || !question) question = questions.next(() => window.MQCurriculum.generate());
      const answer = String(question.answer), choices = [...new Set((question.choices || []).map(String))];
      if (!choices.includes(answer) || choices.length < 2) throw Error('Kailangang may tamang sagot at hindi bababa sa dalawang pagpipilian.');
      const visible = [answer, ...choices.filter(x => x !== answer).slice(0,2)];
      for (let i = visible.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [visible[i], visible[j]] = [visible[j], visible[i]]; }
      $('petQuestion').textContent = question.prompt;
      $('petQuestionVisual').innerHTML = question.display || '';
      $('petAnswers').replaceChildren();
      for (let i = 0; i < visible.length; i++) {
        const button = document.createElement('button'); button.type = 'button'; button.className = 'answer'; button.dataset.choice = visible[i];
        button.textContent = `${'ABC'[i]}. ${visible[i]}`; button.onclick = () => answerQuestion(button, visible[i]); $('petAnswers').append(button);
      }
      phase = 'question'; feedbackCorrect = false;
      $('petNext').hidden = true; $('petRest').hidden = true; $('petComplete').hidden = true; $('petQuestionArea').hidden = false;
      $('petFeedback').textContent = 'Piliin ang tamang sagot. May oras kang mag-isip.';
      $('petThought').textContent = 'Gutom pa!';
      $('petAnimalActor').classList.remove('happy', 'growing', 'rumble'); $('petHeroActor').classList.remove('feeding'); $('petFoodToken').classList.remove('toss');
      scene(false); controls();
    } catch (error) { phase = 'blocked'; $('petFeedback').textContent = error.message; $('petAnswers').replaceChildren(); controls(); }
  }
  function start() {
    if (!questions.ready()) { $('petSetupStatus').textContent = 'Mag-import muna ng mga tanong, o piliin ang Built-in Questions.'; return; }
    cancelAction(); pauses.clear(); energy = 100; hunger = 100; feeds = 0; attempts = 0; correct = 0; question = null;
    $('petSetupStatus').textContent = ''; savePreferences();
    $('petSetup').classList.remove('active'); $('petGame').classList.add('active');
    $('petActivityLabel').textContent = $('petActivityName').value.trim() || 'Ating Gawain';
    meters(); showQuestion(true);
  }
  function answerQuestion(button, choice) {
    if (phase !== 'question' || pauses.size) return;
    attempts++;
    if (choice === String(question.answer)) {
      phase = 'feeding'; feedbackCorrect = true;
      button.classList.add('correct');
      $('petFeedback').textContent = `Tama! Nagbibigay si ${hero().name} ng pagkain at pag-aalaga.`;
      $('petThought').textContent = 'Salamat!';
      $('petHeroActor').classList.add('feeding'); $('petFoodToken').classList.remove('toss'); void $('petFoodToken').offsetWidth; $('petFoodToken').classList.add('toss');
      cue('correct'); controls();
      after(900, () => {
        feeds++; correct++; hunger = Math.max(0, hunger - 20); meters(); scene(true);
        $('petAnimalActor').classList.remove('rumble'); $('petAnimalActor').classList.add('happy', 'growing'); $('petHeroActor').classList.remove('feeding');
        if (!hunger) {
          phase = 'complete'; $('petThought').textContent = 'Busog na!'; $('petQuestionArea').hidden = true; $('petComplete').hidden = false;
          $('petCompleteText').textContent = `Salamat sa pag-aalaga! Lumaki at nabusog ang ${pets[pet].name.toLowerCase()}. ${correct} tamang sagot sa ${attempts} pagsubok.`; cue('complete');
        } else {
          phase = 'feedback'; $('petThought').textContent = 'Ang sarap!';
          $('petFeedback').textContent = 'Magaling! Mas lumaki ang alaga. ' + (question.explanation || '');
          $('petNext').textContent = 'SUSUNOD NA TANONG →'; $('petNext').hidden = false;
        }
        controls();
      });
    } else {
      energy = Math.max(0, energy - 10); phase = energy ? 'feedback' : 'rest'; feedbackCorrect = false;
      button.classList.add('incorrect');
      for (const option of $('petAnswers').querySelectorAll('button')) if (option.dataset.choice === String(question.answer)) option.classList.add('correct');
      $('petThought').textContent = 'Gutom pa!'; $('petAnimalActor').classList.add('rumble'); cue('rumble');
      $('petFeedback').textContent = `Ang tamang sagot ay ${question.answer}. ${question.explanation || ''} ${energy ? 'Subukan nating muli.' : 'Pahinga muna ang tauhan. Maaari tayong magpatuloy pagkatapos.'}`;
      $('petNext').textContent = 'SUBUKAN MULI'; $('petNext').hidden = !energy; $('petRest').hidden = !!energy;
      meters(); controls();
    }
  }
  function back() {
    cancelAction(); pauses.clear(); phase = 'setup'; $('petGame').classList.remove('active'); $('petSetup').classList.add('active'); controls(); questions.refresh();
  }
  for (const button of document.querySelectorAll('[data-pet]')) button.onclick = () => { pet = button.dataset.pet; updatePetButtons(); savePreferences(); };
  $('petHeroSelect').onchange = () => { heroId = $('petHeroSelect').value; updateHeroes(); savePreferences(); };
  $('petActivityName').value = typeof saved.activity === 'string' ? saved.activity.slice(0,70) : '';
  $('petActivityName').onchange = savePreferences;
  $('petStart').onclick = start; $('petAgain').onclick = start; $('petHome').onclick = back;
  $('petNext').onclick = () => { if (!pauses.size && phase === 'feedback') showQuestion(feedbackCorrect); };
  $('petRest').onclick = () => { if (!pauses.size && phase === 'rest') { energy = 100; meters(); showQuestion(false); } };
  $('petPause').onclick = () => pauses.has('manual') ? resume('manual') : pause('manual');
  $('petSound').onclick = () => { sound = !sound; savePreferences(); controls(); };
  $('petFull').onclick = async () => { try { if (document.fullscreenElement) await document.exitFullscreen(); else await $('fullscreen-wrapper').requestFullscreen(); } catch (_) {} };
  $('petQuestions').onclick = () => questions.open(false);
  $('petFoodToken').innerHTML = '<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M24 42S3 29 3 15C3 3 19 1 24 11 29 1 45 3 45 15 45 29 24 42 24 42Z" fill="#ed7f85" stroke="#fff3e3" stroke-width="3"/></svg>';
  $('petAddCharacter').onclick = () => { $('petCharacterForm').reset(); $('petCharacterStatus').textContent = ''; $('petCharacterDialog').showModal(); $('petCharacterName').focus(); };
  $('petCharacterCancel').onclick = () => { imageToken++; $('petCharacterDialog').close(); };
  $('petCharacterDialog').addEventListener('cancel', () => { imageToken++; });
  $('petCharacterForm').onsubmit = async event => {
    event.preventDefault();
    const file = $('petCharacterFile').files[0], name = $('petCharacterName').value.trim();
    if (!file || !name) return;
    if (!['image/png','image/jpeg','image/webp','image/gif'].includes(file.type) || file.size > 8 * 1024 * 1024) { $('petCharacterStatus').textContent = 'Gumamit ng PNG, JPG, o WEBP na hindi lalampas sa 8 MB.'; return; }
    if (custom.length >= 30) { $('petCharacterStatus').textContent = 'May 30 na dagdag na tauhan na sa device na ito.'; return; }
    const token = ++imageToken, url = URL.createObjectURL(file); $('petCharacterSave').disabled = true;
    try {
      const image = new Image(); image.src = url; await image.decode();
      if (token !== imageToken || !$('petCharacterDialog').open) return;
      const ratio = Math.min(1, 640 / Math.max(image.naturalWidth, image.naturalHeight));
      const canvas = document.createElement('canvas'); canvas.width = Math.max(1, Math.round(image.naturalWidth * ratio)); canvas.height = Math.max(1, Math.round(image.naturalHeight * ratio));
      canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height);
      const entry = { id: 'hero:' + (crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36)), name: name.slice(0,30), image: canvas.toDataURL('image/webp', .88) };
      const next = [...custom, entry], text = JSON.stringify(next); store.setItem(CHARACTERS, text);
      if (store.getItem(CHARACTERS) !== text) throw Error('Hindi na-save ang tauhan. Subukan ang mas maliit na larawan.');
      custom = next; heroId = entry.id; updateHeroes(); savePreferences(); $('petCharacterDialog').close();
    } catch (error) { $('petCharacterStatus').textContent = error.message || 'Hindi mabasa ang larawan.'; }
    finally { URL.revokeObjectURL(url); $('petCharacterSave').disabled = false; }
  };
  window.AVQECanOpen1582 = () => phase !== 'feeding';
  window.AVQEBeginEdit1551 = () => { pause('questions'); return true; };
  window.AVQEEndEdit1551 = () => {
    resume('questions'); questions.refresh();
    if (refreshOnClose && phase === 'question') { refreshOnClose = false; showQuestion(true); }
  };
  window.AVQERefresh1551 = () => { refreshOnClose = true; questions.refresh(); };
  window.AVLayoutSession1580 = { begin() { pause('layout'); }, end() { resume('layout'); } };
  window.togglePause = () => pauses.has('manual') ? resume('manual') : pause('manual');
  window.AVPetFeeding1582 = Object.freeze({
    isRunning: () => !['setup','complete'].includes(phase),
    getState: () => ({ phase, energy, hunger, feeds, attempts, correct, pet, heroId, paused: pauses.size > 0 }),
  });
  questions.onChange(() => {
    $('petLessonLabel').textContent = window.MQCurriculum.statusText();
    if (questions.source() === 'builtin' || questions.count()) $('petSetupStatus').textContent = '';
    if (phase === 'question' && pauses.has('questions')) refreshOnClose = true;
  });
  questions.bind($('petQuestionTools'));
  document.addEventListener('visibilitychange', () => document.hidden ? pause('hidden') : resume('hidden'));
  window.addEventListener('pagehide', () => { cancelAction(); imageToken++; audio?.close().catch(() => {}); }, { once: true });
  document.addEventListener('keydown', event => {
    if (event.ctrlKey || event.metaKey || event.altKey || $('petCharacterDialog').open || /^(INPUT|TEXTAREA|SELECT|BUTTON)$/.test(event.target?.tagName || '')) return;
    const index = { ArrowLeft:0, ArrowUp:1, ArrowRight:2, a:0, b:1, c:2, '1':0, '2':1, '3':2 }[event.key];
    if (index !== undefined && phase === 'question' && !pauses.size) { event.preventDefault(); $('petAnswers').children[index]?.click(); }
    if (event.code === 'Space' && phase !== 'setup') { event.preventDefault(); window.togglePause(); }
  });
  updateHeroes(); updatePetButtons(); meters(); scene(false); controls(); questions.refresh();
})();
