// api/generate-pdf.js
// Génère un PDF professionnel KCI à partir du JSON d'analyse via pdf-lib
// Utilisé par validate.js pour envoyer le rapport en pièce jointe

const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');

// ─── COULEURS KCI ────────────────────────────────────────────────
const NAVY = rgb(11 / 255, 21 / 255, 38 / 255);
const GOLD = rgb(194 / 255, 160 / 255, 96 / 255);
const GREEN = rgb(42 / 255, 157 / 255, 108 / 255);
const ORANGE = rgb(212 / 255, 138 / 255, 26 / 255);
const RED = rgb(196 / 255, 59 / 255, 46 / 255);
const WHITE = rgb(1, 1, 1);
const GRAY = rgb(0.42, 0.42, 0.4);
const LIGHT_BG = rgb(0.969, 0.969, 0.961);
const BORDER = rgb(0.91, 0.91, 0.894);

function scoreColor(score) {
  if (score >= 7) return GREEN;
  if (score >= 5) return ORANGE;
  return RED;
}

// ─── UTILITAIRES TEXTE ───────────────────────────────────────────
function wrapText(text, font, fontSize, maxWidth) {
  const words = text.split(' ');
  const lines = [];
  let currentLine = '';
  for (const word of words) {
    const testLine = currentLine ? currentLine + ' ' + word : word;
    const width = font.widthOfTextAtSize(testLine, fontSize);
    if (width > maxWidth && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  }
  if (currentLine) lines.push(currentLine);
  return lines;
}

function drawWrapped(page, text, x, y, font, fontSize, color, maxWidth, lineHeight) {
  const lines = wrapText(text, font, fontSize, maxWidth);
  let currentY = y;
  for (const line of lines) {
    if (currentY < 60) break; // marge basse
    page.drawText(line, { x, y: currentY, size: fontSize, font, color });
    currentY -= lineHeight || fontSize * 1.5;
  }
  return currentY;
}

// ─── GÉNÉRATION DU PDF ───────────────────────────────────────────
async function generateReportPDF(report) {
  const doc = await PDFDocument.create();
  const helvetica = await doc.embedFont(StandardFonts.Helvetica);
  const helveticaBold = await doc.embedFont(StandardFonts.HelveticaBold);
  const j = report.analyseJson;
  const plan = report.plan || 'recommandee';
  const planLabel = { essentielle: 'Essentielle · 49€', recommandee: 'Complète · 129€', premium: 'Premium · 299€' };
  const W = 595; // A4
  const H = 842;
  const M = 50; // marges
  const CW = W - 2 * M; // largeur contenu

  // ═══════════════ PAGE 1 : COUVERTURE ═══════════════
  const p1 = doc.addPage([W, H]);

  // Fond navy couverture
  p1.drawRectangle({ x: 0, y: 0, width: W, height: H, color: NAVY });

  // Badge offre
  const badgeText = `OFFRE ${plan.toUpperCase()} · ${planLabel[plan]?.split('·')[1]?.trim() || ''}`;
  p1.drawRectangle({ x: M, y: H - 100, width: 200, height: 24, color: rgb(194 / 255, 160 / 255, 96 / 255, 0.15), borderColor: GOLD, borderWidth: 0.5 });
  p1.drawText(badgeText, { x: M + 10, y: H - 94, size: 8, font: helveticaBold, color: GOLD });

  // KCI
  p1.drawText('KCI', { x: M, y: H - 150, size: 36, font: helvetica, color: WHITE });
  p1.drawText('KARUKERA CONSEIL IMMOBILIER', { x: M, y: H - 168, size: 7, font: helvetica, color: rgb(1, 1, 1, 0.4) });

  // Ligne dorée
  p1.drawLine({ start: { x: M, y: H - 180 }, end: { x: M + 60, y: H - 180 }, thickness: 1, color: GOLD });

  // Titre du bien
  const typeBien = report.bienData?.type_bien || 'Bien immobilier';
  const commune = report.bienData?.commune || 'Guadeloupe';
  p1.drawText('PRE-ETUDE DE FAISABILITE IMMOBILIERE', { x: M, y: H - 210, size: 8, font: helvetica, color: GOLD });
  drawWrapped(p1, typeBien, M, H - 240, helveticaBold, 24, WHITE, CW, 30);
  p1.drawText(`${commune}, Guadeloupe`, { x: M, y: H - 280, size: 16, font: helvetica, color: GOLD });

  // Fiche récap
  const y0 = H - 340;
  const fields = [
    ['Type', report.bienData?.type_bien || 'N/A'],
    ['Commune', `${commune}, ${report.bienData?.code_postal || '971XX'}`],
    ['Surface', report.bienData?.surface_terrain || 'N/A'],
    ['Prix affiché', report.bienData?.budget_total || 'N/A'],
    ['Zone PLU', report.bienData?.zone_plu || 'N/A'],
    ['Programme', report.bienData?.objectif || 'N/A']
  ];
  p1.drawRectangle({ x: M, y: y0 - fields.length * 28 - 10, width: CW, height: fields.length * 28 + 20, color: rgb(1, 1, 1, 0.05) });
  fields.forEach((f, i) => {
    const fy = y0 - i * 28;
    p1.drawText(f[0], { x: M + 16, y: fy, size: 9, font: helvetica, color: rgb(1, 1, 1, 0.5) });
    p1.drawText(String(f[1]).slice(0, 60), { x: M + CW / 2, y: fy, size: 9, font: helveticaBold, color: WHITE });
  });

  // Score + Verdict
  const scoreY = 200;
  const sc = scoreColor(j.score);
  p1.drawRectangle({ x: M, y: scoreY - 10, width: CW, height: 60, color: rgb(1, 1, 1, 0.05), borderColor: sc, borderWidth: 1 });
  p1.drawText(String(j.score), { x: M + 20, y: scoreY + 8, size: 32, font: helveticaBold, color: sc });
  p1.drawText('/10', { x: M + 55, y: scoreY + 8, size: 12, font: helvetica, color: rgb(1, 1, 1, 0.4) });
  const verdictText = j.verdict_texte || j.verdict || '';
  p1.drawText(verdictText.slice(0, 80), { x: M + 90, y: scoreY + 18, size: 11, font: helveticaBold, color: WHITE });
  p1.drawText('Score de faisabilite KCI', { x: M + 90, y: scoreY + 2, size: 8, font: helvetica, color: rgb(1, 1, 1, 0.4) });

  // Footer signature
  p1.drawLine({ start: { x: M, y: 80 }, end: { x: W - M, y: 80 }, thickness: 0.5, color: rgb(1, 1, 1, 0.1) });
  p1.drawText('Dereck Rauzduel · Architecte EPFL · Fondateur KCI', { x: M, y: 64, size: 7, font: helvetica, color: rgb(1, 1, 1, 0.3) });
  p1.drawText('Document confidentiel · Non contractuel', { x: M, y: 52, size: 6, font: helvetica, color: rgb(1, 1, 1, 0.2) });

  // ═══════════════ PAGE 2 : SCORES + FINANCE ═══════════════
  if (plan !== 'essentielle' || j.subscores) {
    const p2 = doc.addPage([W, H]);

    // Header
    p2.drawRectangle({ x: 0, y: H - 40, width: W, height: 40, color: NAVY });
    p2.drawText('KCI', { x: 20, y: H - 28, size: 10, font: helveticaBold, color: GOLD });
    p2.drawText(`Rapport ${planLabel[plan] || ''} · ${commune}`, { x: 60, y: H - 28, size: 8, font: helvetica, color: rgb(1, 1, 1, 0.5) });
    p2.drawText(`1 / ${plan === 'premium' ? '4' : '2'}`, { x: W - 60, y: H - 28, size: 8, font: helvetica, color: rgb(1, 1, 1, 0.5) });

    let cy = H - 70;

    // Sous-scores
    if (j.subscores && j.subscores.length > 0) {
      p2.drawText('7 SOUS-SCORES D\'ANALYSE', { x: M, y: cy, size: 11, font: helveticaBold, color: NAVY });
      p2.drawLine({ start: { x: M, y: cy - 6 }, end: { x: M + 120, y: cy - 6 }, thickness: 2, color: GOLD });
      cy -= 30;

      for (const ss of j.subscores) {
        const val = ss.valeur ?? ss.val ?? 0;
        const barWidth = (val / 10) * 200;
        const barColor = scoreColor(val);

        p2.drawText(ss.label || '', { x: M, y: cy, size: 9, font: helvetica, color: GRAY });
        // Barre de fond
        p2.drawRectangle({ x: M + 180, y: cy - 2, width: 200, height: 10, color: LIGHT_BG });
        // Barre de valeur
        p2.drawRectangle({ x: M + 180, y: cy - 2, width: barWidth, height: 10, color: barColor });
        // Score chiffré
        p2.drawText(`${val}/10`, { x: M + 395, y: cy, size: 9, font: helveticaBold, color: barColor });

        cy -= 24;
      }
      cy -= 10;
    }

    // Points clés (Essentielle)
    if (j.points_cles && j.points_cles.length > 0) {
      p2.drawText('POINTS CLES', { x: M, y: cy, size: 11, font: helveticaBold, color: NAVY });
      p2.drawLine({ start: { x: M, y: cy - 6 }, end: { x: M + 80, y: cy - 6 }, thickness: 2, color: GOLD });
      cy -= 26;
      for (const pt of j.points_cles) {
        p2.drawText('•', { x: M, y: cy, size: 9, font: helvetica, color: GOLD });
        cy = drawWrapped(p2, pt, M + 14, cy, helvetica, 9, GRAY, CW - 14, 14);
        cy -= 6;
      }
      cy -= 10;
    }

    // Tableau financier
    if (j.tableau_financier && j.tableau_financier.length > 0) {
      p2.drawText('ESTIMATION FINANCIERE', { x: M, y: cy, size: 11, font: helveticaBold, color: NAVY });
      p2.drawLine({ start: { x: M, y: cy - 6 }, end: { x: M + 120, y: cy - 6 }, thickness: 2, color: GOLD });
      cy -= 24;

      // En-tête tableau
      p2.drawRectangle({ x: M, y: cy - 4, width: CW, height: 18, color: NAVY });
      p2.drawText('POSTE', { x: M + 8, y: cy, size: 7, font: helveticaBold, color: GOLD });
      p2.drawText('DETAIL', { x: M + 180, y: cy, size: 7, font: helveticaBold, color: GOLD });
      p2.drawText('MONTANT', { x: M + CW - 80, y: cy, size: 7, font: helveticaBold, color: GOLD });
      cy -= 22;

      for (const row of j.tableau_financier) {
        const isTotal = row.type === 'total' || row.type === 'highlight';
        if (isTotal) {
          p2.drawRectangle({ x: M, y: cy - 4, width: CW, height: 18, color: rgb(0.96, 0.94, 0.88) });
        }
        const fnt = isTotal ? helveticaBold : helvetica;
        p2.drawText((row.poste || '').slice(0, 35), { x: M + 8, y: cy, size: 8, font: fnt, color: NAVY });
        p2.drawText((row.detail || '').slice(0, 30), { x: M + 180, y: cy, size: 7, font: helvetica, color: GRAY });
        p2.drawText((row.montant || '').slice(0, 15), { x: M + CW - 80, y: cy, size: 8, font: fnt, color: NAVY });
        p2.drawLine({ start: { x: M, y: cy - 6 }, end: { x: M + CW, y: cy - 6 }, thickness: 0.3, color: BORDER });
        cy -= 20;
      }
    }

    // Conclusion
    if (cy > 120 && j.conclusion) {
      cy -= 10;
      p2.drawText('CONCLUSION', { x: M, y: cy, size: 11, font: helveticaBold, color: NAVY });
      p2.drawLine({ start: { x: M, y: cy - 6 }, end: { x: M + 70, y: cy - 6 }, thickness: 2, color: GOLD });
      cy -= 24;
      drawWrapped(p2, j.conclusion.slice(0, 500), M, cy, helvetica, 9, GRAY, CW, 14);
    }

    // Footer
    p2.drawLine({ start: { x: M, y: 45 }, end: { x: W - M, y: 45 }, thickness: 0.3, color: BORDER });
    p2.drawText('KCI — Karukera Conseil Immobilier · Pre-etude de faisabilite · Non contractuel', { x: M, y: 32, size: 6, font: helvetica, color: GRAY });
  }

  // ═══════════════ PAGE 3 : SCENARIOS (Premium) ═══════════════
  if (plan === 'premium' && j.scenarios && j.scenarios.length > 0) {
    const p3 = doc.addPage([W, H]);

    // Header
    p3.drawRectangle({ x: 0, y: H - 40, width: W, height: 40, color: NAVY });
    p3.drawText('KCI', { x: 20, y: H - 28, size: 10, font: helveticaBold, color: GOLD });
    p3.drawText(`Scenarios financiers · ${commune}`, { x: 60, y: H - 28, size: 8, font: helvetica, color: rgb(1, 1, 1, 0.5) });
    p3.drawText('2 / 4', { x: W - 60, y: H - 28, size: 8, font: helvetica, color: rgb(1, 1, 1, 0.5) });

    let cy = H - 70;
    p3.drawText('3 SCENARIOS FINANCIERS', { x: M, y: cy, size: 11, font: helveticaBold, color: NAVY });
    p3.drawLine({ start: { x: M, y: cy - 6 }, end: { x: M + 120, y: cy - 6 }, thickness: 2, color: GOLD });
    cy -= 36;

    for (const sc of j.scenarios) {
      p3.drawRectangle({ x: M, y: cy - 80, width: CW, height: 90, color: LIGHT_BG, borderColor: BORDER, borderWidth: 0.5 });
      p3.drawText((sc.nom || '').toUpperCase(), { x: M + 12, y: cy, size: 10, font: helveticaBold, color: NAVY });
      p3.drawText(`Rendement : ${sc.rendement || 'N/A'}`, { x: M + CW - 140, y: cy, size: 9, font: helveticaBold, color: scoreColor(parseFloat(sc.rendement) > 5 ? 7 : parseFloat(sc.rendement) > 3 ? 5 : 3) });
      cy -= 18;
      cy = drawWrapped(p3, (sc.description || '').slice(0, 300), M + 12, cy, helvetica, 8, GRAY, CW - 24, 12);
      cy -= 30;
    }

    // SWOT si disponible
    if (j.analyse_strategique) {
      cy -= 10;
      p3.drawText('ANALYSE STRATEGIQUE', { x: M, y: cy, size: 11, font: helveticaBold, color: NAVY });
      p3.drawLine({ start: { x: M, y: cy - 6 }, end: { x: M + 100, y: cy - 6 }, thickness: 2, color: GOLD });
      cy -= 24;
      drawWrapped(p3, j.analyse_strategique.slice(0, 600), M, cy, helvetica, 9, GRAY, CW, 14);
    }

    // Footer
    p3.drawLine({ start: { x: M, y: 45 }, end: { x: W - M, y: 45 }, thickness: 0.3, color: BORDER });
    p3.drawText('KCI — Karukera Conseil Immobilier · Analyse strategique Premium · Non contractuel', { x: M, y: 32, size: 6, font: helvetica, color: GRAY });
  }

  // ═══════════════ PAGE FINALE : CHECKLIST + MÉTHODOLOGIE ═══════════════
  if (plan !== 'essentielle') {
    const pLast = doc.addPage([W, H]);

    pLast.drawRectangle({ x: 0, y: H - 40, width: W, height: 40, color: NAVY });
    pLast.drawText('KCI', { x: 20, y: H - 28, size: 10, font: helveticaBold, color: GOLD });
    const pageNum = plan === 'premium' ? '4 / 4' : '2 / 2';
    pLast.drawText(pageNum, { x: W - 60, y: H - 28, size: 8, font: helvetica, color: rgb(1, 1, 1, 0.5) });

    let cy = H - 70;

    // Checklist
    if (j.checklist && j.checklist.length > 0) {
      pLast.drawText('CHECKLIST AVANT DECISION', { x: M, y: cy, size: 11, font: helveticaBold, color: NAVY });
      pLast.drawLine({ start: { x: M, y: cy - 6 }, end: { x: M + 120, y: cy - 6 }, thickness: 2, color: GOLD });
      cy -= 28;

      for (const item of j.checklist) {
        pLast.drawRectangle({ x: M, y: cy - 2, width: 12, height: 12, borderColor: GOLD, borderWidth: 1 });
        cy = drawWrapped(pLast, item, M + 20, cy, helvetica, 8, GRAY, CW - 20, 12);
        cy -= 10;
      }
      cy -= 10;
    }

    // Recommandation (Premium)
    if (j.recommandation && cy > 200) {
      pLast.drawRectangle({ x: M, y: cy - 80, width: CW, height: 90, color: NAVY });
      pLast.drawText('RECOMMANDATION STRATEGIQUE', { x: M + 12, y: cy, size: 8, font: helveticaBold, color: GOLD });
      drawWrapped(pLast, j.recommandation.slice(0, 400), M + 12, cy - 18, helvetica, 8, WHITE, CW - 24, 12);
      cy -= 100;
    }

    // Méthodologie
    cy -= 10;
    pLast.drawText('METHODOLOGIE KCI', { x: M, y: cy, size: 9, font: helveticaBold, color: NAVY });
    cy -= 16;
    const methodo = 'Sources : DVF (data.gouv.fr, 2020-2025), GPU (Plans Locaux d\'Urbanisme), Georisques (PPRI, PPRN, seismicite), LOVAC (logements vacants), INSEE/IEDOM, cadastre.gouv.fr. Hypotheses construction : 2 500-4 000 EUR/m2 TTC all-in (standard Guadeloupe). Ce document est une pre-etude non contractuelle. Il ne remplace ni un diagnostic complet, ni un audit juridique approfondi.';
    drawWrapped(pLast, methodo, M, cy, helvetica, 7, GRAY, CW, 10);

    // Signature
    pLast.drawLine({ start: { x: M, y: 100 }, end: { x: W - M, y: 100 }, thickness: 0.5, color: BORDER });
    pLast.drawText('Dereck Rauzduel', { x: M, y: 82, size: 10, font: helveticaBold, color: NAVY });
    pLast.drawText('Architecte EPFL — Fondateur KCI', { x: M, y: 68, size: 8, font: helvetica, color: GOLD });
    pLast.drawText('contact@karukera-conseil.com · karukera-conseil.com', { x: M, y: 56, size: 7, font: helvetica, color: GRAY });

    // Footer
    pLast.drawLine({ start: { x: M, y: 40 }, end: { x: W - M, y: 40 }, thickness: 0.3, color: BORDER });
    pLast.drawText('KCI — Karukera Conseil Immobilier · Pre-etude de faisabilite · Non contractuel', { x: M, y: 28, size: 6, font: helvetica, color: GRAY });
  }

  return await doc.save();
}

module.exports = { generateReportPDF };
