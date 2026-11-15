/* Inserted inside the shared Question Editor closure by the update builder. */
(() => {
  'use strict';
  const orderedFrames = new WeakMap();
  const previousNext = nextQuestion;
  nextQuestion = function (original, win, options) {
    let data;
    try { data = readStore(); } catch (_) { return previousNext(original, win, options); }
    const selection = currentSelection();
    if ((options?.source || getSource(selection, data)) === 'builtin') return previousNext(original, win, options);
    const rows = editedRows(selection, data);
    if (!rows.length) throw Error('No edited questions for this lesson. Add or import questions, or choose Built-in Questions.');
    const key = keyOf(selection);
    // Only changes to this question pool restart its sequence. Saves in other
    // lessons, layouts and fonts must not change the next question.
    const signature = JSON.stringify(rows.map(row => [keyOf(row.lesson), row.id, row.data]));
    let sessions = orderedFrames.get(win);
    if (!sessions) { sessions = new Map(); orderedFrames.set(win, sessions); }
    let session = sessions.get(key);
    if (!session || session.signature !== signature) { session = { signature, index: 0 }; sessions.set(key, session); }
    const row = rows[session.index];
    session.index = (session.index + 1) % rows.length;
    for (const lesson of scopedLessons(selection)) pending.delete(keyOf(lesson));
    const lesson = row.lesson, meta = CURRICULUM.topics[lesson.subject][lesson.term].find(topic => topic.id === lesson.topic);
    win.AVCurrentLearningSubject = lesson.subject; win.AVGeneratedTopic155 = lesson.topic;
    win.AVCurrentCompetency155 = { ...lesson, label: meta.label, competency: meta.competency || '' };
    return issueRow(row, lesson);
  };
  api.nextQuestion = nextQuestion;
  api.resetQuestionOrder = win => { if (win) orderedFrames.delete(win); };

  function moveQuestion(lesson, id, direction) {
    if (!validLesson(lesson)) throw Error('Choose a lesson before moving questions.');
    if (direction !== -1 && direction !== 1) throw Error('Choose Up or Down to move a question.');
    const manual = lessonData(readStore(), lesson).manual || [];
    const index = manual.findIndex(row => row.id === id), next = index + direction;
    if (index < 0) throw Error('Only imported / added questions can be moved. Reopen the question list.');
    if (next < 0 || next >= manual.length) return { moved: false, position: index + 1 };
    mutate(lesson, state => {
      const current = state.manual.findIndex(row => row.id === id), target = current + direction;
      if (current < 0 || target < 0 || target >= state.manual.length) throw Error('The question list changed. Select the question again.');
      [state.manual[current], state.manual[target]] = [state.manual[target], state.manual[current]];
    });
    return { moved: true, position: next + 1 };
  }
  api.moveQuestion = moveQuestion;

  const style = document.createElement('style');
  style.id = 'avqe-order-style1592';
  style.textContent = 'html body #avqeDialog .avqe-order-controls{display:inline-flex!important;gap:6px!important;align-items:center!important}html body #avqeDialog .avqe-order-controls button{min-width:68px!important}html body #avqeDialog .avqe-order-note{margin:10px 0!important;padding:10px 12px!important;border-radius:8px!important;background:#e9f3fb!important;color:#234e62!important;font-size:14px!important;line-height:1.45!important}';
  document.head.append(style);
  const note = document.createElement('p'); note.className = 'avqe-order-note';
  $('avqeList').before(note);
  let positions = new Map(), count = 0;
  const previousRender = renderList;
  function decorateOrder() {
    const filtered = !!normalize($('avqeSearch').value);
    const message = 'Questions play from the top of the added/imported list. Excel / CSV row order is kept. Use ↑ UP / ↓ DOWN to rearrange them.' + (filtered ? ' Arrows change the full lesson order, including questions outside this search.' : '');
    if (note.textContent !== message) note.textContent = message;
    for (const card of $('avqeList').querySelectorAll('.avqe-item[data-id]')) {
      const index = positions.get(card.dataset.id);
      if (index === undefined) continue;
      let controls = card.querySelector('.avqe-order-controls');
      if (!controls) {
        controls = document.createElement('span'); controls.className = 'avqe-order-controls';
        for (const [direction, text] of [[-1, '↑ UP'], [1, '↓ DOWN']]) {
          const button = document.createElement('button'); button.type = 'button'; button.className = 'avqe-secondary';
          button.dataset.avqeMove = String(direction); button.textContent = text; controls.append(button);
        }
        card.querySelector('.avqe-actions').prepend(controls);
      }
      for (const button of controls.querySelectorAll('button')) {
        const direction = Number(button.dataset.avqeMove);
        button.disabled = direction < 0 ? index === 0 : index === count - 1;
        button.setAttribute('aria-label', `Move question ${index + 1} ${direction < 0 ? 'up' : 'down'}`);
      }
    }
  }
  renderList = function (...args) {
    try {
      const manual = lessonData(readStore(), selected).manual || [];
      count = manual.length; positions = new Map(manual.map((row, index) => [row.id, index]));
    } catch (_) { positions.clear(); count = 0; }
    previousRender.apply(this, args); decorateOrder();
  };
  new MutationObserver(decorateOrder).observe($('avqeList'), { childList: true, subtree: true });
  $('avqeList').addEventListener('click', event => {
    const button = event.target.closest('[data-avqe-move]');
    if (!button || button.disabled) return;
    const id = button.closest('.avqe-item').dataset.id, direction = Number(button.dataset.avqeMove), scroll = $('avqeBody').scrollTop;
    try {
      const result = moveQuestion({ ...selected }, id, direction);
      if (!result.moved) return;
      renderList();
      let card = [...$('avqeList').querySelectorAll('.avqe-item')].find(card => card.dataset.id === id);
      // Restore a moved card beyond the first 50 rows without losing its place.
      while (!card) {
        const more = [...$('avqeList').querySelectorAll('button')].find(button => button.textContent === 'SHOW MORE QUESTIONS');
        if (!more) break;
        more.click(); card = [...$('avqeList').querySelectorAll('.avqe-item')].find(card => card.dataset.id === id);
      }
      decorateOrder(); $('avqeBody').scrollTop = scroll;
      const target = card?.querySelector(`[data-avqe-move="${direction}"]:not(:disabled)`) || card?.querySelector('button:not(:disabled)');
      target?.focus({ preventScroll: true });
      if (target) {
        const r = target.getBoundingClientRect(), body = $('avqeBody').getBoundingClientRect(), bulkHeight = dialog.querySelector('.avqe-bulk')?.getBoundingClientRect().height || 0;
        if (r.top < body.top + bulkHeight + 10) $('avqeBody').scrollTop -= body.top + bulkHeight + 10 - r.top;
        else if (r.bottom > body.bottom - 10) $('avqeBody').scrollTop += r.bottom - body.bottom + 10;
      }
      status(`Saved. This is now question ${result.position} in the added/imported order.`);
    } catch (error) { renderList(); status(error.message, true); }
  });
  const frame = document.getElementById('gameFrame');
  frame?.addEventListener('load', () => {
    try {
      const win = frame.contentWindow, start = win.startTournament;
      api.resetQuestionOrder(win);
      if (typeof win.AVQERefreshSource1553 === 'function') {
        // Some older Tournament paths call genQ directly, bypassing the shared
        // curriculum wrapper. Route their edited pool through the same order.
        const generate = win.genQ;
        if (typeof generate === 'function') win.genQ = function () {
          return api.getSource() === 'edited' ? api.nextQuestion(() => generate.apply(this, arguments), win, { source: 'edited' }) : generate.apply(this, arguments);
        };
        const refresh = win.AVQERefreshSource1553;
        win.AVQERefreshSource1553 = function () {
          const result = refresh.apply(this, arguments);
          if (api.getSource() === 'edited') {
            const select = win.document.getElementById('avqeQuestionSourceSelect'), help = win.document.getElementById('avqeQuestionSourceHelp');
            if (select) select.title = select.title.replace('in random order', 'in saved list order');
            if (help) help.textContent = help.textContent.replace('in random order', 'in saved list order');
          }
          return result;
        };
        win.AVQERefreshSource1553();
      }
      if (typeof start === 'function') win.startTournament = function () { api.resetQuestionOrder(win); return start.apply(this, arguments); };
      win.document.getElementById('tStartTournament')?.addEventListener('click', () => api.resetQuestionOrder(win), true);
    } catch (_) {}
  });
})();
