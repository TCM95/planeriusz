/* planer-core.js | wspólne: stałe, pomocniki, model celów, zapis w GM, tekst dla planera */
(function (TCM) {
  'use strict';

  const { GM_getValue, GM_setValue } = TCM;

  /* ---------- stałe ---------- */

  const TABS = [['real', 'Cele'], ['fake', 'Fejki'], ['ruin', 'Burzaki']];
  const TAB_NAMES = Object.fromEntries(TABS);
  const LINE_NAMES = ['Front najbliżej', 'Zaplecze blisko', 'Zaplecze losowo', 'Zaplecze daleko'];

  // źródło wojsk: nazwa w grze, wartość w planerze, pola formularza
  const SRC = {
    deff: { name: 'Zbiórka Obrona', planer: 'Deff collection', field: 'form-2', textarea: 'deff_troops' },
    off: { name: 'Zbiórka Wojska', planer: 'Army collection', field: 'form-1', textarea: 'off_troops' },
  };

  /* ---------- pomocniki ---------- */

  const num = v => Math.max(0, parseInt(v, 10) || 0);
  const norm = s => String(s).replace(/\s+/g, ' ').trim();
  const esc = s => String(s).replace(/[&<>"']/g,
    c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  /* ---------- model celów ---------- */

  const newUnit = () => ({ l: [0, 0, 0, 0], a: 0 });
  const newRow = (c, id, name) => ({ c, id: id || null, name: name || '', off: newUnit(), noble: newUnit() });

  function loadTargets() {
    const t = GM_getValue('targets', {}) || {};
    return Object.assign({ real: [], fake: [], ruin: [] }, t);
  }

  function saveTargets(st) {
    GM_setValue('targets', st);
    // z którego świata są cele (do ostrzeżenia w planerze)
    if (TCM.isGame) GM_setValue('targetsWorld', location.host);
  }

  /* ---------- tekst dla planera ---------- */

  // 4 linie (a|b|c|d), a gdy żadna linia nie jest wpisana, zwykła liczba "Auto"
  function unitText(u) {
    const ls = u.l.map(num);
    if (ls.some(n => n > 0)) return ls.join('|');
    return String(num(u.a));
  }

  function targetLine(r) {
    const o = unitText(r.off);
    const n = unitText(r.noble);
    if (o === '0' && n === '0') return r.c;
    return `${r.c}:${o}:${n}`;
  }

  const buildTab = (st, tab) => st[tab].map(targetLine).join('\n');

  /* ---------- świat gry a świat rozpiski ---------- */

  // "pl226.plemiona.pl" -> "226"
  function hostWorld(host) {
    const m = String(host || '').match(/^[a-z]+(\d+)\./i);
    return m ? m[1] : null;
  }

  // "Nazwa - Świat 226" z menu bocznego planera -> "226"
  function outlineWorld() {
    const el = document.querySelector('.list-group-item.small.bg-secondary');
    const m = el && el.textContent.match(/Świat\s+(\d+)/i);
    return m ? m[1] : null;
  }

  // HTML z ostrzeżeniem albo pusty tekst, gdy światy się zgadzają
  function worldWarning(gameHost) {
    const gw = hostWorld(gameHost);
    const ow = outlineWorld();
    if (gw && ow && gw !== ow) {
      return `<div class="tcm-warn">Uwaga: rozpiska jest na świecie ${ow}, a dane z gry są ze świata ${gw}. ` +
        `Planer odrzuci wioski, których nie ma na świecie ${ow}.</div>`;
    }
    return '';
  }

  TCM.m.core = {
    TABS, TAB_NAMES, LINE_NAMES, SRC,
    num, norm, esc,
    newUnit, newRow, loadTargets, saveTargets,
    unitText, targetLine, buildTab,
    hostWorld, outlineWorld, worldWarning,
  };
})(TCM);
