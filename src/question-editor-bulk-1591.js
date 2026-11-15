/* Inserted inside the existing Question Editor closure by the update builder. */
(() => {
  'use strict';
  function deleteQuestions(lesson, ids) {
    if (!validLesson(lesson)) throw Error('Choose a lesson before deleting questions.');
    if (!Array.isArray(ids) || ids.some(id => typeof id !== 'string')) throw Error('Select the questions to delete.');
    const removing = new Set(ids);
    if (!removing.size) return { deleted: 0 };
    // One mutation checks the complete batch and the running game's pool before
    // one save. A failed check never leaves a partly deleted question set.
    mutate(lesson, state => {
      const manual = state.manual || [];
      const available = new Set(manual.map(row => row.id));
      if ([...removing].some(id => !available.has(id))) {
        throw Error('Only imported / added questions can be deleted. The list may have changed; select the questions again.');
      }
      state.manual = manual.filter(row => !removing.has(row.id));
    });
    const key = keyOf(lesson);
    pending.set(key, (pending.get(key) || []).filter(id => !removing.has(id)));
    return { deleted: removing.size };
  }
  api.deleteQuestions = deleteQuestions;

  const style = document.createElement('style');
  style.id = 'avqe-bulk-style1591';
  style.textContent = `
    html body #avqeDialog .avqe-bulk{position:sticky!important;top:0!important;z-index:3!important;padding:14px!important;margin:12px 0!important;border:1px solid #94c9bf!important;border-radius:12px!important;background:#edf9f4!important;box-shadow:0 3px 8px #164f4518!important;}
    html body #avqeDialog .avqe-bulk-head,html body #avqeDialog .avqe-bulk-buttons{display:flex!important;align-items:center!important;flex-wrap:wrap!important;gap:10px!important;}
    html body #avqeDialog .avqe-bulk-buttons{margin-top:10px!important;}
    html body #avqeDialog .avqe-bulk p{margin:8px 0 0!important;font-size:13px!important;line-height:1.45!important;color:#365d54!important;}
    html body #avqeDialog .avqe-select-question{display:inline-flex!important;align-items:center!important;gap:8px!important;width:auto!important;margin:0!important;padding:6px!important;color:#164f45!important;font-size:14px!important;font-weight:700!important;cursor:pointer!important;}
    html body #avqeDialog .avqe-select-question input[type=checkbox]{display:inline-block!important;appearance:auto!important;width:22px!important;height:22px!important;min-width:22px!important;min-height:22px!important;max-width:22px!important;padding:0!important;margin:0!important;accent-color:#087f68!important;cursor:pointer!important;}
    html body #avqeDialog .avqe-select-question input:focus-visible{outline:3px solid #e7a52c!important;outline-offset:3px!important;}
    html body #avqeDialog .avqe-bulk-count{font-size:14px!important;font-weight:700!important;color:#164f45!important;}
    html body #avqeDialog .avqe-item[data-avqe-selected=true]{border-color:#168c70!important;box-shadow:0 0 0 2px #168c7040!important;}
  `;
  document.head.append(style);
  const bulk = document.createElement('section');
  bulk.className = 'avqe-bulk';
  bulk.setAttribute('aria-label', 'Delete imported or added questions');
  bulk.innerHTML = '<div class="avqe-bulk-head"><label class="avqe-select-question"><input type="checkbox" id="avqeSelectAll"><span id="avqeSelectAllLabel">Select all</span></label><span id="avqeBulkCount" class="avqe-bulk-count" role="status" aria-live="polite"></span></div><div class="avqe-bulk-buttons"><button type="button" id="avqeDeleteSelected" class="avqe-danger" disabled>DELETE SELECTED (0)</button><button type="button" id="avqeDeleteAll" class="avqe-danger" disabled>DELETE ALL (0)</button></div><p>Only imported / teacher-added questions in this lesson are deleted. Built-in questions and other lessons stay.</p>';
  $('avqeList').before(bulk);

  const chosen = new Set();
  let scope = '', added = new Map(), matching = new Set();
  const originalRender = renderList;
  function readScope() {
    const search = normalize($('avqeSearch').value);
    const nextScope = keyOf(selected) + '\n' + search;
    if (scope !== nextScope) chosen.clear();
    scope = nextScope;
    added = new Map(allRows(selected).filter(row => row.kind === 'manual').map(row => [row.id, row]));
    matching = new Set([...added.values()].filter(row => !search || normalize([row.data.prompt, row.data.context, ...row.data.choices].join(' ')).includes(search)).map(row => row.id));
    for (const id of chosen) if (!matching.has(id)) chosen.delete(id);
  }
  function updateControls() {
    const selectAll = $('avqeSelectAll');
    selectAll.disabled = !matching.size;
    selectAll.checked = !!matching.size && chosen.size === matching.size;
    selectAll.indeterminate = chosen.size > 0 && chosen.size < matching.size;
    $('avqeSelectAllLabel').textContent = normalize($('avqeSearch').value) ? 'Select all matching' : 'Select all';
    $('avqeBulkCount').textContent = `${chosen.size} selected · ${added.size} imported / added in this lesson`;
    $('avqeDeleteSelected').disabled = !chosen.size;
    $('avqeDeleteSelected').textContent = `DELETE SELECTED (${chosen.size})`;
    $('avqeDeleteAll').disabled = !added.size;
    $('avqeDeleteAll').textContent = `DELETE ALL (${added.size})`;
  }
  function decorate() {
    for (const card of $('avqeList').querySelectorAll('.avqe-item[data-id]')) {
      const row = added.get(card.dataset.id);
      if (!row) continue;
      let checkbox = card.querySelector('[data-avqe-bulk-id]');
      if (!checkbox) {
        const label = document.createElement('label');
        label.className = 'avqe-select-question';
        checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.dataset.avqeBulkId = row.id;
        checkbox.setAttribute('aria-label', 'Select question: ' + row.data.prompt.slice(0, 120));
        const text = document.createElement('span'); text.textContent = 'Select';
        label.append(checkbox, text);
        card.querySelector('.avqe-badges').prepend(label);
      }
      checkbox.checked = chosen.has(row.id);
      card.dataset.avqeSelected = String(checkbox.checked);
    }
    updateControls();
  }
  renderList = function (...args) {
    try { readScope(); }
    catch (_) { added.clear(); matching.clear(); chosen.clear(); }
    originalRender.apply(this, args);
    decorate();
  };
  // The existing list loads 50 rows at a time. Selection covers every match,
  // including rows not yet drawn, and decorations follow newly loaded rows.
  new MutationObserver(decorate).observe($('avqeList'), { childList: true, subtree: true });
  $('avqeList').addEventListener('change', event => {
    const checkbox = event.target.closest('[data-avqe-bulk-id]');
    if (!checkbox || !matching.has(checkbox.dataset.avqeBulkId)) return;
    if (checkbox.checked) chosen.add(checkbox.dataset.avqeBulkId);
    else chosen.delete(checkbox.dataset.avqeBulkId);
    decorate();
  });
  $('avqeSelectAll').onchange = event => {
    chosen.clear();
    if (event.target.checked) for (const id of matching) chosen.add(id);
    decorate();
  };
  function remove(all) {
    const ids = all ? [...added.keys()] : [...chosen];
    if (!ids.length) return;
    const lesson = { ...selected };
    const message = `Delete ${all ? 'all ' : ''}${ids.length} imported / added question${ids.length === 1 ? '' : 's'} from this lesson?\n\n${lessonTitle(lesson)}\n\nBuilt-in questions and other lessons will stay. This cannot be undone.`;
    if (!window.confirm(message)) return;
    try {
      const result = deleteQuestions(lesson, ids);
      chosen.clear(); renderList();
      status(`${result.deleted} imported / added question${result.deleted === 1 ? '' : 's'} deleted. You can import a new question file for this lesson.`);
    } catch (error) { renderList(); status(error.message, true); }
  }
  $('avqeDeleteSelected').onclick = () => remove(false);
  $('avqeDeleteAll').onclick = () => remove(true);
  dialog.addEventListener('close', () => { chosen.clear(); decorate(); });
})();
