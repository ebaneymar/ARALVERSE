/* Project the active game using its original, interactive question and answers. */
(() => {
  'use strict';
  const frame = document.getElementById('gameFrame');
  const bar = document.querySelector('#gameShell .launcher-bar');
  const key = 'avClassroomProjector1593';
  let enabled = window.ARAL_STORAGE.getItem(key) === 'on', expanded = false;
  let gameDocument = null, fullscreenControls = null;
  function makeControls(doc) {
    const group = doc.createElement('div'); group.className = 'av-projector-controls';
    const toggle = doc.createElement('button'); toggle.type = 'button';
    toggle.dataset.projectorToggle = ''; toggle.textContent = 'Pang-projector';
    toggle.onclick = () => {
      enabled = !enabled; expanded = false; paint();
      window.ARAL_STORAGE.setItem(key, enabled ? 'on' : 'off');
      window.mathAPangDesktop?.saveNow?.().catch(() => {});
    };
    const teacher = doc.createElement('button'); teacher.type = 'button';
    teacher.dataset.projectorTools = ''; teacher.textContent = 'Gamit ng guro';
    teacher.onclick = () => { expanded = !expanded; paint(); };
    group.append(toggle, teacher);
    return group;
  }
  const shellControls = makeControls(document);
  shellControls.hidden = true; bar.querySelector('.launcher-actions').before(shellControls);
  function paint() {
    const active = Boolean(gameDocument && enabled);
    for (const root of [document.documentElement, gameDocument?.documentElement]) {
      root?.classList.toggle('av-projector', active);
      root?.classList.toggle('av-projector-tools-open', active && expanded);
    }
    shellControls.hidden = !gameDocument;
    for (const group of [shellControls, fullscreenControls]) {
      if (!group) continue;
      const toggle = group.querySelector('[data-projector-toggle]'), teacher = group.querySelector('[data-projector-tools]');
      toggle.setAttribute('aria-pressed', String(active));
      teacher.hidden = !active; teacher.setAttribute('aria-expanded', String(active && expanded));
    }
  }
  function attach() {
    const doc = frame.contentDocument;
    if (doc === gameDocument) return;
    expanded = false; fullscreenControls = null;
    gameDocument = doc?.querySelector('#petGame,#game,#battle,#battleScreen') ? doc : null;
    if (gameDocument) {
      doc.documentElement.dataset.avProjectorFrame = '';
      const css = doc.createElement('link'); css.rel = 'stylesheet';
      css.href = new URL('assets/classroom-projector-1593.css', document.baseURI).href;
      doc.head.prepend(css);
      doc.addEventListener('fullscreenchange', () => {
        fullscreenControls?.remove(); fullscreenControls = null;
        if (doc === gameDocument && doc.fullscreenElement) {
          fullscreenControls = makeControls(doc);
          const host = doc.fullscreenElement === doc.documentElement ? doc.body : doc.fullscreenElement;
          host.append(fullscreenControls);
        }
        paint();
      });
    }
    paint();
  }
  frame.addEventListener('load', attach); attach();
})();
