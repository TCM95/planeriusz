/* planer-settings.js | ustawienia zaawansowane planera: schemat pól, zapis w GM, edytor (zakładka w grze) */
(function (TCM) {
  'use strict';

  const { GM_getValue, GM_setValue } = TCM;
  const { esc } = TCM.m.core;

  /*
   * Schemat odpowiada sekcjom "Ustawienia zaawansowane" ze strony planera (krok 2).
   * id = nazwa ukrytego pola formularza (form2...form7), name = nazwa pola w planerze.
   * Dodanie nowego pola to jedna linijka tutaj, reszta (edytor, wysyłka, sprawdzanie) działa sama.
   */

  const MODES = [
    ['closest', 'Front najbliżej'], ['close', 'Zaplecze blisko'],
    ['random', 'Zaplecze losowo'], ['far', 'Zaplecze daleko'],
  ];

  // budynki do burzenia: nazwy jak na stronie planera (klucze ustala strona, patrz planer-site-settings.js)
  const BUILDINGS = [
    'Ratusz', 'Koszary', 'Stajnia', 'Warsztat', 'Pałac', 'Kuźnia', 'Plac', 'Piedestał',
    'Rynek', 'Tartak', 'Cegielnia', 'Huta żelaza', 'Zagroda', 'Spichlerz', 'Mur', 'Wieża Strażnicza',
  ];

  const SECTIONS = [
    {
      id: 'form2', title: '1. Dostępne jednostki',
      fields: [
        { name: 'initial_outline_min_off', label: 'Minimalna liczba jednostek w offie', type: 'number', def: 19000, min: 1, max: 28000 },
        { name: 'initial_outline_max_off', label: 'Maksymalna liczba jednostek w offie', type: 'number', def: 28000, min: 1, max: 28000 },
        { name: 'initial_outline_front_dist', label: 'Minimalna odległość od linii frontu', type: 'number', def: 10, min: 0, max: 500 },
        { name: 'initial_outline_target_dist', label: 'Maksymalna odległość dla szlachciców', type: 'number', def: 70, min: 0 },
        { name: 'initial_outline_maximum_off_dist', label: 'Maksymalna odległość dla offów i burzaków', type: 'number', def: 100, min: 0, max: 1000 },
        { name: 'initial_outline_excluded_coords', label: 'Wioski wroga pomijane przy froncie (diody), koordy po spacji lub enterze', type: 'textarea', def: '' },
      ],
    },
    {
      id: 'form3', title: '2. Data akcji',
      fields: [
        { name: 'date', label: 'Data akcji (pusta = nie zmieniaj)', type: 'date', def: '' },
      ],
    },
    {
      id: 'form4', title: '3. Parametry rozpiski',
      fields: [
        { name: 'mode_off', label: 'Domyślny dystans dla offów', type: 'select', options: MODES, def: 'random' },
        { name: 'mode_noble', label: 'Domyślny dystans dla szlachciców', type: 'select', options: MODES, def: 'closest' },
        {
          name: 'mode_division', label: 'Dzielenie offów z szlachcicami', type: 'select', def: 'not_divide',
          options: [['divide', 'Dziel offy z szlachtą'], ['not_divide', 'Nie dziel offów z szlachtą'], ['separatly', 'Offy i szlachta osobno']],
        },
        {
          name: 'mode_guide', label: 'Sposób rozpisywania szlachciców', type: 'select', def: 'one',
          options: [['one', 'Możliwie na jedną wioskę'], ['many', 'Na jedną lub wiele wiosek (optymalnie)'], ['single', 'Na cel z pojedynczych wiosek']],
        },
        {
          name: 'mode_split', label: 'Komendy z wiosek z szlachtą', type: 'select', def: 'split',
          options: [['together', 'Szlachta z wioski jako jeden rozkaz'], ['split', 'Szlachta z wioski jako wiele rozkazów']],
        },
        { name: 'initial_outline_fake_limit', label: 'Maks. fejk taranów z jednej wioski', type: 'number', def: 4, min: 0 },
        {
          name: 'initial_outline_fake_mode', label: 'Skąd rozpisywać fejki', type: 'select', def: 'off',
          options: [['off', 'Tylko z wiosek z pełnym offem'], ['all', 'Ze wszystkich wiosek']],
        },
        { name: 'initial_outline_nobles_limit', label: 'Maks. szlachciców z jednej wioski', type: 'number', def: 8, min: 0, max: 250 },
        { name: 'initial_outline_minimum_noble_troops', label: 'Min. jednostek w obstawie szlachcica', type: 'number', def: 100, min: 0, max: 28000 },
        { name: 'initial_outline_minimum_fake_noble_troops', label: 'Min. jednostek w obstawie fake szlachcica', type: 'number', def: 0, min: 0, max: 200 },
      ],
    },
    {
      id: 'form7', title: '4. Morale',
      fields: [
        { name: 'morale_on_targets_greater_than', label: 'Tylko atakujący POWYŻEJ tego morale', type: 'number', def: 100, min: 0 },
        { name: 'morale_on', label: 'Bierz pod uwagę morale w tej rozpisce', type: 'checkbox', def: false },
      ],
    },
    {
      id: 'form5', title: '5. Unikanie bonusu nocnego',
      fields: [
        { name: 'night_bonus', label: 'Omijaj bonus nocny', type: 'checkbox', def: false },
        { name: 'enter_t1', label: 'Przybliżony czas wejścia akcji (godzina)', type: 'number', def: 7, min: 0, max: 24 },
        { name: 'enter_t2', label: 'Przybliżony ostatni czas wejścia akcji (godzina)', type: 'number', def: 12, min: 0, max: 24 },
      ],
    },
    {
      id: 'form6', title: '6. Burzenie',
      fields: [
        { name: 'initial_outline_catapult_min_value', label: 'Min. katapult w każdym burzaku', type: 'number', def: 25, min: 1, max: 1175 },
        { name: 'initial_outline_min_ruin_attack_off', label: 'Min. jednostek w obstawie burzaka', type: 'number', def: 0, min: 0, max: 28000 },
        { name: 'buildings', label: 'Kolejność burzenia budynków (tylko wymienione, w tej kolejności)', type: 'buildings', def: ['Zagroda', 'Ratusz', 'Kuźnia'] },
      ],
    },
  ];

  const FIELD = {};
  SECTIONS.forEach(sec => sec.fields.forEach(f => { FIELD[sec.id + '.' + f.name] = f; }));

  /* ---------- zapis ---------- */

  // { form2: { on: false, values: { pole: wartość } }, ... } uzupełnione domyślnymi
  function load() {
    const saved = GM_getValue('settings', {}) || {};
    const out = {};
    for (const sec of SECTIONS) {
      const s = saved[sec.id] || {};
      out[sec.id] = { on: !!s.on, values: {} };
      for (const f of sec.fields) {
        const v = s.values && f.name in s.values ? s.values[f.name] : f.def;
        out[sec.id].values[f.name] = Array.isArray(v) ? v.slice() : v;
      }
    }
    return out;
  }

  const save = S => GM_setValue('settings', S);

  /* ---------- edytor (zakładka "Ustawienia" w grze) ---------- */

  // lista budynków do burzenia: kolejność, przesuwanie, usuwanie, dodawanie
  function buildingsHtml(sec, f, list) {
    const rows = list.map((b, i) =>
      `<div style="display:flex;align-items:center;gap:4px;margin:3px 0"><span style="flex:1">${i + 1}. ${esc(b)}</span>` +
      `<button class="tcm-btn" data-bact="up" data-i="${i}">▲</button>` +
      `<button class="tcm-btn" data-bact="down" data-i="${i}">▼</button>` +
      `<button class="tcm-btn tcm-btn-red" data-bact="del" data-i="${i}">✕</button></div>`).join('');
    const free = BUILDINGS.filter(b => !list.includes(b));
    return `<div class="tcm-bld" data-sec="${sec.id}" data-fld="${f.name}" style="margin:6px 0">` +
      `<div>${esc(f.label)}</div>${rows}` +
      (free.length
        ? `<div style="display:flex;gap:4px;margin-top:4px"><select data-badd style="flex:1">` +
          free.map(b => `<option>${esc(b)}</option>`).join('') +
          `</select><button class="tcm-btn tcm-btn-green" data-bact="add">Dodaj</button></div>`
        : '') +
      '</div>';
  }

  function fieldHtml(sec, f, value) {
    if (f.type === 'buildings') return buildingsHtml(sec, f, value);
    const at = `data-sec="${sec.id}" data-fld="${f.name}"`;
    if (f.type === 'checkbox') {
      return `<label style="display:flex;align-items:center;gap:6px;margin:6px 0">` +
        `<input type="checkbox" ${at}${value ? ' checked' : ''}> ${esc(f.label)}</label>`;
    }
    let input;
    if (f.type === 'number') {
      input = `<input type="number" ${at} value="${esc(value)}"` +
        `${f.min !== undefined ? ` min="${f.min}"` : ''}${f.max !== undefined ? ` max="${f.max}"` : ''} style="width:100%">`;
    } else if (f.type === 'select') {
      input = `<select ${at} style="width:100%">` + f.options.map(([v, t]) =>
        `<option value="${esc(v)}"${String(value) === v ? ' selected' : ''}>${esc(t)}</option>`).join('') + '</select>';
    } else if (f.type === 'textarea') {
      input = `<textarea ${at} rows="3">${esc(value)}</textarea>`;
    } else {
      input = `<input type="${f.type}" ${at} value="${esc(value)}" style="width:100%">`;
    }
    return `<label style="display:block;margin:6px 0">${esc(f.label)}<br>${input}</label>`;
  }

  function editorHtml(S) {
    return SECTIONS.map(sec => {
      const s = S[sec.id];
      return `<div class="tcm-set" style="border:1px solid var(--border-color);border-radius:4px;padding:6px;` +
        `margin:6px 0;opacity:${s.on ? 1 : 0.6}">` +
        `<label style="display:flex;align-items:center;gap:6px;font-weight:bold;color:var(--title-color)">` +
        `<input type="checkbox" data-sec="${sec.id}" data-on${s.on ? ' checked' : ''}> ${esc(sec.title)}</label>` +
        sec.fields.map(f => fieldHtml(sec, f, s.values[f.name])).join('') +
        '</div>';
    }).join('');
  }

  function readInput(f, el) {
    if (f.type === 'checkbox') return el.checked;
    if (f.type === 'number') {
      const n = parseInt(el.value, 10);
      return Number.isNaN(n) ? f.def : n;
    }
    return el.value;
  }

  // podpina zapis zmian z edytora do obiektu S (wystarczy raz na panel)
  function bindEditor(panel, S) {
    const onEdit = e => {
      const t = e.target;
      if (!t.dataset || !t.dataset.sec || !S[t.dataset.sec]) return;
      const s = S[t.dataset.sec];
      if ('on' in t.dataset) {
        s.on = t.checked;
        const box = t.closest('.tcm-set');
        if (box) box.style.opacity = s.on ? '1' : '0.6';
      } else {
        const f = FIELD[t.dataset.sec + '.' + t.dataset.fld];
        if (!f) return;
        s.values[f.name] = readInput(f, t);
      }
      save(S);
    };
    panel.addEventListener('input', onEdit);
    panel.addEventListener('change', onEdit);

    // lista budynków: ▲ ▼ ✕ i Dodaj
    panel.addEventListener('click', e => {
      const b = e.target.closest('[data-bact]');
      if (!b) return;
      const box = b.closest('.tcm-bld');
      const sec = box && S[box.dataset.sec];
      const f = box && FIELD[box.dataset.sec + '.' + box.dataset.fld];
      if (!sec || !f) return;

      const list = sec.values[f.name].slice();
      const act = b.dataset.bact;
      const i = parseInt(b.dataset.i, 10);
      if (act === 'add') {
        const sel = box.querySelector('[data-badd]');
        if (sel && sel.value) list.push(sel.value);
      } else if (act === 'del') {
        if (list.length <= 1) return;                       // planer wymaga min. jednego budynku
        list.splice(i, 1);
      } else if (act === 'up' && i > 0) {
        [list[i - 1], list[i]] = [list[i], list[i - 1]];
      } else if (act === 'down' && i < list.length - 1) {
        [list[i + 1], list[i]] = [list[i], list[i + 1]];
      }
      sec.values[f.name] = list;
      save(S);
      box.outerHTML = buildingsHtml(box.dataset.sec ? { id: box.dataset.sec } : null, f, list);
    });
  }

  TCM.m.settings = { BUILDINGS, SECTIONS, FIELD, load, save, editorHtml, bindEditor };
})(TCM);
