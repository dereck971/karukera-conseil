/**
 * dashboard_zone_plu.js
 * ---------------------
 * Feature 2 - Dashboard agrege des recettes fiscales par zone PLU (U / AU / A / N).
 * Panel HTML bottom-right avec barres horizontales (CSS pur, pas de dependance Chart.js).
 *
 * Auteur : Karukera Conseil Immobilier (KCI) - Dereck Rauzduel
 * Email officiel : contact@karukera-conseil.com
 * Date : 2026-04-17
 */
(function (global) {
  'use strict';

  const KCI_DASH_CONFIG = {
    data_url: '../../data/fiscal/dgfip/petitbourg_zones_plu_aggregat.json',
    panel_id: 'kci-fiscal-dashboard',
    toggle_id: 'kci-fiscal-dashboard-toggle'
  };

  const ZONE_COLORS = {
    U: '#d4af37',   // urbain - or
    AU: '#3498db',  // a urbaniser - bleu
    A: '#27ae60',   // agricole - vert
    N: '#16a085'    // naturel - vert sombre
  };

  let DASH_DATA = null;

  async function loadDashboardData(customUrl) {
    if (DASH_DATA) return DASH_DATA;
    try {
      const resp = await fetch(customUrl || KCI_DASH_CONFIG.data_url);
      if (!resp.ok) throw new Error('HTTP ' + resp.status);
      DASH_DATA = await resp.json();
      return DASH_DATA;
    } catch (e) {
      console.warn('[KCI dashboard] echec chargement : ' + e.message);
      return null;
    }
  }

  function fmtEur(n) {
    if (n === null || n === undefined || isNaN(n)) return '—';
    if (Math.abs(n) >= 1000000) return (n / 1000000).toFixed(2) + ' M EUR';
    if (Math.abs(n) >= 1000) return (n / 1000).toFixed(0) + ' k EUR';
    return Math.round(n) + ' EUR';
  }

  function escapeHtml(s) {
    if (s === null || s === undefined) return '';
    return String(s).replace(/[&<>"']/g, c => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
  }

  /**
   * Genere les agregats par zone PLU. Si data fournie sinon utilise dataset cache.
   * @returns {Array} [{ zone, libelle, color, tfb, tfnb, cfe, total, parcelles, etablissements }]
   */
  function aggregateByZone(data) {
    const ds = data || DASH_DATA;
    if (!ds || !ds.zones) return [];

    return Object.keys(ds.zones).map(zoneKey => {
      const z = ds.zones[zoneKey];
      const total = (z.tfb_estimee_eur || 0) + (z.tfnb_estimee_eur || 0) + (z.cfe_estimee_eur || 0);
      return {
        zone: zoneKey,
        libelle: z.libelle,
        color: ZONE_COLORS[zoneKey] || '#888',
        tfb: z.tfb_estimee_eur || 0,
        tfnb: z.tfnb_estimee_eur || 0,
        cfe: z.cfe_estimee_eur || 0,
        total: total,
        parcelles: z.nb_parcelles || 0,
        baties: z.nb_parcelles_baties || 0,
        non_baties: z.nb_parcelles_non_baties || 0,
        etablissements: z.nb_etablissements_cfe || 0,
        potentiel: z.potentiel_densification_estime_eur || 0,
        sections: z.sections_principales || []
      };
    }).sort((a, b) => b.total - a.total);
  }

  /**
   * Construit le panel HTML. Style coherent avec la charte navy + or.
   */
  function buildDashboardHTML(data) {
    const ds = data || DASH_DATA;
    if (!ds) {
      return `<div style="padding:16px;color:#e74c3c;font-size:11px">Donnees fiscales indisponibles. Voir contact@karukera-conseil.com</div>`;
    }

    const aggs = aggregateByZone(ds);
    const totalCommune = aggs.reduce((acc, a) => acc + a.total, 0);
    const maxZoneTotal = Math.max.apply(null, aggs.map(a => a.total));

    const synth = ds.synthese_par_zone || {};
    const ecart = synth._ecart_avec_reel || {};

    const rows = aggs.map(a => {
      const pct = maxZoneTotal > 0 ? (a.total / maxZoneTotal * 100) : 0;
      return `
        <div class="kci-dash-zone">
          <div class="kci-dash-zone-head">
            <span class="kci-dash-zone-tag" style="background:${a.color}">${escapeHtml(a.zone)}</span>
            <span class="kci-dash-zone-name">${escapeHtml(a.libelle)}</span>
            <span class="kci-dash-zone-total">${fmtEur(a.total)}</span>
          </div>
          <div class="kci-dash-zone-bar">
            <div class="kci-dash-zone-fill" style="width:${pct.toFixed(1)}%;background:${a.color}"></div>
          </div>
          <div class="kci-dash-zone-detail">
            <span title="Taxe Fonciere sur le Bati">TFB ${fmtEur(a.tfb)}</span>
            <span title="Taxe Fonciere sur le Non Bati">TFNB ${fmtEur(a.tfnb)}</span>
            <span title="Cotisation Fonciere des Entreprises">CFE ${fmtEur(a.cfe)}</span>
            <span>${a.parcelles} parc.</span>
            <span>${a.etablissements} etab.</span>
          </div>
        </div>
      `;
    }).join('');

    return `
      <div class="kci-dash-header">
        <div>
          <h3>Recettes fiscales par zone PLU</h3>
          <p>Petit-Bourg — Estimation DGFIP open data ${escapeHtml(String(ds._meta.date_extraction || '').slice(0,4))}</p>
        </div>
        <button id="${KCI_DASH_CONFIG.toggle_id}-close" class="kci-dash-close" aria-label="Fermer">x</button>
      </div>

      <div class="kci-dash-total">
        <div class="kci-dash-total-value">${fmtEur(totalCommune)}</div>
        <div class="kci-dash-total-label">Total estime open data (annuel)</div>
        ${ecart.tfb_reel_2023_eur ? `
          <div class="kci-dash-total-real">
            Reel 2023 (DGCL) : <strong>${fmtEur(ecart.tfb_reel_2023_eur)}</strong> TFB
            <em>(couverture estim. ${escapeHtml(ecart.ratio_couverture_estimation || '')})</em>
          </div>
        ` : ''}
      </div>

      <div class="kci-dash-zones">${rows}</div>

      <div class="kci-dash-potentiel">
        <div class="kci-dash-pot-label">Potentiel densification commune (estime)</div>
        <div class="kci-dash-pot-value">${fmtEur(synth.total_potentiel_densification_eur || 0)}</div>
        <div class="kci-dash-pot-note">Si activation des dents creuses U + 1AU sur 5 ans</div>
      </div>

      <div class="kci-dash-footer">
        <a href="#" id="kci-dash-sources">Sources & methodologie</a>
        <span>KCI - contact@karukera-conseil.com</span>
      </div>
    `;
  }

  /**
   * Injecte les styles CSS du dashboard une seule fois.
   */
  function injectStyles() {
    if (document.getElementById('kci-fiscal-dashboard-styles')) return;
    const css = `
      #${KCI_DASH_CONFIG.panel_id}{position:fixed;bottom:24px;right:24px;width:380px;max-height:70vh;background:rgba(7,11,20,0.94);backdrop-filter:blur(24px);border:1px solid rgba(212,175,55,0.18);border-radius:12px;color:#e0e0e0;font-family:'Montserrat',system-ui,sans-serif;z-index:998;overflow-y:auto;box-shadow:0 8px 32px rgba(0,0,0,0.5);transition:transform .25s ease, opacity .25s ease}
      #${KCI_DASH_CONFIG.panel_id}.hidden{transform:translateY(20px);opacity:0;pointer-events:none}
      #${KCI_DASH_CONFIG.panel_id} .kci-dash-header{display:flex;justify-content:space-between;align-items:flex-start;padding:14px 16px;border-bottom:1px solid rgba(212,175,55,0.1)}
      #${KCI_DASH_CONFIG.panel_id} .kci-dash-header h3{font-family:'Playfair Display',serif;font-size:14px;color:#d4af37;font-weight:700;margin:0}
      #${KCI_DASH_CONFIG.panel_id} .kci-dash-header p{font-size:10px;color:#777;margin-top:2px}
      #${KCI_DASH_CONFIG.panel_id} .kci-dash-close{background:none;border:none;color:#888;font-size:16px;cursor:pointer;padding:0 4px}
      #${KCI_DASH_CONFIG.panel_id} .kci-dash-close:hover{color:#d4af37}
      #${KCI_DASH_CONFIG.panel_id} .kci-dash-total{padding:14px 16px;text-align:center;border-bottom:1px solid rgba(255,255,255,0.04)}
      #${KCI_DASH_CONFIG.panel_id} .kci-dash-total-value{font-family:'Playfair Display',serif;font-size:24px;color:#d4af37;font-weight:700;font-variant-numeric:tabular-nums}
      #${KCI_DASH_CONFIG.panel_id} .kci-dash-total-label{font-size:10px;color:#888;margin-top:2px}
      #${KCI_DASH_CONFIG.panel_id} .kci-dash-total-real{font-size:10px;color:#999;margin-top:6px;padding-top:6px;border-top:1px solid rgba(255,255,255,0.04)}
      #${KCI_DASH_CONFIG.panel_id} .kci-dash-total-real strong{color:#2ecc71}
      #${KCI_DASH_CONFIG.panel_id} .kci-dash-total-real em{color:#666;font-style:normal;font-size:9px;margin-left:4px}
      #${KCI_DASH_CONFIG.panel_id} .kci-dash-zones{padding:8px 16px}
      #${KCI_DASH_CONFIG.panel_id} .kci-dash-zone{padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.04)}
      #${KCI_DASH_CONFIG.panel_id} .kci-dash-zone:last-child{border-bottom:none}
      #${KCI_DASH_CONFIG.panel_id} .kci-dash-zone-head{display:flex;align-items:center;gap:6px;margin-bottom:5px}
      #${KCI_DASH_CONFIG.panel_id} .kci-dash-zone-tag{display:inline-block;padding:1px 6px;border-radius:3px;font-size:9px;font-weight:700;color:#fff;letter-spacing:0.5px;flex-shrink:0}
      #${KCI_DASH_CONFIG.panel_id} .kci-dash-zone-name{flex:1;font-size:11px;color:#bbb;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
      #${KCI_DASH_CONFIG.panel_id} .kci-dash-zone-total{font-size:11px;color:#fff;font-weight:600;font-variant-numeric:tabular-nums;flex-shrink:0}
      #${KCI_DASH_CONFIG.panel_id} .kci-dash-zone-bar{height:4px;background:rgba(255,255,255,0.04);border-radius:2px;overflow:hidden;margin-bottom:4px}
      #${KCI_DASH_CONFIG.panel_id} .kci-dash-zone-fill{height:100%;border-radius:2px;transition:width .6s ease}
      #${KCI_DASH_CONFIG.panel_id} .kci-dash-zone-detail{display:flex;flex-wrap:wrap;gap:6px;font-size:9px;color:#666}
      #${KCI_DASH_CONFIG.panel_id} .kci-dash-zone-detail span{padding:1px 4px;background:rgba(255,255,255,0.02);border-radius:3px}
      #${KCI_DASH_CONFIG.panel_id} .kci-dash-potentiel{padding:12px 16px;background:rgba(46,204,113,0.05);border-top:1px solid rgba(46,204,113,0.1);border-bottom:1px solid rgba(255,255,255,0.04)}
      #${KCI_DASH_CONFIG.panel_id} .kci-dash-pot-label{font-size:10px;color:#888;text-transform:uppercase;letter-spacing:0.5px}
      #${KCI_DASH_CONFIG.panel_id} .kci-dash-pot-value{font-family:'Playfair Display',serif;font-size:18px;color:#2ecc71;font-weight:700;margin-top:2px}
      #${KCI_DASH_CONFIG.panel_id} .kci-dash-pot-note{font-size:9px;color:#666;margin-top:2px}
      #${KCI_DASH_CONFIG.panel_id} .kci-dash-footer{display:flex;justify-content:space-between;align-items:center;padding:10px 16px;font-size:9px;color:#555}
      #${KCI_DASH_CONFIG.panel_id} .kci-dash-footer a{color:#d4af37;text-decoration:none}
      #${KCI_DASH_CONFIG.panel_id} .kci-dash-footer a:hover{text-decoration:underline}
      #${KCI_DASH_CONFIG.toggle_id}{position:fixed;bottom:24px;right:24px;width:48px;height:48px;border-radius:50%;background:rgba(212,175,55,0.18);backdrop-filter:blur(12px);border:1px solid rgba(212,175,55,0.4);color:#d4af37;font-size:18px;cursor:pointer;z-index:997;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 16px rgba(0,0,0,0.3);transition:background .2s}
      #${KCI_DASH_CONFIG.toggle_id}:hover{background:rgba(212,175,55,0.3)}
      #${KCI_DASH_CONFIG.toggle_id}.hidden{display:none}
      @media(max-width:768px){
        #${KCI_DASH_CONFIG.panel_id}{width:calc(100% - 24px);right:12px;left:12px;bottom:12px;max-height:60vh}
        #${KCI_DASH_CONFIG.toggle_id}{bottom:12px;right:12px}
      }
    `;
    const style = document.createElement('style');
    style.id = 'kci-fiscal-dashboard-styles';
    style.textContent = css;
    document.head.appendChild(style);
  }

  /**
   * Initialise et monte le dashboard dans le DOM.
   * @param {object} opts - { autoOpen: bool, container: HTMLElement|null }
   */
  async function mount(opts) {
    opts = opts || {};
    injectStyles();

    const data = await loadDashboardData(opts.dataUrl);
    if (!data) {
      console.warn('[KCI dashboard] dataset non disponible - dashboard non monte');
      return null;
    }

    const container = opts.container || document.body;
    let panel = document.getElementById(KCI_DASH_CONFIG.panel_id);
    if (panel) panel.remove();
    let toggle = document.getElementById(KCI_DASH_CONFIG.toggle_id);
    if (toggle) toggle.remove();

    panel = document.createElement('div');
    panel.id = KCI_DASH_CONFIG.panel_id;
    panel.innerHTML = buildDashboardHTML(data);
    container.appendChild(panel);

    toggle = document.createElement('button');
    toggle.id = KCI_DASH_CONFIG.toggle_id;
    toggle.innerHTML = '€';
    toggle.title = 'Recettes fiscales par zone PLU';
    toggle.classList.add('hidden');
    container.appendChild(toggle);

    const closeBtn = panel.querySelector('.kci-dash-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        panel.classList.add('hidden');
        toggle.classList.remove('hidden');
      });
    }
    toggle.addEventListener('click', () => {
      panel.classList.remove('hidden');
      toggle.classList.add('hidden');
    });

    if (opts.autoOpen === false) {
      panel.classList.add('hidden');
      toggle.classList.remove('hidden');
    }

    return { panel, toggle, data };
  }

  const api = {
    config: KCI_DASH_CONFIG,
    loadDashboardData,
    aggregateByZone,
    buildDashboardHTML,
    injectStyles,
    mount
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  } else {
    global.kciFiscalDashboard = api;
  }
})(typeof window !== 'undefined' ? window : globalThis);
