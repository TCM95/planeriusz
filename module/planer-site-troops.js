/* planer-site-troops.js | PLANER, krok 1 "Dane o wojsku": wysyła wojska z gry i sprawdza zapis */
(function (TCM) {
  'use strict';

  const { GM_getValue, GM_setValue } = TCM;
  const { SRC, norm, esc, worldWarning } = TCM.m.core;
  const ui = TCM.m.ui;

  /* ---------- zapytania do planera ---------- */

  function csrf() {
    const i = document.querySelector('input[name=csrfmiddlewaretoken]');
    return i ? i.value : '';
  }

  function post(url, data) {
    return fetch(url, {
      method: 'POST',
      body: new URLSearchParams(data),
      credentials: 'same-origin',
    });
  }

  // komunikaty błędów z odpowiedzi planera (jeśli jakieś są)
  function pageErrors(html) {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    return Array.from(doc.querySelectorAll('.alert-danger, .invalid-feedback, .errorlist, .text-danger'))
      .map(el => norm(el.textContent)).filter(Boolean).slice(0, 3);
  }

  // zawartość pola (np. deff_troops) tak, jak planer ma ją zapisaną
  async function readSavedField(url, name) {
    const res = await fetch(url, { credentials: 'same-origin', cache: 'no-store' });
    const doc = new DOMParser().parseFromString(await res.text(), 'text/html');
    const el = doc.querySelector(`textarea[name="${name}"]`);
    return el ? el.value : null;
  }

  /* ---------- wysyłanie wojsk ---------- */

  // zwraca true, gdy planer ma w polu dokładnie to, co wysłaliśmy
  async function sendTroops(data, say) {
    const url = location.pathname;
    const token = csrf();
    const s = SRC[data.src];

    // 1) wybór źródła danych (Zbiórka Wojska / Obrona)
    const r0 = await post(url, { csrfmiddlewaretoken: token, 'form-input': '', input_data_type: s.planer });
    say(`Źródło danych (${s.name}): HTTP ${r0.status}`, true);

    // 2) wysłanie samych wojsk
    const r1 = await post(url, { csrfmiddlewaretoken: token, [s.field]: '', [s.textarea]: data.text });
    const t1 = await r1.text();
    const msg = /pomyślnie/i.test(t1);

    // pewniejsze niż komunikat: pobierz stronę jeszcze raz i zobacz, co jest w polu
    const saved = await readSavedField(url, s.textarea);
    const want = data.text.split(/\r?\n/).filter(Boolean);
    const have = saved === null ? null : saved.split(/\r?\n/).filter(Boolean);
    const same = !!have && have.length === want.length &&
      have[0] === want[0] && have[have.length - 1] === want[want.length - 1];
    const ok = r0.ok && r1.ok && (msg || same);

    say(`${s.name}: HTTP ${r1.status}, komunikat ${msg ? 'jest' : 'brak'}, ` +
      `w polu po zapisie: ${have === null ? 'nie znaleziono pola' : have.length + ' wierszy'} (wysłano ${want.length})` +
      `${ok ? ', <b class="tcm-ok">OK</b>' : ' <b class="tcm-err">NIE ZGADZA SIĘ</b>'}`, true);

    if (!ok) {
      const errs = pageErrors(t1);
      say(`Odpowiedź planera: ${errs.length ? esc(errs.join(' | ')) : 'bez komunikatu błędu'}; początek pola: ` +
        `${have && have.length ? esc(have[0].slice(0, 60)) : '(puste)'}`, true);
    }
    return ok;
  }

  /* ---------- panel ---------- */

  function init(id) {
    const raw = GM_getValue('troops', null);
    const data = raw && raw.text && SRC[raw.src] ? raw : null;
    const opts = Object.assign({ sendTroops: true, go: true, auto: true }, GM_getValue('opts', {}) || {});

    const panel = ui.mountPanel(['.row.mt-3.mb-4 > .col-12.col-lg-7', '.container-fluid']);
    const say = ui.makeSay(panel);
    ui.bindFold(panel);

    function render() {
      const when = data ? new Date(data.ts).toLocaleString() : '';
      panel.innerHTML = `
        <div class="tcm-head" data-act="fold">Skrypt: wypełnianie planera (kliknij, aby zwinąć)</div>
        <div class="tcm-body" ${ui.panelOpen() ? '' : 'style="display:none"'}>
          <div>${data
            ? `Z gry (${esc(data.world)}), pobrane ${when}: <b>${SRC[data.src].name}</b>, ${data.text.split('\r\n').length} wierszy.`
            : 'Brak wojsk z gry. W grze otwórz "Planer", wybierz źródło i kliknij "Pobierz wojska i zapisz".'}</div>
          ${data ? worldWarning(data.world) : ''}
          <div class="tcm-bar">
            <label><input type="checkbox" data-opt="sendTroops"${opts.sendTroops ? ' checked' : ''}${data ? '' : ' disabled'}> wyślij wojska</label>
            <label><input type="checkbox" data-opt="go"${opts.go ? ' checked' : ''}> po udanym zapisie przejdź do kroku 2</label>
            <label><input type="checkbox" data-opt="auto"${opts.auto ? ' checked' : ''}> w kroku 2 od razu wklej cele, fejki i burzaki</label>
          </div>
          <div class="tcm-bar"><button class="tcm-btn tcm-btn-green" data-act="start">Start</button></div>
          <div id="tcm-status"></div>
        </div>`;
    }

    async function start(btn) {
      btn.disabled = true;
      say('');
      try {
        let allOk = true;

        if (data && opts.sendTroops) allOk = await sendTroops(data, say);
        else say('Wojsk nie wysłano (brak danych z gry albo odznaczone).', true);

        const next = `/pl/planer/${id}/planer-form?t=real`;
        if (allOk && opts.go) {
          if (opts.auto) GM_setValue('pendingTargets', id);
          say('Gotowe. Przechodzę do kroku 2...', true);
          setTimeout(() => { location.href = next; }, 1500);
        } else {
          say(`${allOk ? 'Gotowe.' : 'Zostaję na tej stronie, bo coś się nie zgadza.'} ` +
            `<a href="${location.pathname}">Odśwież</a> | <a href="${next}">Krok 2</a>`, true);
        }
      } catch (err) {
        say('<span class="tcm-err">Błąd: ' + esc(err) + '</span>', true);
      } finally {
        btn.disabled = false;
      }
    }

    panel.addEventListener('change', e => {
      const t = e.target;
      if (t.dataset && t.dataset.opt) {
        opts[t.dataset.opt] = t.checked;
        GM_setValue('opts', opts);
      }
    });

    panel.addEventListener('click', e => {
      const b = e.target.closest('[data-act=start]');
      if (b) start(b);
    });

    render();
  }

  TCM.m.siteTroops = { init };
})(TCM);
