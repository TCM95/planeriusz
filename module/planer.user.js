// ==UserScript==
// @name         Plemiona - Wojska + Planer (TCM)
// @namespace    https://viayoo.com/
// @version      1.0
// @description  Loader: w grze zbiera wojska i cele, w plemiona-planer.pl wkleja je do planera. Moduły ładują się z GitHuba.
// @match        https://*.plemiona.pl/game.php*
// @match        https://plemiona-planer.pl/pl/planer/*
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        unsafeWindow
// @run-at       document-idle
// ==/UserScript==

/*
 * Ten plik instalujesz w przeglądarce RAZ i prawie go nie zmieniasz.
 * Cała logika jest w modułach (folder modul/ na GitHubie):
 *
 *   planer-core.js          stałe, pomocniki, model celów, zapis, tekst dla planera
 *   planer-ui.js            wspólny styl (jak BOB), przyciski, okna, status
 *   planer-game.js          GRA: pasek z przyciskami (wejście)
 *   planer-game-troops.js   GRA: pobieranie wojsk z przeglądu
 *   planer-game-panel.js    GRA: panel celów, fejków i burzaków
 *   planer-site.js          PLANER: router po adresie strony (wejście)
 *   planer-site-troops.js   PLANER: krok 1, wysyłanie wojsk
 *   planer-site-targets.js  PLANER: krok 2, wklejanie celów do okna
 */

(function () {
  'use strict';

  // folder z modułami na GitHubie (raw ma cache ok. 5 minut)
  const BASE = 'https://raw.githubusercontent.com/TCM95/autorskie/refs/heads/main/modul/';

  const isGame = location.hostname !== 'plemiona-planer.pl';

  // wspólny obiekt, który dostaje każdy moduł
  const TCM = {
    GM_getValue,
    GM_setValue,
    unsafeWindow,
    isGame,
    m: {},        // eksporty modułów: TCM.m.core, TCM.m.ui ...
    loaded: {},
  };

  const loading = {};

  function load(name) {
    if (!loading[name]) {
      loading[name] = (async () => {
        const res = await fetch(BASE + name, { credentials: 'omit' });
        if (!res.ok) throw new Error(`${name}: HTTP ${res.status}`);
        const code = await res.text();
        new Function('TCM', code)(TCM);
        TCM.loaded[name] = true;
      })();
      loading[name].catch(() => { delete loading[name]; });
    }
    return loading[name];
  }

  // TCM.need('a.js', 'b.js') ładuje po kolei to, czego jeszcze nie ma
  TCM.need = async (...names) => {
    for (const n of names) await load(n);
  };

  function fail(e) {
    console.error('[TCM planer]', e);
    const b = document.createElement('div');
    b.textContent = 'Planer TCM: błąd ładowania modułu. ' + e;
    b.style.cssText = 'position:fixed;top:4px;right:4px;z-index:100002;max-width:90vw;padding:8px;' +
      'background:#202225;color:#ff003c;border:1px solid #ff003c;border-radius:4px;font:12px sans-serif;';
    b.onclick = () => b.remove();
    document.body.appendChild(b);
  }

  (async () => {
    try {
      if (isGame) {
        await TCM.need('planer-core.js', 'planer-ui.js', 'planer-game.js');
        TCM.m.game.init();
      } else {
        await TCM.need('planer-core.js', 'planer-ui.js', 'planer-site.js');
        await TCM.m.site.init();
      }
    } catch (e) {
      fail(e);
    }
  })();
})();
