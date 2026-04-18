/**
 * simulateur_requalification.js
 * -----------------------------
 * Feature 4 - Simulateur de requalification fiscale d'une parcelle.
 *
 * Cas d'usage Mme Aly : clic sur une "dent creuse" en zone U PLU
 *  -> simulation des recettes futures si construction R+2 / collectif / commerce
 *
 * Methode :
 *  - Surface plancher x ratio constructibilite
 *  - VL nouvelle = surface plancher x prix_loyer_m2_an_DOM (cf. valeurs locatives 1970 actualisees)
 *  - TFB = VL * 0.5 * taux communal
 *  - Comparaison avec recettes actuelles (souvent 0 si non batie)
 *
 * Auteur : Karukera Conseil Immobilier (KCI) - Dereck Rauzduel
 * Email officiel : contact@karukera-conseil.com
 * Date : 2026-04-17
 */
(function (global) {
  'use strict';

  /**
   * Scenarios pre-definis. Les valeurs locatives au m2 sont des estimations
   * coherentes avec les bareme DGFIP DOM (categories 1 a 8 art. 1496 CGI).
   * Source : Code general des impots + bareme actualise revisions sectorielles.
   */
  const SCENARIOS = {
    maison_individuelle_100m2: {
      libelle: 'Maison individuelle 100 m2',
      surface_plancher_m2: 100,
      vl_au_m2_eur: 38,       // categorie 4-5 standard DOM
      cfe_associee: false,
      cout_construction_eur_m2: 1700,
      duree_construction_mois: 14,
      icone: 'M'
    },
    collectif_r2_4logements: {
      libelle: 'Collectif R+2 - 4 logements',
      surface_plancher_m2: 320,
      vl_au_m2_eur: 35,
      cfe_associee: false,
      cout_construction_eur_m2: 1900,
      duree_construction_mois: 22,
      icone: 'C'
    },
    commerce_200m2: {
      libelle: 'Local commercial 200 m2',
      surface_plancher_m2: 200,
      vl_au_m2_eur: 95,       // commercial bien plus cher
      cfe_associee: true,
      cout_construction_eur_m2: 1600,
      duree_construction_mois: 12,
      icone: 'B'
    }
  };

  /**
   * Calcule la simulation pour une parcelle + un scenario donne.
   * @param {object} parcelle - { reference, surface_m2, batie }
   * @param {string} scenarioKey - cle de SCENARIOS
   * @param {object} dataset - petitbourg_recettes.json
   * @param {object} sectionData - bloc section
   * @returns {object} { fiscalite_actuelle, fiscalite_apres, gain_annuel, ... }
   */
  function simulate(parcelle, scenarioKey, dataset, sectionData) {
    const sc = SCENARIOS[scenarioKey];
    if (!sc) return { erreur: 'scenario inconnu' };
    if (!dataset || !sectionData) return { erreur: 'dataset DGFIP manquant' };

    const tauxTFB = dataset.taux_communaux_2023.tfb_taux_communal;
    const tauxTFNB = dataset.taux_communaux_2023.tfnb_taux_communal;
    const tauxCFE = dataset.taux_communaux_2023.cfe_taux_communal;

    // ─── Fiscalite actuelle (parcelle non batie) ────────────────────
    let tfbActuelle = 0;
    let tfnbActuelle = 0;
    if (parcelle.batie === false) {
      // Seule la TFNB s'applique
      const vlTFNB = Math.round(sectionData.valeur_locative_cadastrale_moyenne_eur / 8);
      tfnbActuelle = Math.round(vlTFNB * 0.8 * tauxTFNB / 100);
    } else {
      // Bati existant : on prend l'estimation standard
      tfbActuelle = Math.round(sectionData.valeur_locative_cadastrale_moyenne_eur * 0.5 * tauxTFB / 100);
    }

    // ─── Fiscalite apres requalification ────────────────────────────
    const vlNouvelle = sc.surface_plancher_m2 * sc.vl_au_m2_eur;
    const tfbApres = Math.round(vlNouvelle * 0.5 * tauxTFB / 100);
    const cfeApres = sc.cfe_associee
      ? Math.round(vlNouvelle * 0.6 * tauxCFE / 100)
      : 0;

    // Exoneration TFB 2 ans pour construction neuve (art. 1383 CGI), puis taux plein
    // On retient pour DOB l'apport en regime de croisiere (an 3+)
    const totalActuel = tfbActuelle + tfnbActuelle;
    const totalApres = tfbApres + cfeApres;
    const gain = totalApres - totalActuel;

    // Cout construction estime (info contextuelle)
    const coutTotalConstruction = sc.surface_plancher_m2 * sc.cout_construction_eur_m2;
    // Retour sur investissement pour la commune (annees pour amortir l'urbanisation)
    // Hypothese : taxe amenagement a percu en 1 fois = 5% cout construction
    const taxeAmenagement = Math.round(coutTotalConstruction * 0.05);
    const roiCommuneAnnees = gain > 0 ? Math.round((coutTotalConstruction * 0.02) / gain) : null;

    return {
      scenario: {
        cle: scenarioKey,
        libelle: sc.libelle,
        surface_plancher_m2: sc.surface_plancher_m2,
        cout_construction_eur: coutTotalConstruction,
        duree_construction_mois: sc.duree_construction_mois,
        icone: sc.icone
      },
      fiscalite_actuelle: {
        tfb_eur: tfbActuelle,
        tfnb_eur: tfnbActuelle,
        cfe_eur: 0,
        total_annuel_eur: totalActuel
      },
      fiscalite_apres_regime_croisiere: {
        tfb_eur: tfbApres,
        tfnb_eur: 0,
        cfe_eur: cfeApres,
        total_annuel_eur: totalApres,
        note: 'Exoneration TFB de 2 ans applicable aux constructions neuves (art. 1383 CGI). Valeurs ci-dessus = an 3+.'
      },
      gain_annuel_eur: gain,
      apport_unique: {
        taxe_amenagement_eur: taxeAmenagement,
        note: 'Estimation taxe amenagement (~5% cout construction). Recette unique a la DAU.'
      },
      roi_commune_annees: roiCommuneAnnees,
      methodologie: 'VL nouvelle = surface plancher x VL/m2 categorie ' + (sc.cfe_associee ? 'commerciale' : 'habitation') + '. Calcul TFB = VL * 0.5 * taux communal.',
      sources: dataset._meta && dataset._meta.sources ? dataset._meta.sources : [],
      disclaimer: 'Estimation indicative. Le PLU local peut imposer des contraintes (gabarit, recul, hauteur) reduisant la surface plancher reelle.'
    };
  }

  /**
   * Lance les 3 scenarios standards et retourne un comparatif.
   */
  function simulateAll(parcelle, dataset, sectionData) {
    return Object.keys(SCENARIOS).map(k => simulate(parcelle, k, dataset, sectionData));
  }

  /**
   * Construit le HTML d'une popup "Et si on requalifiait ?" avec 3 cartes scenarios.
   */
  function buildPopupHTML(parcelle, simulations) {
    function fmtEur(n) {
      if (n === null || n === undefined || isNaN(n)) return '—';
      if (Math.abs(n) >= 1000000) return (n / 1000000).toFixed(2) + ' M EUR';
      if (Math.abs(n) >= 1000) return (n / 1000).toFixed(1) + ' k EUR';
      return Math.round(n) + ' EUR';
    }
    function escapeHtml(s) {
      return String(s || '').replace(/[&<>"']/g, c => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
      }[c]));
    }

    const cards = simulations.map(sim => {
      if (sim.erreur) return '';
      const gainColor = sim.gain_annuel_eur > 5000 ? '#2ecc71' : sim.gain_annuel_eur > 1000 ? '#d4af37' : '#888';
      return `
        <div class="kci-sim-card">
          <div class="kci-sim-card-head">
            <span class="kci-sim-icon">${escapeHtml(sim.scenario.icone)}</span>
            <span class="kci-sim-title">${escapeHtml(sim.scenario.libelle)}</span>
          </div>
          <div class="kci-sim-row"><span>Surface plancher</span><span>${sim.scenario.surface_plancher_m2} m2</span></div>
          <div class="kci-sim-row"><span>Cout construction</span><span>${fmtEur(sim.scenario.cout_construction_eur)}</span></div>
          <div class="kci-sim-row"><span>TFB actuelle</span><span>${fmtEur(sim.fiscalite_actuelle.total_annuel_eur)}/an</span></div>
          <div class="kci-sim-row kci-sim-row-after"><span>TFB apres</span><span>${fmtEur(sim.fiscalite_apres_regime_croisiere.total_annuel_eur)}/an</span></div>
          <div class="kci-sim-gain" style="color:${gainColor}">+${fmtEur(sim.gain_annuel_eur)} / an</div>
          <div class="kci-sim-extra">+ ${fmtEur(sim.apport_unique.taxe_amenagement_eur)} taxe amenagement (1 fois)</div>
        </div>
      `;
    }).join('');

    const styles = `
      <style id="kci-sim-styles">
        .kci-sim-cards{display:flex;flex-direction:column;gap:8px;margin-top:8px}
        .kci-sim-card{padding:10px;background:rgba(255,255,255,0.03);border:1px solid rgba(212,175,55,0.12);border-radius:6px;font-size:11px}
        .kci-sim-card-head{display:flex;align-items:center;gap:8px;margin-bottom:6px;padding-bottom:6px;border-bottom:1px solid rgba(255,255,255,0.05)}
        .kci-sim-icon{display:inline-block;width:22px;height:22px;line-height:22px;text-align:center;border-radius:50%;background:rgba(212,175,55,0.18);color:#d4af37;font-weight:700;font-size:11px}
        .kci-sim-title{font-weight:600;color:#e0e0e0}
        .kci-sim-row{display:flex;justify-content:space-between;font-size:10px;color:#999;padding:2px 0}
        .kci-sim-row span:first-child{color:#666}
        .kci-sim-row-after span:last-child{color:#d4af37;font-weight:600}
        .kci-sim-gain{font-family:'Playfair Display',serif;font-size:14px;font-weight:700;text-align:center;margin-top:6px;padding-top:6px;border-top:1px dashed rgba(255,255,255,0.05)}
        .kci-sim-extra{font-size:9px;color:#666;text-align:center;margin-top:2px}
      </style>
    `;

    const stylesNeeded = (typeof document !== 'undefined' && document.getElementById('kci-sim-styles')) ? '' : styles;
    return `
      ${stylesNeeded}
      <div class="popup-title">Et si on requalifiait cette parcelle ?</div>
      <div class="popup-badge" style="background:#3498db">3 scenarios PLU U</div>
      <p style="font-size:10px;color:#888;margin-bottom:6px">Parcelle ${escapeHtml(parcelle.reference || '?')} ${parcelle.surface_m2 ? '(' + parcelle.surface_m2 + ' m2)' : ''}</p>
      <div class="kci-sim-cards">${cards}</div>
      <p style="font-size:9px;color:#555;margin-top:8px;line-height:1.4">
        ${simulations[0] && simulations[0].disclaimer ? escapeHtml(simulations[0].disclaimer) : ''}
        <br><strong>Source :</strong> KCI - calcul DGFIP open data.
      </p>
    `;
  }

  const api = {
    SCENARIOS,
    simulate,
    simulateAll,
    buildPopupHTML
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  } else {
    global.kciFiscalSimRequalif = api;
  }
})(typeof window !== 'undefined' ? window : globalThis);
