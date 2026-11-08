/* planer-game-panel.js | GRA: panel celów, fejków i burzaków + zapis wojsk dla planera */
(function (TCM) {
  'use strict';

  const { GM_getValue, GM_setValue } = TCM;
  const {
    TABS, TAB_NAMES, LINE_NAMES, SRC,
    num, esc, newRow, loadTargets, saveTargets, buildTab,
  } = TCM.m.core;
  const ui = TCM.m.ui;
  const troops = TCM.m.troops;

  // tworzy panel i zwraca funkcję pokazującą/ukrywającą go
  function create() {
    ui.injectStyle();

    const st = loadTargets();
    const all = newRow('');   // wiersz "Ustaw wszystkim"
    let cur = 'real';
    let src = GM_getValue('src', 'deff');
    if (!SRC[src]) src = 'deff';

    const panel = document.createElement('div');
    panel.id = 'tcm-targets';
    panel.className = 'tcm-box tcm-modal';
    document.body.appendChild(panel);

    const say = ui.makeSay(panel);

    const preview = () => {
      const el = panel.querySelector('#tcm-prev');
      if (el) el.value = buildTab(st, cur);
    };

    /* ----- wygląd ----- */

    function villageCell(r, i) {
      const info = r.id
        ? `<a href="${troops.villageUrl(r.id)}" target="_blank" title="${esc(r.name)} (id ${esc(r.id)})">${esc(r.c)}</a>`
        : esc(r.c);
      return `<td rowspan="2">${i + 1}. ${info}<br>` +
        `<button class="tcm-btn tcm-btn-red" data-act="del" data-v="${i}">usuń</button></td>`;
    }

    function unitRows(ri, r, first) {
      const cell = (u, ic) => `
        <td>${ic}</td>
        ${[0, 1, 2, 3].map(k =>
          `<td><input type="number" min="0" class="tcm-n" data-r="${ri}" data-u="${u}" data-f="l" data-i="${k}" value="${r[u].l[k]}"></td>`).join('')}
        <td><input type="number" min="0" class="tcm-n" data-r="${ri}" data-u="${u}" data-f="a" value="${r[u].a}"></td>`;
      return `<tr>${first}${cell('off', troops.gameIcon('axe', 'Off'))}</tr>` +
        `<tr>${cell('noble', troops.gameIcon('snob', 'Szlachta'))}</tr>`;
    }

    function render() {
      const rows = st[cur];
      panel.innerHTML = `
        <h4>Planer: cele</h4>
        <div class="tcm-bar">
          ${TABS.map(([k, n]) =>
            `<button class="tcm-btn${k === cur ? ' tcm-btn-active' : ''}" data-act="tab" data-v="${k}">${n} (${st[k].length})</button>`).join('')}
          <button class="tcm-btn tcm-btn-red" data-act="close" style="margin-left:auto">Zamknij</button>
        </div>
        <textarea id="tcm-add" rows="2" placeholder="Wklej koordy (np. 500|499), wyłapię je z dowolnego tekstu"></textarea>
        <div class="tcm-bar">
          <button class="tcm-btn tcm-btn-green" data-act="add">Dodaj</button>
          ${cur !== 'real' ? '<button class="tcm-btn" data-act="copyreal">Kopiuj koordy z Cele</button>' : ''}
          <button class="tcm-btn tcm-btn-red" data-act="clear">Wyczyść zakładkę</button>
        </div>
        <div style="overflow-x:auto"><table>
          <thead><tr><th>Wioska</th><th>Jednostka</th>${LINE_NAMES.map(n => `<th>${n}</th>`).join('')}<th>Auto (bez linii)</th></tr></thead>
          <tbody>${unitRows('all', all, '<td rowspan="2"><button class="tcm-btn tcm-btn-blue" data-act="apply">Ustaw wszystkim</button></td>')}</tbody>
          ${rows.map((r, i) => `<tbody>${unitRows(i, r, villageCell(r, i))}</tbody>`).join('')}
        </table></div>
        <div>Podgląd tekstu dla planera (${TAB_NAMES[cur]}):</div>
        <textarea id="tcm-prev" rows="5" readonly></textarea>
        <div class="tcm-bar">
          <label>Wojska dla planera:
            <select data-act="src">
              <option value="deff"${src === 'deff' ? ' selected' : ''}>Zbiórka Obrona</option>
              <option value="off"${src === 'off' ? ' selected' : ''}>Zbiórka Wojska</option>
            </select>
          </label>
          <button class="tcm-btn tcm-btn-green" data-act="store">Pobierz wojska i zapisz</button>
        </div>
        <div>Cele zapisują się same. Przycisk pobiera z gry tylko wybrane źródło.</div>
        <div id="tcm-status"></div>`;
      preview();
    }

    /* ----- akcje ----- */

    async function addCoords() {
      const txt = panel.querySelector('#tcm-add').value;
      const have = new Set(st[cur].map(r => r.c));
      const found = [];
      for (const m of txt.matchAll(/\b(\d{1,3})\|(\d{1,3})\b/g)) {
        const c = `${m[1]}|${m[2]}`;
        if (!have.has(c)) { have.add(c); found.push(c); }
      }
      let map = null;
      try { map = await troops.loadVillages(); } catch (e) { /* bez id */ }
      found.forEach(c => {
        const v = map && map.get(c);
        st[cur].push(newRow(c, v && v.id, v && v.name));
      });
      saveTargets(st);
      render();
      if (!map && found.length) say('Nie udało się pobrać listy wiosek świata, cele dodane bez id.');
    }

    async function storeTroops(btn) {
      btn.disabled = true;
      say('Pobieram wojska...');
      try {
        const text = await troops.fetchText(src);
        GM_setValue('troops', { src, text, ts: Date.now(), world: location.host });
        saveTargets(st);
        const planId = GM_getValue('lastPlanId', '');
        const link = planId
          ? `<a href="https://plemiona-planer.pl/pl/planer/${planId}" target="_blank">Otwórz planer (akcja ${planId})</a>`
          : 'Otwórz planer, a tu pojawi się link do ostatniej akcji.';
        say(`Zapisano ${SRC[src].name}: ${text.split('\r\n').length} wierszy, ` +
          `cele ${st.real.length}/${st.fake.length}/${st.ruin.length}. ${link}`);
      } catch (e) {
        say('<span class="tcm-err">Błąd: ' + esc(e) + '</span>');
      } finally {
        btn.disabled = false;
      }
    }

    function applyToAll() {
      const copy = u => ({ l: u.l.slice(), a: u.a });
      st[cur].forEach(r => { r.off = copy(all.off); r.noble = copy(all.noble); });
      saveTargets(st);
      render();
    }

    /* ----- zdarzenia ----- */

    panel.addEventListener('input', e => {
      const t = e.target;
      if (!t.dataset || t.dataset.r === undefined) return;
      const r = t.dataset.r === 'all' ? all : st[cur][+t.dataset.r];
      if (!r) return;
      const u = r[t.dataset.u];
      if (t.dataset.f === 'a') u.a = num(t.value);
      else u.l[+t.dataset.i] = num(t.value);
      saveTargets(st);
      preview();
    });

    panel.addEventListener('change', e => {
      const t = e.target;
      if (t.dataset && t.dataset.act === 'src') {
        src = t.value;
        GM_setValue('src', src);
      }
    });

    panel.addEventListener('click', e => {
      const b = e.target.closest('[data-act]');
      if (!b || b.tagName === 'SELECT') return;
      const act = b.dataset.act;
      const v = b.dataset.v;

      if (act === 'close') panel.classList.remove('tcm-open');
      else if (act === 'tab') { cur = v; render(); }
      else if (act === 'add') addCoords();
      else if (act === 'copyreal') {
        const have = new Set(st[cur].map(r => r.c));
        st.real.forEach(r => { if (!have.has(r.c)) st[cur].push(newRow(r.c, r.id, r.name)); });
        saveTargets(st);
        render();
      } else if (act === 'clear') {
        if (confirm(`Wyczyścić listę "${TAB_NAMES[cur]}"?`)) { st[cur] = []; saveTargets(st); render(); }
      } else if (act === 'del') { st[cur].splice(+v, 1); saveTargets(st); render(); }
      else if (act === 'apply') applyToAll();
      else if (act === 'store') storeTroops(b);
    });

    render();
    return () => panel.classList.toggle('tcm-open');
  }

  TCM.m.gamePanel = { create };
})(TCM);
