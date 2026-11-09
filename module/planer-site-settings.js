/* planer-site-settings.js | PLANER, krok 2: zapisuje włączone sekcje ustawień zaawansowanych i sprawdza zapis */
(function (TCM) {
  'use strict';

  const { esc, norm, num } = TCM.m.core;
  const cfg = TCM.m.settings;
  const uw = TCM.unsafeWindow;

  const sleep = ms => new Promise(r => setTimeout(r, ms));

  /* ---------- zapytania ---------- */

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

  function pageErrors(html) {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    return Array.from(doc.querySelectorAll('.alert-danger, .invalid-feedback, .errorlist, .text-danger'))
      .map(el => norm(el.textContent)).filter(Boolean).slice(0, 3);
  }

  /* ---------- odczyt pola z pobranej strony ---------- */

  function readField(doc, f) {
    const els = Array.from(doc.querySelectorAll(`[name="${f.name}"]`))
      .filter(el => el.type !== 'hidden');
    if (!els.length) return null;
    if (f.type === 'checkbox') return els[0].checked;
    if (els[0].type === 'radio') {
      const c = els.find(e => e.checked);
      return c ? c.value : null;
    }
    return els[0].value;
  }

  function same(f, want, got) {
    if (got === null) return false;
    if (f.type === 'number') return num(got) === num(want);
    if (f.type === 'checkbox') return !!got === !!want;
    if (f.type === 'textarea') return norm(got) === norm(want);
    return String(got) === String(want);
  }

  const show = v => (v === null || v === undefined ? '?' : String(v === true ? 'tak' : v === false ? 'nie' : v));

  /* ---------- budynki do burzenia ---------- */

  // klucze, które na pewno znamy; resztę ustala strona (createBuildingsOptions)
  const KNOWN_KEYS = { Ratusz: 'headquarters', Koszary: 'barracks', Kuźnia: 'smithy', Zagroda: 'farm' };

  function buildingKeys() {
    const map = Object.assign({}, KNOWN_KEYS);
    try {
      const opts = uw.createBuildingsOptions(...cfg.BUILDINGS);
      for (const o of Array.from(opts || [])) {
        if (o && o.label !== undefined && o.value !== undefined) map[String(o.label)] = String(o.value);
      }
    } catch (e) { /* zostają znane klucze */ }
    return map;
  }

  // zapisuje kolejność przez funkcję strony; zwraca listę kluczy albo null przy problemie
  async function applyBuildings(id, names, log) {
    const keys = buildingKeys();
    const unknown = names.filter(n => !keys[n]);
    if (unknown.length) {
      log(`Burzenie, budynki: <b class="tcm-err">nie znam nazw w planerze</b> (${esc(unknown.join(', '))}).`);
      return null;
    }
    if (typeof uw.changeBuildingsArray !== 'function') {
      log('Burzenie, budynki: <b class="tcm-err">strona nie ma funkcji zapisu</b>, ustaw je ręcznie.');
      return null;
    }
    const values = names.map(n => keys[n]);
    uw.changeBuildingsArray(String(id), values);
    await sleep(1500);                      // strona zapisuje w tle
    return values;
  }

  // lista budynków zapisana w planerze (znacznik na stronie)
  function savedBuildings(doc) {
    const el = doc.getElementById('initial-buildings');
    try { return el ? JSON.parse(el.textContent) : null; } catch (e) { return null; }
  }

  /* ---------- zapis ---------- */

  // log(linia) dostaje podsumowanie; zwraca true (wszystko OK), false (coś się nie zgadza) albo null (nic do zapisu)
  async function apply(log) {
    const S = cfg.load();
    const secs = cfg.SECTIONS.filter(s => S[s.id].on);
    if (!secs.length) {
      log('Ustawienia: brak włączonych sekcji (w grze: Planer, zakładka Ustawienia).');
      return null;
    }

    const url = location.pathname + location.search;
    const token = csrf();
    const sent = [];
    let wantBuildings = null;
    let allOk = true;

    for (const sec of secs) {
      const v = S[sec.id].values;
      if (sec.id === 'form3' && !v.date) {
        log(`${esc(sec.title)}: data pusta, pomijam.`);
        continue;
      }
      const data = { csrfmiddlewaretoken: token, [sec.id]: '' };
      for (const f of sec.fields) {
        if (f.type === 'buildings') continue;
        if (f.type === 'checkbox') { if (v[f.name]) data[f.name] = 'on'; }
        else data[f.name] = String(v[f.name] === undefined ? '' : v[f.name]);
      }
      if (sec.id === 'form3') {
        data['initial-date'] = (document.getElementById('initial-id_date') || {}).value || '';
      }

      const res = await post(url, data);
      const errs = pageErrors(await res.text());
      sent.push(sec);
      if (sec.id === 'form6') {
        const keys = await applyBuildings(location.pathname.match(/\/planer\/(\d+)/)[1], v.buildings, log);
        if (keys) wantBuildings = keys; else allOk = false;
      }
      if (!res.ok || errs.length) {
        allOk = false;
        log(`${esc(sec.title)}: HTTP ${res.status}${errs.length ? ', komunikat planera: ' + esc(errs.join(' | ')) : ''}`);
      }
    }

    // sprawdzenie: pobierz stronę jeszcze raz i porównaj pola
    const html = await (await fetch(url, { credentials: 'same-origin', cache: 'no-store' })).text();
    const doc = new DOMParser().parseFromString(html, 'text/html');

    for (const sec of sent) {
      const v = S[sec.id].values;
      const bad = sec.fields.filter(f => f.type !== 'buildings' && !same(f, v[f.name], readField(doc, f)));
      const parts = bad.map(f =>
        `${esc(f.label)} (jest ${esc(show(readField(doc, f)))}, ma być ${esc(show(v[f.name]))})`);
      if (sec.id === 'form6' && wantBuildings) {
        const got = savedBuildings(doc);
        if (JSON.stringify(got) !== JSON.stringify(wantBuildings)) {
          parts.push(`kolejność budynków (jest ${esc(got ? got.join(', ') : '?')}, ma być ${esc(wantBuildings.join(', '))})`);
        }
      }
      if (parts.length) {
        allOk = false;
        log(`${esc(sec.title)}: <b class="tcm-err">NIE ZGADZA SIĘ</b> ` + parts.join('; '));
      } else {
        log(`${esc(sec.title)}: <b class="tcm-ok">OK</b>`);
      }
    }
    return allOk;
  }

  TCM.m.siteSettings = { apply };
})(TCM);
