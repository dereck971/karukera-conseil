/**
 * api/generate-pdf-dob.js
 * -----------------------
 * Endpoint Vercel serverless - genere un PDF "Pre-budget fiscal" par quartier.
 *
 * Methodes :
 *  POST /api/generate-pdf-dob          { section: 'AB' }       => PDF un quartier
 *  POST /api/generate-pdf-dob?all=1    {}                      => PDF tous quartiers
 *
 * Headers : Authorization: Bearer <ADMIN_SECRET> (requis)
 *
 * Auteur : Karukera Conseil Immobilier (KCI) - Dereck Rauzduel
 * Email officiel : contact@karukera-conseil.com
 * Date : 2026-04-17
 */
const fs = require('fs');
const path = require('path');

const exportDob = require('../lib/fiscal/export_dob.js');
const sousFiscLib = require('../lib/fiscal/sous_fiscalisation.js');
const { verifyAdmin, rateLimit, getClientIp } = require('./_lib/security.js');

const DATA_DIR = path.join(__dirname, '..', 'data', 'fiscal', 'dgfip');

function loadJson(filename) {
  const p = path.join(DATA_DIR, filename);
  if (!fs.existsSync(p)) throw new Error('Dataset introuvable : ' + filename);
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

async function readBody(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', chunk => { raw += chunk; if (raw.length > 100000) req.destroy(); });
    req.on('end', () => {
      try { resolve(raw ? JSON.parse(raw) : {}); }
      catch (e) { reject(new Error('JSON invalide')); }
    });
    req.on('error', reject);
  });
}

module.exports = async function handler(req, res) {
  // ─── CORS basique (lecture publique, ecriture restreinte) ───────
  res.setHeader('Access-Control-Allow-Origin', process.env.ALLOWED_ORIGIN || 'https://www.karukera-conseil.com');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // ─── Auth admin ──────────────────────────────────────────────────
  if (!verifyAdmin(req)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // ─── Rate limit (5 PDF / minute / IP) ────────────────────────────
  const ip = getClientIp(req);
  if (!rateLimit(ip, 5, 60000)) {
    return res.status(429).json({ error: 'Too many requests' });
  }

  let body;
  try { body = await readBody(req); }
  catch (e) { return res.status(400).json({ error: e.message }); }

  // ─── Chargement datasets ─────────────────────────────────────────
  let recettes, zonesPLU;
  try {
    recettes = loadJson('petitbourg_recettes.json');
    zonesPLU = loadJson('petitbourg_zones_plu_aggregat.json');
  } catch (e) {
    return res.status(500).json({ error: 'Datasets DGFIP indisponibles : ' + e.message });
  }

  const sousFisc = sousFiscLib.aggregateCommune(recettes);
  const datasets = { recettes, zonesPLU, sousFisc };

  // ─── Logo (optionnel) ────────────────────────────────────────────
  let logoPngBytes = null;
  try {
    const logoPath = path.join(__dirname, '..', '..', 'logo-kci.png');
    if (fs.existsSync(logoPath)) logoPngBytes = fs.readFileSync(logoPath);
  } catch (e) { /* logo optionnel */ }

  // ─── Generation ──────────────────────────────────────────────────
  try {
    const all = req.url && req.url.includes('all=1');
    const pdfBytes = all
      ? await exportDob.generatePDFAllQuartiers(datasets, { logoPngBytes })
      : await exportDob.generatePDF(body.section || 'AB', datasets, { logoPngBytes });

    res.setHeader('Content-Type', 'application/pdf');
    const filename = all
      ? 'KCI_DOB_PetitBourg_AllQuartiers.pdf'
      : 'KCI_DOB_PetitBourg_' + (body.section || 'AB') + '.pdf';
    res.setHeader('Content-Disposition', 'attachment; filename="' + filename + '"');
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).send(Buffer.from(pdfBytes));
  } catch (e) {
    return res.status(500).json({ error: 'Generation PDF echec : ' + e.message });
  }
};
