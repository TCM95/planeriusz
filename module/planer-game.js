/* planer-game.js | GRA: wejście, pasek z przyciskami (reszta modułów ładuje się dopiero po kliknięciu) */
(function (TCM) {
  'use strict';

  const ui = TCM.m.ui;
  const uw = TCM.unsafeWindow;

  function init() {
    if (!uw.game_data || document.getElementById('tcm-planer-bar')) return;
    ui.injectStyle();

    let togglePanel = null;

    const bar = document.createElement('div');
    bar.id = 'tcm-planer-bar';
    bar.className = 'tcm-box tcm-bar-fixed';

    // przycisk z komunikatem "Czekaj..." na czas pracy i obsługą błędów
    const add = (text, work) => {
      const b = ui.button(text, async () => {
        const old = b.textContent;
        b.textContent = 'Czekaj...';
        try { await work(); } catch (e) { ui.gameError(e); } finally { b.textContent = old; }
      });
      bar.appendChild(b);
    };

    add('Zbiórka Wojska', async () => {
      await TCM.need('planer-game-troops.js');
      await TCM.m.troops.collect('off');
    });

    add('Zbiórka Obrona', async () => {
      await TCM.need('planer-game-troops.js');
      await TCM.m.troops.collect('deff');
    });

    add('Planer', async () => {
      await TCM.need('planer-game-troops.js', 'planer-settings.js', 'planer-game-panel.js');
      if (!togglePanel) togglePanel = TCM.m.gamePanel.create();
      togglePanel();
    });

    document.body.appendChild(bar);
  }

  TCM.m.game = { init };
})(TCM);
