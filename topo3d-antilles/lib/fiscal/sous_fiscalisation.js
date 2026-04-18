/**
 * sous_fiscalisation.js
 * ---------------------
 * Feature 3 - Detection des parcelles SOUS-FISCALISEES.
 *
 * Logique : la valeur locative cadastrale (VLC) sert de base au calcul TFB.
 * En France la revision generale date de 1970, derniers complements 1980.
 * Toutes les parcelles dont la VL n'a pas ete actualisee depuis ont une VL
 * tres inferieure a la valeur de marche actuelle (DVF).
 *
 * Methode :
 *  - Pour chaque parcelle, on compare la VL_cadastrale_estimee a la VL_marche_DVF
 *    (loyer cadastral theorique = 5% de la valeur venale, regle indicative DGFIP)
 *  - Ecart > 30%  = SOUS-FISCALISATION MODEREE   (orange)
 *  - Ecart > 60%  = SOUS-FISCALISATION FORTE     (rouge clair)
 *  - Ecart > 100% = SOUS-FISCALISATION CRITIQUE  (rouge fonce)
 *
 * Sortie : couleurs MapLibre + estimation des recettes manquees commune.
 *
 * Auteur : Karukera Conseil Immobilier (KCI) - Dereck Rauzduel
 * Email officiel : contact@karukera-conseil.com
 * Date : 2026-04-17
 */
(function (global) {
  'use strict';

  const KCI_SF_CONFIG = {
    seuil_modere: 30,    // % d'ecart minimum
    seuil_fort: 60,
    seuil_critique: 100,
    couleurs: {
      conforme: '#2ecc71',
      modere: '#f39c12',
      fort: '#e67e22',
      critique: '#c0392b'
    },
    // Loyer cadastral theorique = 5% valeur venale (regle DGFIP simplifiee art. 1498 CGI)
    ratio_loyer_valeur_venale: 0.05
  };

  /**
   * Calcule l'ecart de sous-fiscalisation pour une parcelle.
   * @param {object} parcelle - { reference, surface_m2, batie }
   * @param {object} sectionData - bloc section depuis petitbourg_recettes.json
   * @returns {object|null} { ecart_pct, niveau, couleur, vl_cadastrale_eur, vl_marche_eur, recettes_manquees_eur }
   */
  function evaluateParcelle(parcelle, sectionData) {
    if (!sectionData || !parcelle) return null;
    if (parcelle.batie === false) {
      return {
        ecart_pct: 0,
        niveau: 'non_applicable',
        couleur: '#888',
        raison: 'parcelle non batie - TFB non concernee'
      };
    }

    const vlCadastrale = sectionData.valeur_locative_cadastrale_moyenne_eur;
    const dvfM2 = sectionData.dvf_prix_median_m2_2023_eur;
    const surface = parcelle.surface_m2 || 400; // surface mediane DOM si inconnue
    // Hypothese : 30% du foncier est bati (typique parcellaire DOM)
    const surfaceBatie = surface * 0.3;
    const valeurVenale = surfaceBatie * dvfM2;
    const vlMarche = Math.round(valeurVenale * KCI_SF_CONFIG.ratio_loyer_valeur_venale);

    if (vlCadastrale <= 0 || vlMarche <= 0) return null;

    const ecart = ((vlMarche - vlCadastrale) / vlCadastrale) * 100;

    let niveau, couleur;
    if (ecart < KCI_SF_CONFIG.seuil_modere) {
      niveau = 'conforme';
      couleur = KCI_SF_CONFIG.couleurs.conforme;
    } else if (ecart < KCI_SF_CONFIG.seuil_fort) {
      niveau = 'modere';
      couleur = KCI_SF_CONFIG.couleurs.modere;
    } else if (ecart < KCI_SF_CONFIG.seuil_critique) {
      niveau = 'fort';
      couleur = KCI_SF_CONFIG.couleurs.fort;
    } else {
      niveau = 'critique';
      couleur = KCI_SF_CONFIG.couleurs.critique;
    }

    // Recettes manquees = (VL_marche - VL_cadastrale) * 0.5 * taux_TFB
    const recettesManquees = Math.max(0, Math.round((vlMarche - vlCadastrale) * 0.5 * 22.4 / 100));

    return {
      ecart_pct: Math.round(ecart),
      niveau,
      couleur,
      vl_cadastrale_eur: vlCadastrale,
      vl_marche_eur: vlMarche,
      recettes_manquees_eur: recettesManquees,
      methode: 'VL theorique = 5% valeur venale (DVF section x surface batie estimee 30%)',
      fiabilite: sectionData.fiabilite || 'MOYENNE'
    };
  }

  /**
   * Agrege la sous-fiscalisation a l'echelle commune.
   * @param {object} dataset - petitbourg_recettes.json
   * @returns {object} { par_section: [], totaux: {} }
   */
  function aggregateCommune(dataset) {
    if (!dataset || !dataset.sections_cadastrales) return null;

    const sections = dataset.sections_cadastrales;
    const parSection = [];
    let recettesManqueesTotal = 0;
    let nbParcellesSousFiscalisees = 0;

    Object.keys(sections).forEach(secKey => {
      // Filtre cles meta (commencent par _) ou sections sans donnees numeriques
      if (secKey.startsWith('_')) return;
      const sec = sections[secKey];
      if (!sec || typeof sec.valeur_locative_cadastrale_moyenne_eur !== 'number') return;
      // Estimation moyenne pour la section : on prend une parcelle "typique" 400m2
      const evalParcelle = evaluateParcelle(
        { surface_m2: 400, batie: true },
        sec
      );
      if (!evalParcelle || evalParcelle.niveau === 'non_applicable') return;

      const recettesManqueesSection = evalParcelle.recettes_manquees_eur * sec.nb_parcelles_baties;
      recettesManqueesTotal += recettesManqueesSection;
      if (evalParcelle.niveau !== 'conforme') {
        nbParcellesSousFiscalisees += sec.nb_parcelles_baties;
      }

      parSection.push({
        section: secKey,
        libelle: sec.libelle,
        niveau: evalParcelle.niveau,
        couleur: evalParcelle.couleur,
        ecart_pct: evalParcelle.ecart_pct,
        vl_cadastrale_eur: evalParcelle.vl_cadastrale_eur,
        vl_marche_eur: evalParcelle.vl_marche_eur,
        nb_parcelles_baties: sec.nb_parcelles_baties,
        recettes_manquees_section_eur: recettesManqueesSection
      });
    });

    parSection.sort((a, b) => b.recettes_manquees_section_eur - a.recettes_manquees_section_eur);

    return {
      par_section: parSection,
      totaux: {
        recettes_manquees_estimees_eur_par_an: recettesManqueesTotal,
        nb_parcelles_sous_fiscalisees: nbParcellesSousFiscalisees,
        nb_sections_critiques: parSection.filter(s => s.niveau === 'critique').length,
        nb_sections_fortes: parSection.filter(s => s.niveau === 'fort').length
      },
      methodologie: 'Comparaison VL cadastrale moyenne section vs VL theorique (5% valeur venale DVF). Hypothese surface batie = 30% parcelle. Estimation conservatrice.',
      sources: dataset._meta && dataset._meta.sources ? dataset._meta.sources : [],
      disclaimer: 'Estimation. La revision des VL est une procedure complexe (commission communale des impots directs - CCID) qui doit etre conduite avec la DGFIP. Le potentiel reel peut etre superieur ou inferieur.'
    };
  }

  /**
   * Genere les expressions MapLibre paint pour une couche cadastre, colorisee selon
   * le niveau de sous-fiscalisation. Utilise la propriete 'section' de la feature.
   * @param {object} aggregat - resultat de aggregateCommune()
   * @returns {object} { 'fill-color': [...], 'fill-opacity': 0.6 }
   */
  function buildMapLibrePaintExpr(aggregat) {
    if (!aggregat || !aggregat.par_section) return null;
    // ['match', ['get', 'section'], 'AB', '#c0392b', 'AC', '#f39c12', /* ... */, '#888']
    const expr = ['match', ['get', 'section']];
    aggregat.par_section.forEach(s => {
      expr.push(s.section, s.couleur);
    });
    expr.push('#888'); // fallback

    return {
      'fill-color': expr,
      'fill-opacity': 0.55,
      'fill-outline-color': '#070b14'
    };
  }

  /**
   * Construit le HTML d'un mini-panel "Recettes manquees" (composant compagnon).
   */
  function buildSummaryHTML(aggregat) {
    if (!aggregat) return '';
    const t = aggregat.totaux;
    const top5 = aggregat.par_section.slice(0, 5);

    function fmtEur(n) {
      if (Math.abs(n) >= 1000000) return (n / 1000000).toFixed(2) + ' M EUR';
      if (Math.abs(n) >= 1000) return (n / 1000).toFixed(0) + ' k EUR';
      return Math.round(n) + ' EUR';
    }

    function escapeHtml(s) {
      return String(s || '').replace(/[&<>"']/g, c => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
      }[c]));
    }

    const rows = top5.map(s => `
      <tr>
        <td>${escapeHtml(s.section)} <span style="color:#666">${escapeHtml(s.libelle)}</span></td>
        <td><span style="display:inline-block;padding:1px 6px;border-radius:3px;background:${s.couleur};color:#fff;font-size:9px;font-weight:700">+${s.ecart_pct}%</span></td>
        <td style="text-align:right;color:#e67e22;font-weight:600">${fmtEur(s.recettes_manquees_section_eur)}</td>
      </tr>
    `).join('');

    return `
      <div class="popup-title">Sous-fiscalisation — potentiel d'optimisation</div>
      <div class="popup-badge" style="background:#e67e22">${t.nb_parcelles_sous_fiscalisees} parcelles concernees</div>
      <div style="font-size:18px;font-family:'Playfair Display',serif;color:#e67e22;margin:8px 0;font-weight:700">
        ${fmtEur(t.recettes_manquees_estimees_eur_par_an)} / an
      </div>
      <div style="font-size:10px;color:#888;margin-bottom:10px">Recettes TFB potentielles non percues (estimation)</div>

      <table class="popup-table">
        <thead><tr><td colspan="3" style="font-size:9px;color:#666;text-transform:uppercase;letter-spacing:0.5px">Top 5 sections</td></tr></thead>
        ${rows}
      </table>

      <p style="font-size:9px;color:#666;margin-top:8px;line-height:1.4">
        ${escapeHtml(aggregat.disclaimer || '')}
      </p>
    `;
  }

  const api = {
    config: KCI_SF_CONFIG,
    evaluateParcelle,
    aggregateCommune,
    buildMapLibrePaintExpr,
    buildSummaryHTML
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  } else {
    global.kciFiscalSousFisc = api;
  }
})(typeof window !== 'undefined' ? window : globalThis);
