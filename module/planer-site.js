/* planer-site.js | PLANER: wejście, wybiera moduł po adresie strony */
(function (TCM) {
  'use strict';

  async function init() {
    const m = location.pathname.match(/\/planer\/(\d+)/);
    if (!m) return;
    const id = m[1];
    TCM.GM_setValue('lastPlanId', id);

    const path = location.pathname.replace(/\/+$/, '');
    if (path.endsWith('/planer/' + id)) {
      // krok 1: Dane o wojsku
      await TCM.need('planer-site-troops.js');
      TCM.m.siteTroops.init(id);
    } else if (path.endsWith('/planer-form')) {
      // krok 2: Planer (cele, fejki, burzaki)
      await TCM.need('planer-site-targets.js');
      TCM.m.siteTargets.init(id);
    }
  }

  TCM.m.site = { init };
})(TCM);
