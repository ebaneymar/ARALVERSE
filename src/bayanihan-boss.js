(() => {
  'use strict';
  const byId = id => document.getElementById(id);
  const questions = window.AVSinglePlayerQuestions1582;
  const damagePerPupil = 10;
  const sizeKey = 'avBayanihanClassSize';
  const sizeField = byId('classSize');
  const countField = byId('correctCount');
  let battle = null;
  let layoutOpen = false;

  function suggestedSize() {
    try {
      const saved = Number(window.ARAL_STORAGE.getItem(sizeKey));
      if (Number.isSafeInteger(saved) && saved > 0) return saved;
      for (const key of ['mathquest_html_roster_v3','mathquest_tournament_roster_v2','mathquest_tournament_roster_v3','mqExtra']) {
        const roster = JSON.parse(window.ARAL_STORAGE.getItem(key) || '[]');
        if (Array.isArray(roster) && roster.length) {
          const ids = new Set(roster.filter(player => player && player.id != null).map(player => String(player.id)));
          if (ids.size) return ids.size;
        }
      }
    } catch (_) { /* The teacher can enter attendance when storage is unavailable. */ }
    return '';
  }

  function show(screen) {
    document.querySelectorAll('.screen').forEach(element => {
      element.hidden = element.id !== screen;
      element.classList.toggle('active', element.id === screen);
    });
  }

  function readQuestion() {
    const question = questions.next(() => window.MQCurriculum.generate());
    const choices = [...new Set(question.choices.map(String))];
    const key = choices.indexOf(String(question.answer));
    if (choices.length < 2 || key < 0) throw Error('Walang kumpletong pagpipilian para sa tanong na ito.');
    return {question, choices, key};
  }

  function paintHealth() {
    byId('bossHp').max = battle.maxHp;
    byId('bossHp').value = battle.hp;
    byId('hpText').textContent = battle.hp + ' / ' + battle.maxHp + ' HP';
  }

  function renderRound(card) {
    battle.card = card;
    battle.round++;
    battle.phase = 'question';
    const {question, choices} = card;
    byId('roundLabel').textContent = 'Tanong ' + battle.round + ' · ' + battle.size + ' mag-aaral';
    byId('questionPrompt').textContent = question.prompt;
    const visual = byId('equation');
    if (question.avQETeacher || questions.source() === 'edited') {
      visual.textContent = question.display || '';
    } else {
      // Built-in curriculum visuals include number arrays and directional maps.
      visual.innerHTML = question.display || '';
    }
    const tiles = choices.map((value, index) => {
      const tile = document.createElement('li');
      tile.className = 'answer';
      const letter = document.createElement('span');
      letter.className = 'letter';
      letter.textContent = String.fromCharCode(65 + index);
      const text = document.createElement('span');
      text.textContent = value;
      tile.append(letter, text);
      return tile;
    });
    byId('answers').replaceChildren(...tiles);
    byId('feedback').textContent = 'Itaas ang titik ng inyong sagot.';
    countField.value = '';
    countField.removeAttribute('aria-invalid');
    byId('damagePreview').textContent = '';
    byId('roundError').textContent = '';
    byId('tally').hidden = true;
    byId('next').hidden = true;
    byId('next').textContent = 'Susunod na tanong';
    byId('reveal').hidden = false;
    byId('bossSprite').classList.remove('boss-hit', 'boss-heavy');
    byId('questionPrompt').focus();
  }

  function start(event) {
    event.preventDefault();
    if (battle || layoutOpen) return;
    const size = sizeField.valueAsNumber;
    const maxHp = size * damagePerPupil * Number(byId('difficulty').value);
    if (!Number.isSafeInteger(size) || size < 1 || !Number.isSafeInteger(maxHp)) {
      byId('setupError').textContent = 'Ilagay ang bilang ng mga batang sasagot, mula sa isa pataas.';
      sizeField.focus();
      return;
    }
    if (!questions.ready()) return;
    questions.begin();
    let first;
    try { first = readQuestion(); }
    catch (error) { byId('setupError').textContent = error.message; return; }
    try { window.ARAL_STORAGE.setItem(sizeKey, String(size)); } catch (_) {}
    battle = {size, maxHp, hp: maxHp, round: 0, totalCorrect: 0, phase: 'question', card: null};
    countField.max = String(size);
    byId('countRange').textContent = 'sa ' + size;
    byId('setupError').textContent = '';
    show('game');
    paintHealth();
    renderRound(first);
  }

  function reveal() {
    if (layoutOpen || battle?.phase !== 'question') return;
    battle.phase = 'count';
    const {key, choices} = battle.card;
    const tile = byId('answers').children[key];
    tile.classList.add('is-key');
    const mark = document.createElement('span');
    mark.className = 'check';
    mark.setAttribute('aria-hidden', 'true');
    mark.textContent = '✓';
    tile.append(mark);
    byId('feedback').textContent = 'Tamang sagot — ' + String.fromCharCode(65 + key) + '. ' + choices[key];
    byId('reveal').hidden = true;
    byId('tally').hidden = false;
    countField.focus();
  }

  function countValue() {
    const count = countField.valueAsNumber;
    return Number.isInteger(count) && count >= 0 && count <= battle.size ? count : null;
  }

  function showPreview() {
    if (battle?.phase !== 'count') return;
    const count = countValue();
    byId('damagePreview').textContent = count === null ? '' : count + ' × ' + damagePerPupil + ' = ' + count * damagePerPupil + ' damage';
    countField.removeAttribute('aria-invalid');
    byId('roundError').textContent = '';
  }

  function applyAttack(event) {
    event.preventDefault();
    if (layoutOpen || battle?.phase !== 'count') return;
    const count = countValue();
    if (count === null) {
      byId('roundError').textContent = 'Maglagay ng buong bilang mula 0 hanggang ' + battle.size + '.';
      countField.setAttribute('aria-invalid', 'true');
      countField.focus();
      return;
    }
    battle.phase = 'scored';
    const damage = count * damagePerPupil;
    battle.hp = Math.max(0, battle.hp - damage);
    battle.totalCorrect += count;
    paintHealth();
    if (damage) byId('bossSprite').classList.add(count * 2 >= battle.size ? 'boss-heavy' : 'boss-hit');
    byId('feedback').textContent = count + ' sa ' + battle.size + ' ang tama · ' + damage + ' damage!';
    byId('roundError').textContent = '';
    byId('tally').hidden = true;
    byId('next').textContent = battle.hp === 0 ? 'Tingnan ang resulta' : 'Susunod na tanong';
    byId('next').hidden = false;
    byId('feedback').focus({preventScroll:true});
  }

  function advance() {
    if (layoutOpen || battle?.phase !== 'scored') return;
    if (battle.hp === 0) {
      battle.phase = 'finished';
      byId('summary').textContent = 'Nakakuha ang klase ng ' + battle.totalCorrect + ' tamang sagot sa ' + battle.round + ' tanong.';
      show('result');
      byId('resultTitle').focus();
      return;
    }
    try { renderRound(readQuestion()); }
    catch (error) { byId('roundError').textContent = error.message; }
  }

  sizeField.value = suggestedSize();
  byId('lesson').textContent = window.MQCurriculum.statusText();
  questions.bind(byId('questionTools'), 'Mga tanong para sa klase');
  byId('setupForm').addEventListener('submit', start);
  byId('reveal').addEventListener('click', reveal);
  countField.addEventListener('input', showPreview);
  byId('tally').addEventListener('submit', applyAttack);
  byId('next').addEventListener('click', advance);
  byId('again').addEventListener('click', () => {
    if (layoutOpen || battle?.phase !== 'finished') return;
    battle = null;
    show('setup');
    sizeField.focus();
  });
  window.AVLayoutSession1580 = {
    begin() { layoutOpen = true; },
    end() { layoutOpen = false; }
  };
})();
