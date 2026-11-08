/* planer-ui.js | wspólny wygląd (styl jak BOB: ciemny, neonowa zieleń), przyciski, okna, status */
(function (TCM) {
  'use strict';

  const { GM_getValue, GM_setValue } = TCM;

  const CSS = `
    :root{
      --bg-main:#36393f;--bg-row-alt:#32353b;--bg-header:#202225;--border-color:#3e4147;
      --text-color:white;--title-color:#ffffdf;--neon-green:#74ff00;
      --neon-glow:0 0 8px rgba(116,255,0,.6),0 0 15px rgba(116,255,0,.4);
      --btn-bg:linear-gradient(to bottom,#6e7178 0%,#36393f 30%,#202225 80%,black 100%);
      --btn-bg-hover:linear-gradient(to bottom,#7b7e85 0%,#40444a 30%,#393c40 80%,#171717 100%);
      --btn-green:linear-gradient(to bottom,#5cad5c 0%,#2e7a2e 30%,#1f5c1f 80%,#0f2e0f 100%);
      --btn-green-hover:linear-gradient(to bottom,#6bbf6b 0%,#388c38 30%,#267326 80%,#143d14 100%);
      --btn-red:linear-gradient(to bottom,#ad5c5c 0%,#7a2e2e 30%,#5c1f1f 80%,#2e0f0f 100%);
      --btn-red-hover:linear-gradient(to bottom,#bf6b6b 0%,#8c3838 30%,#732626 80%,#3d1414 100%);
      --btn-blue:linear-gradient(to bottom,#5c8cad 0%,#2e5c7a 30%,#1f425c 80%,#0f222e 100%);
      --btn-blue-hover:linear-gradient(to bottom,#6ba3bf 0%,#38738c 30%,#265473 80%,#142e3d 100%);
    }
    .tcm-box{background:var(--bg-main);color:var(--text-color);border:1px solid var(--border-color);
      border-radius:4px;padding:8px;font:12px sans-serif;box-sizing:border-box;
      -webkit-tap-highlight-color:transparent;text-align:left;}
    .tcm-box h4{color:var(--title-color);font-size:13px;text-align:center;margin:0 0 6px;}
    .tcm-box *{box-sizing:border-box;}
    .tcm-btn{background:var(--btn-bg)!important;color:#fff;border:1px solid var(--border-color);
      padding:5px 8px;border-radius:3px;font:bold 12px sans-serif;margin:2px 1px;display:inline-block;
      cursor:pointer;box-shadow:0 4px 12px rgba(0,0,0,.8);transition:.2s;min-height:32px;outline:none;
      text-shadow:1px 1px 2px rgba(0,0,0,.8);-webkit-tap-highlight-color:transparent;}
    .tcm-btn:hover{background:var(--btn-bg-hover)!important;}
    .tcm-btn-green{background:var(--btn-green)!important;}
    .tcm-btn-green:hover{background:var(--btn-green-hover)!important;}
    .tcm-btn-red{background:var(--btn-red)!important;border-color:#ff003c;}
    .tcm-btn-red:hover{background:var(--btn-red-hover)!important;}
    .tcm-btn-blue{background:var(--btn-blue)!important;}
    .tcm-btn-blue:hover{background:var(--btn-blue-hover)!important;}
    .tcm-btn-active{border-color:var(--neon-green);color:var(--neon-green);text-shadow:var(--neon-glow);
      box-shadow:inset 0 0 5px rgba(116,255,0,.3);}
    .tcm-btn[disabled]{opacity:.5;}
    .tcm-box input,.tcm-box select,.tcm-box textarea{background:var(--bg-row-alt);color:#fff;
      border:1px solid var(--border-color);border-radius:3px;font-size:12px;padding:3px;}
    .tcm-box textarea{font-family:monospace;width:100%;}
    .tcm-box input.tcm-n{width:56px;min-height:30px;}
    .tcm-box table{border-collapse:collapse;width:100%;margin:6px 0;}
    .tcm-box th{background:var(--bg-header);color:var(--title-color);border:1px solid var(--border-color);
      padding:2px 4px;font-size:11px;}
    .tcm-box td{border:1px solid var(--border-color);padding:2px 4px;text-align:center;vertical-align:middle;}
    .tcm-box tbody:nth-of-type(even){background:var(--bg-row-alt);}
    .tcm-box a{color:#8fd3ff;}
    .tcm-bar{display:flex;flex-wrap:wrap;gap:6px;margin:6px 0;align-items:center;}
    .tcm-head{cursor:pointer;font-weight:bold;color:var(--title-color);padding:6px 2px;}
    .tcm-box label{display:inline-flex;align-items:center;gap:4px;}
    .tcm-warn{color:#ff9800;margin:4px 0;}
    .tcm-ok{color:var(--neon-green);}
    .tcm-err{color:#ff003c;}
    .tcm-modal{position:fixed;top:40px;left:50%;transform:translateX(-50%);width:min(840px,97vw);
      max-height:88vh;overflow:auto;z-index:100000;display:none;box-shadow:4px 4px 12px rgba(0,0,0,.8);}
    .tcm-modal.tcm-open{display:block;}
    .tcm-bar-fixed{position:fixed;top:4px;right:4px;z-index:99999;display:flex;gap:2px;padding:3px;}
    #tcm-pl-panel{margin:0 0 14px 0;}
  `;

  function injectStyle() {
    if (document.getElementById('tcm-style')) return;
    const s = document.createElement('style');
    s.id = 'tcm-style';
    s.textContent = CSS;
    document.head.appendChild(s);
  }

  // przycisk: ui.button('Tekst', onClick, 'tcm-btn-green')
  function button(text, onClick, extra) {
    const b = document.createElement('button');
    b.className = 'tcm-btn' + (extra ? ' ' + extra : '');
    b.textContent = text;
    if (onClick) b.onclick = onClick;
    return b;
  }

  // okno z tytułem i przyciskiem Zamknij
  function dialog(title, nodes) {
    injectStyle();
    const old = document.getElementById('tcm-dialog');
    if (old) old.remove();
    const box = document.createElement('div');
    box.id = 'tcm-dialog';
    box.className = 'tcm-box tcm-modal tcm-open';
    const h = document.createElement('h4');
    h.textContent = title;
    box.append(h, ...nodes, button('Zamknij', () => box.remove(), 'tcm-btn-red'));
    document.body.appendChild(box);
    return box;
  }

  // błąd w grze: komunikat z gry, a gdy go nie ma, alert
  function gameError(e) {
    const UI = TCM.unsafeWindow.UI;
    if (UI && UI.ErrorMessage) UI.ErrorMessage(String(e), 4000);
    else alert(e);
  }

  // linia statusu w panelu: say('tekst') nadpisuje, say('tekst', true) dopisuje
  function makeSay(panel) {
    return (t, append) => {
      const el = panel.querySelector('#tcm-status');
      if (el) el.innerHTML = append ? el.innerHTML + t + '<br>' : t;
    };
  }

  // panel na stronie planera: nagłówek zwija i rozwija treść (pamięta wybór)
  const panelOpen = () => GM_getValue('panelOpen', true);

  function bindFold(panel) {
    panel.addEventListener('click', e => {
      if (!e.target.closest('[data-act=fold]')) return;
      const body = panel.querySelector('.tcm-body');
      const open = body.style.display === 'none';
      body.style.display = open ? '' : 'none';
      GM_setValue('panelOpen', open);
    });
  }

  // wstawia nowy panel na początek wskazanego miejsca strony planera
  function mountPanel(selectors) {
    injectStyle();
    const host = selectors.map(s => document.querySelector(s)).find(Boolean) || document.body;
    const panel = document.createElement('div');
    panel.id = 'tcm-pl-panel';
    panel.className = 'tcm-box';
    host.prepend(panel);
    return panel;
  }

  TCM.m.ui = { injectStyle, button, dialog, gameError, makeSay, panelOpen, bindFold, mountPanel };
})(TCM);
