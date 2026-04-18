/**
 * popup_recettes.js
 * -----------------
 * Composant popup MapLibre - affiche les recettes fiscales estimees
 * d'une parcelle au clic. Style coherent avec la charte KCI (navy + or).
 *
 * Usage :
 *   kciFiscalPopup.attach(map, { layerId: 'parcelles-cadastre' });
 *
 * Auteur : Karukera Conseil Immobilier (KCI) - Dereck Rauzduel
 * Email officiel : contact@karukera-conseil.com
 * Date : 2026-04-17
 */
(function (global) {
  'use strict';

  function escapeHtml(s) {
    if (s === null || s === undefined) return '';
    return String(s).replace(/[&<>"']/g, c => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
  }

  function fmtEur(n) {
    if (n === null || n === undefined || isNaN(n)) return '—';
    return Number(n).toLocaleString('fr-FR', { maximumFractionDigits: 0 }) + ' EUR';
  }

  function fiabiliteColor(f) {
    if (!f) return '#888';
    const v = String(f).toUpperCase();
    if (v.includes('FAIBLE')) return '#e67e22';
    if (v.includes('MOYENNE')) return '#d4af37';
    if (v.includes('CERTAINE') || v.includes('FORTE')) return '#2ecc71';
    return '#888';
  }

  function buildPopupHTML(estimation) {
    if (!estimation || estimation.erreur) {
      return `
        <div class="popup-title">Recettes fiscales</div>
        <p style="font-size:11px;color:#e74c3c">Donnees indisponibles. ${escapeHtml(estimation && estimation.erreur || '')}</p>
        <p style="font-size:10px;color:#666;margin-top:8px">Contactez ${escapeHtml(estimation && estimation.contact || 'contact@karukera-conseil.com')}</p>
      `;
    }

    const tfb = estimation.tfb || {};
    const tfnb = estimation.tfnb || {};
    const cfe = estimation.cfe || null;

    const fcolor = fiabiliteColor(tfb.fiabilite);

    return `
      <div class="popup-title">Recettes fiscales — Parcelle ${escapeHtml(estimation.parcelle_ref || '?')}</div>
      <div class="popup-badge" style="background:${fcolor}">${escapeHtml(tfb.fiabilite || 'ESTIMATION')}</div>

      <table class="popup-table" style="margin-bottom:8px">
        <tr><td>Section cadastrale</td><td>${escapeHtml(estimation.section || '?')}</td></tr>
        <tr><td>TFB estimee</td><td style="color:#d4af37;font-weight:700">${fmtEur(tfb.tfb_eur)}</td></tr>
        <tr><td>TFNB estimee</td><td>${fmtEur(tfnb.tfnb_eur)}</td></tr>
        ${cfe ? `<tr><td>CFE estimee</td><td>${fmtEur(cfe.cfe_eur)}</td></tr>` : ''}
        <tr style="border-top:2px solid rgba(212,175,55,0.3)">
          <td style="padding-top:6px"><strong>Total annuel</strong></td>
          <td style="padding-top:6px;color:#2ecc71;font-weight:700">${fmtEur(estimation.total_estime_eur)}</td>
        </tr>
      </table>

      <details style="margin-top:6px">
        <summary style="font-size:10px;color:#888;cursor:pointer">Methodologie & sources</summary>
        <div style="font-size:10px;color:#999;margin-top:6px;line-height:1.5">
          <p><strong>TFB :</strong> ${escapeHtml(tfb.methode || '—')}</p>
          <p><strong>VL estimee :</strong> ${fmtEur(tfb.vl_estimee_eur)} (taux ${escapeHtml(String(tfb.taux_applique || ''))}%)</p>
          <p style="margin-top:4px;color:#666">${escapeHtml(estimation.disclaimer_global || '')}</p>
        </div>
      </details>

      <p style="font-size:9px;color:#555;margin-top:8px;border-top:1px solid rgba(255,255,255,0.04);padding-top:6px">
        Source : DGFIP open data + estimation KCI. Donnees ${escapeHtml(estimation.annee || '')}.
        <br>Karukera Conseil Immobilier — contact@karukera-conseil.com
      </p>
    `;
  }

  /**
   * Attache le handler de popup sur une couche MapLibre.
   * @param {object} map - instance MapLibre GL JS
   * @param {object} opts - { layerId, getParcelleFromFeature, getEtablissementFromFeature }
   */
  function attach(map, opts) {
    if (!map || !opts || !opts.layerId) {
      console.warn('[KCI fiscal popup] map et opts.layerId requis');
      return;
    }
    const recettesApi = global.kciFiscalRecettes;
    if (!recettesApi) {
      console.warn('[KCI fiscal popup] kciFiscalRecettes non charge - popup desactive');
      return;
    }

    const layerId = opts.layerId;

    map.on('click', layerId, async (e) => {
      if (!e.features || !e.features.length) return;
      const feature = e.features[0];
      const parcelle = opts.getParcelleFromFeature
        ? opts.getParcelleFromFeature(feature)
        : {
            reference: feature.properties.reference || feature.properties.id || feature.properties.idu,
            surface_m2: feature.properties.contenance || feature.properties.surface_m2 || null,
            batie: feature.properties.batie !== false
          };
      const etablissement = opts.getEtablissementFromFeature
        ? opts.getEtablissementFromFeature(feature)
        : null;

      // Popup chargement
      const loadingPopup = new global.maplibregl.Popup({ offset: 10, maxWidth: '340px' })
        .setLngLat(e.lngLat)
        .setHTML('<div class="popup-title">Recettes fiscales</div><p style="font-size:11px;color:#888">Calcul en cours...</p>')
        .addTo(map);

      try {
        const estimation = await recettesApi.getRecettesParcelle(parcelle, etablissement);
        loadingPopup.setHTML(buildPopupHTML(estimation));
      } catch (err) {
        loadingPopup.setHTML(`<div class="popup-title">Recettes fiscales</div><p style="font-size:11px;color:#e74c3c">Erreur : ${escapeHtml(err.message)}</p>`);
      }
    });

    map.on('mouseenter', layerId, () => { map.getCanvas().style.cursor = 'pointer'; });
    map.on('mouseleave', layerId, () => { map.getCanvas().style.cursor = ''; });
  }

  const api = { attach, buildPopupHTML, escapeHtml, fmtEur };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  } else {
    global.kciFiscalPopup = api;
  }
})(typeof window !== 'undefined' ? window : globalThis);
