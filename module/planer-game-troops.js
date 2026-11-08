/* planer-game-troops.js | GRA: pobieranie wojsk z Przeglądu i zamiana na tekst dla planera */
(function (TCM) {
  'use strict';

  const uw = TCM.unsafeWindow;
  const { SRC, norm } = TCM.m.core;
  const ui = TCM.m.ui;

  const CONFIG = {
    // wiersze z Przeglądu -> Wojska (widok "complete")
    deff: { labels: ['w wiosce', 'w drodze'], keepLabel: true, tail: [] },
    off: { labels: ['własne'], keepLabel: false, tail: ['0'] },
    // true, gdy świat ma łuczników / konnych łuczników / rycerza (dopisuje 0 w to miejsce)
    padUnits: { archer: false, marcher: false, knight: false },
    secondField: '0',
  };

  const COORD_RE = /\((\d{1,3}\|\d{1,3})\)/g;
  const isNum = s => /^\d+$/.test(s.replace(/[.\s]/g, ''));

  function buildUrl() {
    const gd = uw.game_data;
    return `${location.origin}/game.php?village=${gd.village.id}&screen=overview_villages&mode=units&type=complete&page=-1`;
  }

  // 9 jednostek (bez łuczników i rycerza) -> kolejność wymagana przez planer
  function pad(n) {
    if (n.length !== 9) return n;
    const [spear, sword, axe, spy, light, heavy, ram, cat, snob] = n;
    const out = [spear, sword, axe];
    if (CONFIG.padUnits.archer) out.push('0');
    out.push(spy, light);
    if (CONFIG.padUnits.marcher) out.push('0');
    out.push(heavy, ram, cat);
    if (CONFIG.padUnits.knight) out.push('0');
    out.push(snob);
    return out;
  }

  function parseUnits(html, cfg) {
    const labels = cfg.labels;
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const table = doc.querySelector('#units_table');
    if (!table) throw new Error('Brak tabeli #units_table (zła strona / captcha?)');
    const rows = Array.from(table.querySelectorAll('tr'))
      .filter(tr => !tr.querySelector('th') && !tr.closest('tfoot'));

    let coords = '';
    const lines = [];
    for (const tr of rows) {
      const cells = Array.from(tr.querySelectorAll('td')).map(td => norm(td.textContent));
      if (!cells.length) continue;
      let label = '';
      const nums = [];
      for (const text of cells) {
        const m = [...text.matchAll(COORD_RE)];
        if (m.length) {
          coords = m[m.length - 1][1];
        } else if (isNum(text)) {
          nums.push(text.replace(/[.\s]/g, ''));
        } else if (text && !label && text.toLowerCase() !== 'rozkazy') {
          label = text.toLowerCase();
        }
      }
      if (!coords || !nums.length) continue;
      if (!labels.some(l => label.includes(l))) continue;
      const parts = [coords, CONFIG.secondField];
      if (cfg.keepLabel) parts.push(label);
      parts.push(...pad(nums), ...(cfg.tail || []));
      lines.push(parts.join(',') + ',');
    }
    if (!lines.length) throw new Error('Nie znaleziono wierszy dla: ' + labels.join(', '));
    return lines.join('\r\n');
  }

  // key: 'off' albo 'deff' -> gotowy tekst
  async function fetchText(key) {
    const res = await fetch(buildUrl(), { credentials: 'same-origin' });
    return parseUnits(await res.text(), CONFIG[key]);
  }

  // pokazuje tekst w oknie z przyciskiem Kopiuj
  async function collect(key) {
    const output = await fetchText(key);
    const ta = document.createElement('textarea');
    ta.rows = 15;
    ta.value = output;
    const copy = ui.button('Kopiuj', () => { ta.select(); document.execCommand('copy'); }, 'tcm-btn-green');
    const info = document.createElement('p');
    info.textContent = 'Wygenerowano ' + new Date().toLocaleString();
    info.style.cssText = 'text-align:right;font-size:11px;margin:4px 0;';
    ui.dialog(SRC[key].name, [ta, copy, info]);
  }

  /* ----- lista wiosek świata (id po koordach) ----- */

  let villagesPromise = null;
  function loadVillages() {
    if (!villagesPromise) {
      villagesPromise = fetch(`${location.origin}/map/village.txt`, { credentials: 'same-origin' })
        .then(r => { if (!r.ok) throw new Error('village.txt HTTP ' + r.status); return r.text(); })
        .then(txt => {
          const map = new Map();
          for (const ln of txt.split('\n')) {
            const p = ln.split(',');
            if (p.length < 4) continue;
            let name = p[1];
            try { name = decodeURIComponent(p[1].replace(/\+/g, ' ')); } catch (e) { /* zostaw */ }
            map.set(`${p[2]}|${p[3]}`, { id: p[0], name });
          }
          return map;
        });
      villagesPromise.catch(() => { villagesPromise = null; });
    }
    return villagesPromise;
  }

  function villageUrl(id) {
    return `${location.origin}/game.php?village=${uw.game_data.village.id}&screen=info_village&id=${id}`;
  }

  // ikona jednostki z gry (albo sam podpis)
  function gameIcon(name, fallback) {
    let src = '';
    const base = uw.image_base;
    if (base) {
      src = base + 'unit/unit_' + name + '.png';
    } else {
      const img = document.querySelector(`img[src*="unit_${name}"]`);
      if (img) src = img.src;
    }
    return src
      ? `<img src="${src}" title="${fallback}" alt="${fallback}" style="vertical-align:middle">`
      : fallback;
  }

  TCM.m.troops = { CONFIG, buildUrl, parseUnits, fetchText, collect, loadVillages, villageUrl, gameIcon };
})(TCM);
