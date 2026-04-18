/**
 * export_dob.js
 * -------------
 * Feature 5 - Export PDF "Pre-budget fiscal" par quartier (section cadastrale)
 * pour le DOB (Debat d'Orientation Budgetaire) presente au conseil municipal.
 *
 * Universel : peut tourner cote client (browser) avec pdf-lib via UMD,
 * ou cote serveur (Node) via require('pdf-lib') - voir api/generate-pdf-dob.js.
 *
 * Auteur : Karukera Conseil Immobilier (KCI) - Dereck Rauzduel
 * Email officiel : contact@karukera-conseil.com
 * Date : 2026-04-17
 */
(function (global) {
  'use strict';

  // pdf-lib est resolu en runtime (Node require() ou window.PDFLib)
  function getPDFLib() {
    if (typeof require !== 'undefined') {
      try { return require('pdf-lib'); } catch (e) { /* ignore */ }
    }
    if (typeof global !== 'undefined' && global.PDFLib) return global.PDFLib;
    throw new Error('pdf-lib non disponible. Inclure pdf-lib (Node) ou <script src="https://unpkg.com/pdf-lib"></script> (browser)');
  }

  /**
   * Construit le payload structure pour un quartier (section cadastrale).
   * Combine : recettes parcelles + agregats zone PLU + sous-fiscalisation + scenarios.
   */
  function buildQuartierPayload(sectionKey, datasets) {
    const recettes = datasets.recettes;
    const zonesPLU = datasets.zonesPLU;
    const sousFisc = datasets.sousFisc; // resultat de aggregateCommune()

    if (!recettes || !recettes.sections_cadastrales[sectionKey] || sectionKey.startsWith('_')) {
      throw new Error('Section ' + sectionKey + ' absente du dataset DGFIP');
    }
    const sec = recettes.sections_cadastrales[sectionKey];
    if (typeof sec.valeur_locative_cadastrale_moyenne_eur !== 'number') {
      throw new Error('Section ' + sectionKey + ' : donnees numeriques manquantes');
    }

    const sfSection = sousFisc
      ? sousFisc.par_section.find(s => s.section === sectionKey)
      : null;

    const totalActuel = (sec.tfb_estimee_section_eur || 0) + (sec.tfnb_estimee_section_eur || 0);

    return {
      section: sectionKey,
      libelle: sec.libelle,
      annee: (recettes._meta && recettes._meta.date_extraction) ? recettes._meta.date_extraction.slice(0, 4) : '2026',
      kpis: {
        nb_parcelles: sec.nb_parcelles_total,
        nb_baties: sec.nb_parcelles_baties,
        nb_non_baties: sec.nb_parcelles_non_baties,
        tfb_actuelle_eur: sec.tfb_estimee_section_eur,
        tfnb_actuelle_eur: sec.tfnb_estimee_section_eur,
        total_recettes_eur: totalActuel,
        vl_moyenne_eur: sec.valeur_locative_cadastrale_moyenne_eur,
        dvf_prix_m2_eur: sec.dvf_prix_median_m2_2023_eur
      },
      sous_fiscalisation: sfSection ? {
        niveau: sfSection.niveau,
        ecart_pct: sfSection.ecart_pct,
        recettes_manquees_eur_an: sfSection.recettes_manquees_section_eur
      } : null,
      potentiel: {
        revision_vl_eur_an: sfSection ? sfSection.recettes_manquees_section_eur : 0,
        densification_eur_an: Math.round((sec.nb_parcelles_non_baties || 0) * (sec.tfb_estimee_section_eur / Math.max(1, sec.nb_parcelles_baties)) * 0.5)
      },
      sources: recettes._meta && recettes._meta.sources ? recettes._meta.sources : [],
      contact: 'Karukera Conseil Immobilier - contact@karukera-conseil.com'
    };
  }

  /**
   * Construit le PDF DOB pour un quartier. Renvoie un Uint8Array (browser/node).
   * @param {string} sectionKey
   * @param {object} datasets - { recettes, zonesPLU, sousFisc }
   * @param {object} opts - { logoPngBytes, mapPngBytes }
   * @returns {Promise<Uint8Array>}
   */
  async function generatePDF(sectionKey, datasets, opts) {
    opts = opts || {};
    const PDFLib = getPDFLib();
    const { PDFDocument, StandardFonts, rgb } = PDFLib;

    const payload = buildQuartierPayload(sectionKey, datasets);
    const pdf = await PDFDocument.create();

    pdf.setTitle('Pre-budget fiscal - quartier ' + payload.libelle);
    pdf.setAuthor('Karukera Conseil Immobilier (KCI) - Dereck Rauzduel');
    pdf.setSubject('Document support DOB - section ' + payload.section);
    pdf.setProducer('KCI Topo3D - jumeau numerique fiscal');
    pdf.setCreator('Karukera Conseil Immobilier');

    const page = pdf.addPage([595, 842]); // A4 portrait
    const { width, height } = page.getSize();

    const fontReg = await pdf.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold);
    const fontTitle = await pdf.embedFont(StandardFonts.TimesRomanBold);

    const NAVY = rgb(0.027, 0.043, 0.078);
    const GOLD = rgb(0.831, 0.686, 0.216);
    const TEXT = rgb(0.2, 0.2, 0.2);
    const MUTED = rgb(0.45, 0.45, 0.45);
    const RED = rgb(0.78, 0.21, 0.18);
    const GREEN = rgb(0.18, 0.62, 0.26);

    let y = height - 40;

    // ─── Header ─────────────────────────────────────────────────────
    page.drawRectangle({ x: 0, y: height - 80, width, height: 80, color: NAVY });

    // Logo si fourni
    if (opts.logoPngBytes) {
      try {
        const logo = await pdf.embedPng(opts.logoPngBytes);
        const logoDims = logo.scale(0.18);
        page.drawImage(logo, { x: 36, y: height - 64, width: logoDims.width, height: logoDims.height });
      } catch (e) { /* logo optionnel */ }
    }

    page.drawText('PRE-BUDGET FISCAL', {
      x: opts.logoPngBytes ? 100 : 36, y: height - 36,
      size: 11, font: fontBold, color: GOLD
    });
    page.drawText('Quartier ' + payload.libelle + ' (section ' + payload.section + ')', {
      x: opts.logoPngBytes ? 100 : 36, y: height - 56,
      size: 16, font: fontTitle, color: rgb(1, 1, 1)
    });
    page.drawText('Petit-Bourg - 97118 - Document support DOB ' + payload.annee, {
      x: opts.logoPngBytes ? 100 : 36, y: height - 70,
      size: 8, font: fontReg, color: rgb(0.7, 0.7, 0.7)
    });

    y = height - 110;

    // ─── KPIs ───────────────────────────────────────────────────────
    page.drawText('SYNTHESE QUARTIER', { x: 36, y, size: 9, font: fontBold, color: GOLD });
    y -= 20;

    function fmtEur(n) {
      if (Math.abs(n) >= 1000000) return (n / 1000000).toFixed(2) + ' M EUR';
      if (Math.abs(n) >= 1000) return (n / 1000).toFixed(0) + ' k EUR';
      return Math.round(n) + ' EUR';
    }

    const kpiBoxes = [
      { label: 'Parcelles', value: String(payload.kpis.nb_parcelles), unit: 'total' },
      { label: 'Batiees', value: String(payload.kpis.nb_baties), unit: 'parcelles' },
      { label: 'TFB actuelle', value: fmtEur(payload.kpis.tfb_actuelle_eur), unit: 'estim. an' },
      { label: 'TFNB actuelle', value: fmtEur(payload.kpis.tfnb_actuelle_eur), unit: 'estim. an' }
    ];

    const boxW = (width - 72 - 24) / 4;
    kpiBoxes.forEach((b, i) => {
      const x = 36 + i * (boxW + 8);
      page.drawRectangle({ x, y: y - 50, width: boxW, height: 50, color: rgb(0.96, 0.96, 0.96), borderColor: GOLD, borderWidth: 0.5 });
      page.drawText(b.label.toUpperCase(), { x: x + 8, y: y - 14, size: 7, font: fontReg, color: MUTED });
      page.drawText(b.value, { x: x + 8, y: y - 32, size: 12, font: fontBold, color: NAVY });
      page.drawText(b.unit, { x: x + 8, y: y - 44, size: 7, font: fontReg, color: MUTED });
    });
    y -= 70;

    // ─── Sous-fiscalisation ─────────────────────────────────────────
    if (payload.sous_fiscalisation) {
      page.drawText('SOUS-FISCALISATION DETECTEE', { x: 36, y, size: 9, font: fontBold, color: GOLD });
      y -= 16;

      const sf = payload.sous_fiscalisation;
      const sfColor = sf.niveau === 'critique' ? RED : sf.niveau === 'fort' ? rgb(0.9, 0.5, 0.13) : rgb(0.95, 0.61, 0.07);
      page.drawRectangle({ x: 36, y: y - 60, width: width - 72, height: 60, color: rgb(1, 0.97, 0.93), borderColor: sfColor, borderWidth: 1 });
      page.drawText('Niveau : ' + sf.niveau.toUpperCase() + ' (+' + sf.ecart_pct + '% ecart VL)', {
        x: 48, y: y - 20, size: 11, font: fontBold, color: sfColor
      });
      page.drawText('Recettes manquees estimees : ' + fmtEur(sf.recettes_manquees_eur_an) + ' / an', {
        x: 48, y: y - 38, size: 10, font: fontReg, color: TEXT
      });
      page.drawText('Methode : comparaison VL cadastrale (1970-1980) vs valeur de marche DVF actuelle.', {
        x: 48, y: y - 52, size: 8, font: fontReg, color: MUTED
      });
      y -= 80;
    }

    // ─── Potentiel d'optimisation ───────────────────────────────────
    page.drawText('POTENTIEL D OPTIMISATION', { x: 36, y, size: 9, font: fontBold, color: GOLD });
    y -= 18;
    const totalPotentiel = (payload.potentiel.revision_vl_eur_an || 0) + (payload.potentiel.densification_eur_an || 0);
    page.drawText('Revision VL (CCID) : ' + fmtEur(payload.potentiel.revision_vl_eur_an), { x: 48, y, size: 10, font: fontReg, color: TEXT });
    y -= 14;
    page.drawText('Densification dents creuses : ' + fmtEur(payload.potentiel.densification_eur_an), { x: 48, y, size: 10, font: fontReg, color: TEXT });
    y -= 14;
    page.drawRectangle({ x: 36, y: y - 22, width: width - 72, height: 22, color: rgb(0.94, 0.99, 0.95), borderColor: GREEN, borderWidth: 0.5 });
    page.drawText('TOTAL POTENTIEL : ' + fmtEur(totalPotentiel) + ' / an', {
      x: 48, y: y - 14, size: 12, font: fontBold, color: GREEN
    });
    y -= 40;

    // ─── Recommandations DOB ────────────────────────────────────────
    page.drawText('RECOMMANDATIONS POUR LE DOB', { x: 36, y, size: 9, font: fontBold, color: GOLD });
    y -= 16;

    const recommandations = buildRecommandations(payload);
    recommandations.forEach(r => {
      page.drawText('- ' + r, { x: 48, y, size: 9, font: fontReg, color: TEXT });
      y -= 13;
    });
    y -= 10;

    // ─── Sources & Footer ───────────────────────────────────────────
    if (y < 100) y = 100; // garde-fou
    y = 70; // footer fixe en bas
    page.drawLine({ start: { x: 36, y: y + 8 }, end: { x: width - 36, y: y + 8 }, thickness: 0.5, color: GOLD });
    page.drawText('Sources : DGFIP open data (DVF, comptes DGCL, taux locaux), PLU Petit-Bourg, INSEE-SIRENE.', {
      x: 36, y, size: 7, font: fontReg, color: MUTED
    });
    y -= 10;
    page.drawText('Disclaimer : Estimations basees sur donnees ouvertes. Chiffres reels a confirmer avec service fiscal mairie.', {
      x: 36, y, size: 7, font: fontReg, color: MUTED
    });
    y -= 10;
    page.drawText('Karukera Conseil Immobilier - Architecte EPFL Dereck Rauzduel - contact@karukera-conseil.com', {
      x: 36, y, size: 7, font: fontBold, color: NAVY
    });

    return await pdf.save();
  }

  function buildRecommandations(payload) {
    const out = [];
    if (payload.sous_fiscalisation && payload.sous_fiscalisation.niveau === 'critique') {
      out.push('Priorite 1 : saisir la CCID pour reviser les valeurs locatives (gain ' +
        Math.round(payload.sous_fiscalisation.recettes_manquees_eur_an / 1000) + ' k EUR/an).');
    }
    if (payload.kpis.nb_non_baties > 30) {
      out.push('Activer ' + payload.kpis.nb_non_baties + ' parcelles non baties (PUP, OAP, ZAC) pour densification.');
    }
    if (payload.kpis.tfnb_actuelle_eur > 5000) {
      out.push('Verifier les abattements TFNB exceptionnels (jachere, terres incultes) pour eviter les pertes injustifiees.');
    }
    out.push('Croiser ces donnees open data avec le fichier de role TFB de la mairie pour fiabiliser les chiffres avant DOB.');
    out.push('Contacter Karukera Conseil Immobilier (KCI) pour audit fiscal complet et plan d action.');
    return out;
  }

  /**
   * Genere un PDF combine pour TOUS les quartiers (section cadastrale).
   */
  async function generatePDFAllQuartiers(datasets, opts) {
    const recettes = datasets.recettes;
    if (!recettes || !recettes.sections_cadastrales) throw new Error('dataset recettes invalide');

    const PDFLib = getPDFLib();
    const masterPdf = await PDFLib.PDFDocument.create();

    for (const sectionKey of Object.keys(recettes.sections_cadastrales)) {
      if (sectionKey.startsWith('_')) continue;
      const sec = recettes.sections_cadastrales[sectionKey];
      if (!sec || typeof sec.valeur_locative_cadastrale_moyenne_eur !== 'number') continue;
      const bytes = await generatePDF(sectionKey, datasets, opts);
      const sub = await PDFLib.PDFDocument.load(bytes);
      const pages = await masterPdf.copyPages(sub, sub.getPageIndices());
      pages.forEach(p => masterPdf.addPage(p));
    }

    return await masterPdf.save();
  }

  const api = {
    buildQuartierPayload,
    buildRecommandations,
    generatePDF,
    generatePDFAllQuartiers
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  } else {
    global.kciFiscalExportDOB = api;
  }
})(typeof window !== 'undefined' ? window : globalThis);
