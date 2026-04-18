/**
 * recettes_parcelle.js
 * --------------------
 * Feature 1 - Estimation des recettes fiscales (TFB / TFNB / CFE) par parcelle
 * a partir de DGFIP open data : DVF + comptes individuels DGCL + taux DGFIP.
 *
 * Auteur : Karukera Conseil Immobilier (KCI) - Dereck Rauzduel
 * Email officiel : contact@karukera-conseil.com
 * Date : 2026-04-17
 *
 * Sources :
 *  - DVF        : https://files.data.gouv.fr/geo-dvf/latest/csv/2024/communes/97/97118.csv
 *  - DGCL       : https://www.data.gouv.fr/fr/datasets/comptes-individuels-des-communes-fichier-global-a-compter-de-2000/
 *  - Taux       : https://www.data.gouv.fr/fr/datasets/impots-locaux/
 *  - Cerema FF  : https://datafoncier.cerema.fr/
 *
 * Le module est volontairement transparent : chaque estimation cite la source
 * et le niveau de fiabilite. A confirmer par le dataset interne mairie (Mme Aly).
 */
(function (global) {
  'use strict';

  const KCI_FISCAL_CONFIG = {
    code_insee: '97118',
    commune: 'Petit-Bourg',
    annee_reference: 2023,
    contact_kci: 'contact@karukera-conseil.com',
    data_url: '../../data/fiscal/dgfip/petitbourg_recettes.json'
  };

  let RECETTES_DATA = null;

  /**
   * Charge le dataset DGFIP local (asynchrone, idempotent).
   */
  async function loadRecettesData(customUrl) {
    if (RECETTES_DATA) return RECETTES_DATA;
    const url = customUrl || KCI_FISCAL_CONFIG.data_url;
    try {
      const resp = await fetch(url);
      if (!resp.ok) throw new Error('HTTP ' + resp.status);
      RECETTES_DATA = await resp.json();
      return RECETTES_DATA;
    } catch (e) {
      console.warn('[KCI fiscal] Impossible de charger ' + url + ' : ' + e.message);
      return null;
    }
  }

  /**
   * Detecte la section cadastrale a partir de la reference parcellaire IGN/BDParcellaire.
   * Format attendu : "AB 123" ou "AB0123" ou un objet { section: 'AB', numero: '123' }.
   */
  function extractSection(parcelleRef) {
    if (!parcelleRef) return null;
    if (typeof parcelleRef === 'object' && parcelleRef.section) {
      return parcelleRef.section.toUpperCase();
    }
    const str = String(parcelleRef).trim().toUpperCase();
    const match = str.match(/^([A-Z]{1,2})/);
    return match ? match[1] : null;
  }

  /**
   * Estime la TFB d'une parcelle a partir de sa section + caracteristiques.
   * Methodologie :
   *   1. VL cadastrale moyenne section (DGFIP open data)
   *   2. Si bati present : VL = VL_moyenne * facteur_surface (si surface connue)
   *   3. TFB = VL * 0.5 (abattement standard) * taux_communal / 100
   *
   * Retourne { tfb_eur, vl_estimee_eur, methode, fiabilite, sources }.
   */
  function estimateTFB(parcelle, dataset) {
    const data = dataset || RECETTES_DATA;
    if (!data) return null;

    const section = extractSection(parcelle.reference || parcelle.id);
    if (!section || section.startsWith('_') || !data.sections_cadastrales[section] || typeof data.sections_cadastrales[section].valeur_locative_cadastrale_moyenne_eur !== 'number') {
      return {
        tfb_eur: null,
        vl_estimee_eur: null,
        methode: 'non disponible (section inconnue)',
        fiabilite: 'NULLE',
        disclaimer: 'Section ' + section + ' absente du dataset open data. Donnee a fournir par mairie.'
      };
    }

    const sec = data.sections_cadastrales[section];
    const taux = data.taux_communaux_2023.tfb_taux_communal;

    // Si parcelle non batie, TFB = 0 (mais TFNB peut s'appliquer cf. estimateTFNB)
    if (parcelle.batie === false) {
      return {
        tfb_eur: 0,
        vl_estimee_eur: 0,
        methode: 'parcelle non batie - TFB nulle',
        fiabilite: 'CERTAINE',
        sources: data._meta.sources.filter(s => s.nom.includes('Cerema') || s.nom.includes('DGCL'))
      };
    }

    // Ajustement surface si connu (ratio par rapport a une parcelle "standard" 400m2)
    let vl = sec.valeur_locative_cadastrale_moyenne_eur;
    let methode = 'VL moyenne section ' + section;

    if (parcelle.surface_m2 && parcelle.surface_m2 > 0) {
      const ratio = Math.min(3.0, Math.max(0.3, parcelle.surface_m2 / 400));
      vl = Math.round(vl * ratio);
      methode += ' x ratio surface (' + parcelle.surface_m2 + 'm2)';
    }

    // TFB = VL * 0.5 (abattement standard) * taux / 100
    const tfb = Math.round(vl * 0.5 * taux / 100);

    return {
      tfb_eur: tfb,
      vl_estimee_eur: vl,
      taux_applique: taux,
      methode: methode,
      fiabilite: sec.fiabilite,
      sources: data._meta.sources.filter(s =>
        s.nom.includes('DGCL') || s.nom.includes('Cerema') || s.nom.includes('DGFIP')
      ),
      disclaimer: 'Estimation DGFIP open data. La valeur exacte est connue de la DGFIP et de la mairie uniquement.'
    };
  }

  /**
   * Estime la TFNB pour une parcelle non batie (ou partie non batie).
   */
  function estimateTFNB(parcelle, dataset) {
    const data = dataset || RECETTES_DATA;
    if (!data) return null;

    const section = extractSection(parcelle.reference || parcelle.id);
    if (!section || section.startsWith('_') || !data.sections_cadastrales[section] || typeof data.sections_cadastrales[section].valeur_locative_cadastrale_moyenne_eur !== 'number') return null;

    const sec = data.sections_cadastrales[section];
    const taux = data.taux_communaux_2023.tfnb_taux_communal;

    // VL TFNB = environ 1/8 de la VL TFB (regle DGFIP simplifiee, cf. art. 1396 CGI)
    const vlTFNB = Math.round(sec.valeur_locative_cadastrale_moyenne_eur / 8);
    const tfnb = Math.round(vlTFNB * 0.8 * taux / 100); // abattement 20% standard

    return {
      tfnb_eur: tfnb,
      vl_estimee_eur: vlTFNB,
      taux_applique: taux,
      methode: 'VL TFNB (1/8 VL TFB section ' + section + ')',
      fiabilite: 'MOYENNE',
      sources: data._meta.sources,
      disclaimer: 'Estimation tres prudente. Pour parcelles agricoles bonifiees, peut etre majoree.'
    };
  }

  /**
   * Estime la CFE pour un etablissement assujetti.
   */
  function estimateCFE(parcelle, etablissement, dataset) {
    const data = dataset || RECETTES_DATA;
    if (!data) return null;
    if (!etablissement || !etablissement.assujetti_cfe) return null;

    const taux = data.taux_communaux_2023.cfe_taux_communal;
    // Base CFE = VL des biens utilises a usage pro. Estimation : 60% de la VL TFB section.
    const section = extractSection(parcelle.reference || parcelle.id);
    if (!section || section.startsWith('_') || !data.sections_cadastrales[section] || typeof data.sections_cadastrales[section].valeur_locative_cadastrale_moyenne_eur !== 'number') return null;

    const baseCFE = Math.round(data.sections_cadastrales[section].valeur_locative_cadastrale_moyenne_eur * 0.6);
    const cfe = Math.round(baseCFE * taux / 100);

    return {
      cfe_eur: cfe,
      base_estimee_eur: baseCFE,
      taux_applique: taux,
      siren: etablissement.siren || 'inconnu',
      fiabilite: 'FAIBLE - estimation indicative',
      disclaimer: 'CFE reelle depend du chiffre d affaires et du regime micro/reel. A verifier via SIRENE + dataset mairie.'
    };
  }

  /**
   * Calcul global parcelle : retourne TFB + TFNB + CFE eventuelle.
   */
  async function getRecettesParcelle(parcelle, etablissement) {
    const data = await loadRecettesData();
    if (!data) {
      return {
        erreur: 'dataset DGFIP non charge',
        contact: KCI_FISCAL_CONFIG.contact_kci
      };
    }

    const tfb = estimateTFB(parcelle, data);
    const tfnb = estimateTFNB(parcelle, data);
    const cfe = etablissement ? estimateCFE(parcelle, etablissement, data) : null;

    const total = (tfb && tfb.tfb_eur ? tfb.tfb_eur : 0)
                + (tfnb && tfnb.tfnb_eur ? tfnb.tfnb_eur : 0)
                + (cfe && cfe.cfe_eur ? cfe.cfe_eur : 0);

    return {
      parcelle_ref: parcelle.reference || parcelle.id,
      section: extractSection(parcelle.reference || parcelle.id),
      tfb: tfb,
      tfnb: tfnb,
      cfe: cfe,
      total_estime_eur: total,
      annee: data._meta && data._meta.date_extraction ? data._meta.date_extraction.slice(0, 4) : '2026',
      generation: 'KCI Topo3D - jumeau numerique fiscal',
      disclaimer_global: 'Estimation a partir de DGFIP open data. A confirmer par le service fiscal mairie de Petit-Bourg via dataset interne (cf. endpoint /api/ingest-fiscal).'
    };
  }

  // ─── Export module ──────────────────────────────────────────────────
  const api = {
    config: KCI_FISCAL_CONFIG,
    loadRecettesData,
    extractSection,
    estimateTFB,
    estimateTFNB,
    estimateCFE,
    getRecettesParcelle
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  } else {
    global.kciFiscalRecettes = api;
  }
})(typeof window !== 'undefined' ? window : globalThis);
