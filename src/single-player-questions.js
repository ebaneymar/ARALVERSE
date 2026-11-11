/* Shared offline question tools for Adventure and Pakainin ang mga Alaga. */
(() => {
  'use strict';
  const mode = document.documentElement.dataset.avMode || 'pve';
  const storage = window.ARAL_STORAGE;
  const parentWindow = window.parent;
  const editor = () => parentWindow.AVQuestionEditor1551;
  const STORE = 'avSinglePlayerQuestionSources1582';
  const controls = new Set(), listeners = new Set();
  let importOwner = false;
  const selection = () => editor()?.currentSelection() || window.MQCurriculum.loadSelection();
  const key = () => { const s = selection(); return [mode, s.term, s.subject, s.topic].join('|'); };
  function source() {
    try { return JSON.parse(storage.getItem(STORE) || '{}')[key()] === 'edited' ? 'edited' : 'builtin'; }
    catch (_) { return 'builtin'; }
  }
  function count() { try { return editor()?.editedRows(selection()).length || 0; } catch (_) { return 0; } }
  function notify() {
    for (const row of controls) {
      row.select.value = source();
      row.help.textContent = source() === 'edited'
        ? `${count()} imported / edited questions for this lesson.`
        : 'Built-in lesson questions. Import an Excel or CSV file to use your own.';
      row.help.dataset.error = String(source() === 'edited' && !count());
    }
    for (const fn of listeners) { try { fn(); } catch (error) { console.warn(error); } }
  }
  function message(text) {
    for (const row of controls) { row.help.textContent = text; row.help.dataset.error = 'true'; }
  }
  function setSource(value) {
    try {
      const data = JSON.parse(storage.getItem(STORE) || '{}');
      data[key()] = value === 'edited' ? 'edited' : 'builtin';
      const text = JSON.stringify(data); storage.setItem(STORE, text);
      if (storage.getItem(STORE) !== text) throw Error('Question source could not be saved.');
      parentWindow.mathAPangDesktop?.saveNow?.().catch(() => {});
      notify(); return true;
    } catch (error) { message(error.message); return false; }
  }
  function ready() {
    if (source() === 'edited' && !count()) {
      message('Import or add at least one question for the selected lesson, or choose Built-in Questions.');
      return false;
    }
    return true;
  }
  function next(original) {
    if (!ready()) throw Error('No imported / edited questions for this lesson.');
    const api = editor();
    if (!api) { if (source() === 'edited') throw Error('Open this game from ARALVERSE to import questions.'); return original(); }
    return api.nextQuestion(original, window, { source: source() });
  }
  function open(importFile = false) {
    const api = editor();
    if (!api) { message('Open this game from ARALVERSE to manage questions.'); return; }
    api.open();
    const dialog = parentWindow.document.getElementById('avqeDialog');
    if (!dialog?.open) return;
    importOwner = true;
    if (importFile) parentWindow.document.getElementById('avqeImport')?.click();
  }
  const css = document.createElement('style');
  css.textContent = '.av-sp-questions1582{padding:13px 15px;margin:12px 0;background:#fffdf6;border:1px solid #b9d7cb;border-radius:15px;text-align:left;color:#234b47}.av-sp-questions1582 label{display:block;font-size:14px;font-weight:800;margin:0 0 6px}.av-sp-questions1582 .av-sp-tools{display:flex;gap:8px;flex-wrap:wrap;align-items:center}.av-sp-questions1582 select,.av-sp-questions1582 button{min-height:42px;font:inherit;font-size:14px;padding:8px 12px;border:1px solid #8db8ac;border-radius:9px;color:#174c45;background:white;cursor:pointer}.av-sp-questions1582 select{flex:1;min-width:180px}.av-sp-questions1582 button{font-weight:800;background:#e3f5ed}.av-sp-questions1582 p{font-size:12px;line-height:1.4;margin:7px 0 0;color:#4c6962}.av-sp-questions1582 p[data-error=true]{color:#a03725}';
  document.head.append(css);
  function bind(host) {
    if (!host || host.querySelector('.av-sp-questions1582')) return;
    const box = document.createElement('section'); box.className = 'av-sp-questions1582';
    const label = document.createElement('label'); label.textContent = 'MGA TANONG / QUESTIONS';
    const tools = document.createElement('div'); tools.className = 'av-sp-tools';
    const select = document.createElement('select'); select.id = 'av-sp-source-' + controls.size; label.htmlFor = select.id; select.setAttribute('aria-label', 'Single-player question source');
    for (const [value, text] of [['builtin', 'Use Built-in Questions'], ['edited', 'Use Imported / Edited Questions']]) {
      const option = document.createElement('option'); option.value = value; option.textContent = text; select.append(option);
    }
    select.onchange = () => setSource(select.value);
    const button = document.createElement('button'); button.type = 'button'; button.dataset.spImport = ''; button.textContent = 'IMPORT QUESTIONS'; button.onclick = () => open(true);
    const manage = document.createElement('button'); manage.type = 'button'; manage.textContent = 'QUESTION EDITOR'; manage.onclick = () => open(false);
    const help = document.createElement('p'); help.setAttribute('role', 'status'); help.setAttribute('aria-live', 'polite');
    tools.append(select, button, manage); box.append(label, tools, help); host.append(box);
    controls.add({ select, help }); notify();
  }
  function changed() { notify(); }
  function imported(event) {
    if (importOwner && event.detail?.added > 0 && count()) setSource('edited');
    notify();
  }
  parentWindow.addEventListener('avquestionschanged1582', changed);
  parentWindow.addEventListener('avquestionsimported1582', imported);
  window.addEventListener('pagehide', () => {
    parentWindow.removeEventListener('avquestionschanged1582', changed);
    parentWindow.removeEventListener('avquestionsimported1582', imported);
  }, { once: true });
  const api = { source, setSource, selection, count, ready, next, bind, open, refresh: notify,
    onChange(fn) { listeners.add(fn); return () => listeners.delete(fn); },
    isActiveEdited() {
      return source() === 'edited' && (mode === 'petFeeding'
        ? !!window.AVPetFeeding1582?.isRunning()
        : !!document.getElementById('game')?.classList.contains('active'));
    },
  };
  window.AVSinglePlayerQuestions1582 = api;
  if (mode !== 'pve') return;
  const originalGenerate = window.MQCurriculum.generate.bind(window.MQCurriculum);
  window.MQCurriculum.generate = () => next(originalGenerate);
  for (const name of ['chooseBuddy', 'startBattle']) {
    const original = window[name];
    if (typeof original === 'function') window[name] = function () { if (ready()) return original.apply(this, arguments); };
  }
  let pausedByEditor = false, refreshQuestion = false;
  window.AVQECanOpen1582 = () => !document.getElementById('game')?.classList.contains('active') || !locked;
  window.AVQEBeginEdit1551 = () => {
    if (document.getElementById('game')?.classList.contains('active') && !locked && !paused) {
      togglePause(); pausedByEditor = true; return true;
    }
    return false;
  };
  window.AVQEEndEdit1551 = () => {
    importOwner = false;
    if (pausedByEditor && paused) togglePause();
    pausedByEditor = false;
    if (refreshQuestion && !paused && !locked && ready()) { refreshQuestion = false; nextQuestion(); }
  };
  window.AVQERefresh1551 = () => { notify(); refreshQuestion = true; };
  for (const id of ['home', 'buddySelect']) bind(document.querySelector('#' + id + ' .panel'));
})();
