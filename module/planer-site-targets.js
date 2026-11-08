/* planer-site-targets.js | PLANER, krok 2: wkleja cele, fejki i burzaki do okna i klika "Zapisz cele" */
(function (TCM) {
  'use strict';

  const { GM_getValue, GM_setValue } = TCM;
  const { TABS, TAB_NAMES, esc, loadTargets, buildTab, worldWarning } = TCM.m.core;
  const ui = TCM.m.ui;

  /*
   * Jak to działa: skrypt robi to samo co Ty. Wkleja tekst do pola z celami, klika "Zapisz cele",
   * strona się przeładowuje, a skrypt przechodzi do kolejnej zakładki (Cele -> Fejki -> Burzaki).
   * Kolejka i wyniki trzymane są w GM (tabQueue, tabLast, tabSum), bo strona przeładowuje się po każdym zapisie.
   */

  // ile celów planer pokazuje przy nazwie zakładki (znaczek na stronie)
  function badge(tab) {
    const el = document.querySelector(`a[href="?t=${tab}"] .badge`);
    return el ? parseInt(el.textContent, 10) : null;
  }

  function note(line) {
    GM_setValue('tabSum', (GM_getValue('tabSum', '') || '') + line + '<br>');
  }

  // sprawdza zakładkę zapisaną tuż przed przeładowaniem; false = nie zgadza się, kolejka przerwana
  function verifyLast() {
    const last = GM_getValue('tabLast', null);
    if (!last) return true;
    GM_setValue('tabLast', null);

    const got = badge(last.tab);
    const ok = got === last.n;
    note(`${TAB_NAMES[last.tab]}: wysłano ${last.n}, w planerze ${got === null ? '?' : got} ` +
      (ok ? '<b class="tcm-ok">OK</b>' : '<b class="tcm-err">NIE ZGADZA SIĘ</b>'));
    if (!ok) {
      GM_setValue('tabQueue', []);
      note('Komunikat planera jest wyżej na tej stronie. Planer odrzuca wioski spoza świata rozpiski i barbarzyńskie.');
    }
    return ok;
  }

  function init(id) {
    const st = loadTargets();
    const pageTab = new URLSearchParams(location.search).get('t') || 'real';
    let cur = TABS.some(t => t[0] === pageTab) ? pageTab : 'real';
    const pending = GM_getValue('pendingTargets', '') === id;

    const panel = ui.mountPanel(['.col-12.col-lg-7', '.container-fluid']);
    const say = ui.makeSay(panel);
    ui.bindFold(panel);

    function render() {
      const inPlaner = [...document.querySelectorAll('.t-tab-teal .badge')].map(b => b.textContent).join(' / ');
      panel.innerHTML = `
        <div class="tcm-head" data-act="fold">Skrypt: cele, fejki, burzaki (kliknij, aby zwinąć)</div>
        <div class="tcm-body" ${ui.panelOpen() ? '' : 'style="display:none"'}>
          <div>Zapisane w grze: Cele ${st.real.length}, Fejki ${st.fake.length}, Burzaki ${st.ruin.length}.</div>
          <div>W planerze (Cele / Fejki / Burzaki): ${inPlaner || '?'}</div>
          ${worldWarning(GM_getValue('targetsWorld', ''))}
          <div class="tcm-bar">${TABS.map(([k, n]) =>
            `<button class="tcm-btn${k === cur ? ' tcm-btn-active' : ''}" data-act="tab" data-v="${k}">${n} (${st[k].length})</button>`).join('')}</div>
          <textarea id="tcm-prev" rows="5" readonly>${esc(buildTab(st, cur))}</textarea>
          <div class="tcm-bar"><button class="tcm-btn tcm-btn-green" data-act="start">Wklej i zapisz cele</button></div>
          <div id="tcm-status">${GM_getValue('tabSum', '') || ''}</div>
        </div>`;
    }

    // start: ustawia kolejkę zakładek z celami i rusza
    function fill() {
      const tabs = TABS.map(t => t[0]).filter(k => st[k].length);
      if (!tabs.length) {
        say('<span class="tcm-err">Brak celów zapisanych w grze.</span> W grze otwórz "Planer" i dodaj koordy.');
        return;
      }
      GM_setValue('tabSum', '');
      GM_setValue('tabLast', null);
      GM_setValue('tabQueue', tabs);
      step();
    }

    // jeden krok kolejki: przejdź do zakładki, wklej, kliknij "Zapisz cele"
    function step() {
      const q = GM_getValue('tabQueue', []) || [];
      if (!q.length) return;
      const tab = q[0];

      if (pageTab !== tab) {
        location.href = `${location.pathname}?t=${tab}`;
        return;
      }

      const text = buildTab(st, tab);
      const ed = TCM.unsafeWindow.editor;               // edytor CodeMirror ze strony planera
      const ta = document.getElementById('id_target');
      if (ed && ed.setValue) ed.setValue(text);
      if (ta) ta.value = text;
      if (ed && ed.save) ed.save();

      GM_setValue('tabQueue', q.slice(1));
      GM_setValue('tabLast', { tab, n: st[tab].length });
      say(`Wklejam: ${TAB_NAMES[tab]} (${st[tab].length}), zapisuję...`);

      const btn = document.getElementById('form1-btn');
      if (!btn) {
        say('<span class="tcm-err">Nie znaleziono przycisku "Zapisz cele".</span>');
        return;
      }
      setTimeout(() => btn.click(), 400);
    }

    panel.addEventListener('click', e => {
      const b = e.target.closest('[data-act]');
      if (!b) return;
      if (b.dataset.act === 'tab') { cur = b.dataset.v; render(); }
      else if (b.dataset.act === 'start') fill();
    });

    // wynik poprzedniego zapisu najpierw, dopiero potem render (żeby pokazał podsumowanie)
    const ok = verifyLast();
    render();

    if (pending) {
      GM_setValue('pendingTargets', '');
      setTimeout(fill, 600);
    } else if (ok && (GM_getValue('tabQueue', []) || []).length) {
      setTimeout(step, 600);
    }
  }

  TCM.m.siteTargets = { init };
})(TCM);
