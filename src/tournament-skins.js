(() => {
  'use strict';

  // Match medals are the existing per-player record, including replay rollbacks.
  const names = [
    'Iron Guard', 'Captain Spirit', 'Thor Force', 'Hulk Power', 'Widow Strike',
    'Hawkeye Focus', 'Strange Wisdom', 'Panther Legacy', 'Spider Unity', 'Ant-Might'
  ];
  const catalog = names.map((name, index) => ({
    id: name.toLowerCase().replaceAll(' ', '-'),
    name,
    wins: index + 1
  }));
  const storageKey = id => 'avTournamentSkin:' + id;
  const matchWins = id => getStudentRewards(id).medals;
  let dialog;

  function equipped(id) {
    const choice = ARAL_STORAGE.getItem(storageKey(id));
    if (!choice) return null;
    return catalog.find(skin => skin.id === choice && skin.wins <= matchWins(id)) || null;
  }

  function image(skin, gender) {
    const variant = gender === 'female' ? 'female' : 'male';
    return 'assets/tournament-skins/' + skin.id + '-' + variant + '.webp';
  }

  function open(id, playerName, gender, trigger) {
    if (!dialog) {
      dialog = document.createElement('dialog');
      dialog.id = 'avTournamentSkins';
      dialog.setAttribute('aria-labelledby', 'avSkinTitle');
      dialog.innerHTML = `<header><div><h2 id="avSkinTitle">Avengers Series</h2><p class="av-skin-progress"></p></div>
        <button type="button" class="av-skin-close" aria-label="Isara">×</button></header>
        <div class="av-skin-grid" role="group" aria-label="Mga tournament skin"></div>
        <footer><button type="button" class="av-skin-uniform">Gamitin ang uniporme</button>
        <p class="av-skin-status" role="status"></p></footer>`;
      document.body.append(dialog);
      dialog.querySelector('.av-skin-close').onclick = () => dialog.close();
    }

    const count = matchWins(id);
    let selection = equipped(id);
    let saving = false;
    const close = dialog.querySelector('.av-skin-close');
    dialog.oncancel = event => { if (saving) event.preventDefault(); };
    const grid = dialog.querySelector('.av-skin-grid');
    const uniform = dialog.querySelector('.av-skin-uniform');
    const status = dialog.querySelector('.av-skin-status');
    dialog.querySelector('.av-skin-progress').textContent =
      playerName + ' · ' + count + '/10 panalo sa tournament';
    grid.replaceChildren();

    function refresh() {
      for (const button of grid.children) {
        button.setAttribute('aria-pressed', String(button.dataset.skin === selection?.id));
      }
      uniform.disabled = !selection;
      trigger.textContent = selection ? 'Skins · ' + selection.name : 'Tournament skins';
      status.textContent = selection ? 'Suot ngayon: ' + selection.name : 'Suot ngayon: Uniporme';
    }

    async function choose(skin) {
      if (saving || (skin && skin.wins > matchWins(id))) return;
      saving = true;
      close.disabled = true;
      try {
        if (skin) ARAL_STORAGE.setItem(storageKey(id), skin.id);
        else ARAL_STORAGE.removeItem(storageKey(id));
        if (ARAL_STORAGE.getItem(storageKey(id)) !== (skin?.id ?? null)) {
          throw Error('Hindi na-save ang skin.');
        }
        selection = skin;
        refresh();
        await window.parent.mathAPangDesktop?.saveNow?.();
      } catch {
        selection = equipped(id);
        refresh();
        status.textContent = 'Hindi nakumpirma ang pag-save ng skin. Subukan muli.';
      } finally {
        saving = false;
        close.disabled = false;
      }
    }

    for (const skin of catalog) {
      const button = document.createElement('button');
      button.type = 'button';
      button.dataset.skin = skin.id;
      button.disabled = skin.wins > count;
      const figure = new Image();
      figure.src = image(skin, gender);
      figure.alt = '';
      const title = document.createElement('strong');
      title.textContent = skin.name;
      const requirement = document.createElement('small');
      requirement.textContent = button.disabled ? '🔒 ' + skin.wins + ' panalo' : 'Magagamit';
      button.append(figure, title, requirement);
      button.onclick = () => choose(skin);
      grid.append(button);
    }
    uniform.onclick = () => choose(null);
    refresh();
    dialog.showModal();
  }

  function rosterButton(person, gender) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'av-face-fit av-skins-open';
    const skin = equipped(person.id);
    button.textContent = skin ? 'Skins · ' + skin.name : 'Tournament skins';
    button.setAttribute('aria-label', 'Tournament skins · ' + mqBattleLabel(person));
    button.onclick = event => {
      event.stopPropagation();
      open(person.id, mqBattleLabel(person), gender(), button);
    };
    return button;
  }

  window.AVTournamentSkins = {equipped, image, rosterButton};
})();
