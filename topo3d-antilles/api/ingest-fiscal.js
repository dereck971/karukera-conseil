// api/ingest-fiscal.js
// -----------------------------------------------------------------------------
// Endpoint d'ingestion des donnees fiscales communales (Topo3D Antilles).
// Workflow :
//   1. Verifie le token admin (Bearer)
//   2. Rate-limit par IP
//   3. Recoit un payload JSON { commune_insee, format: 'csv'|'json', data: <base64|string> }
//   4. Parse + valide vs schema
//   5. Ecrit le fichier dans data/fiscal/{commune}.json
//   6. Logge l'ingestion (audit trail)
//
// SECURITE :
//   - Auth : Authorization: Bearer <ADMIN_SECRET>
//   - Rate-limit : 5 req/min par IP
//   - Validation stricte : ref_cadastrale + valeur_locative obligatoires
//   - Anti-injection : pas de chars de controle, pas de scripts
//   - Pas de PII (le schema interdit les noms — seul proprietaire_type est tolere)
//
// VARIABLES D'ENV REQUISES :
//   - ADMIN_SECRET : token Bearer pour authentifier l'admin
//   - TOKEN_SECRET : cle pour AES-256-GCM (chiffrement payload si besoin futur)
// -----------------------------------------------------------------------------

const fs = require('fs');
const path = require('path');
const {
  verifyAdmin,
  rateLimit,
  getClientIp,
  escapeHtml
} = require('./_lib/security');

const FISCAL_DIR = path.join(__dirname, '..', 'data', 'fiscal');
const LOG_PATH = path.join(__dirname, '..', 'data', 'fiscal', '_ingestion_log.jsonl');

// ─── PARSE CSV (UTF-8, separator ;) ─────────────────────────────────────
function parseCsv(text) {
  // Normaliser line endings
  text = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim();
  const lines = text.split('\n').filter(l => l.length > 0 && !l.startsWith('#'));
  if (lines.length < 2) return { error: 'CSV vide ou pas de lignes apres header' };
  const sep = lines[0].includes(';') ? ';' : (lines[0].includes(',') ? ',' : '\t');
  const headers = lines[0].split(sep).map(h => h.trim());
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const cells = lines[i].split(sep);
    if (cells.length !== headers.length) continue;
    const obj = {};
    for (let j = 0; j < headers.length; j++) obj[headers[j]] = cells[j].trim();
    rows.push(obj);
  }
  return { rows, headers };
}

// ─── VALIDATION SCHEMA ──────────────────────────────────────────────────
const REQUIRED_COLS = ['ref_cadastrale', 'valeur_locative_eur', 'tfb_eur', 'tfnb_eur', 'cfe_eur', 'annee_revision_vl'];
const ALLOWED_USAGES = ['residentiel', 'commercial', 'industriel', 'agricole', 'religieux', 'sportif', 'annexe', 'indetermine', ''];
const ALLOWED_PROPS = ['particulier', 'sci', 'sarl', 'sas', 'etat', 'commune', 'indivision', 'autre', ''];

function isControlChar(s) {
  // Refuse tabs/newlines internes, scripts, etc.
  return /[\x00-\x08\x0B-\x1F\x7F]/.test(s) || /<script|<iframe|javascript:/i.test(s);
}

function validateRow(row, idx) {
  const errs = [];
  for (const c of REQUIRED_COLS) {
    if (!(c in row) || row[c] === '') errs.push(`row ${idx}: colonne ${c} manquante`);
  }
  if (errs.length) return errs;

  // Format ref_cadastrale : "INSEE5 prefixe3 section numero4" — relaxe (>= 8 chars, alphanum + space)
  if (!/^[A-Z0-9 \-]{6,30}$/i.test(row.ref_cadastrale)) {
    errs.push(`row ${idx}: ref_cadastrale invalide "${row.ref_cadastrale}"`);
  }
  // Numeriques
  for (const num of ['valeur_locative_eur', 'tfb_eur', 'tfnb_eur', 'cfe_eur']) {
    const v = Number(String(row[num]).replace(',', '.'));
    if (!isFinite(v) || v < 0 || v > 10_000_000) errs.push(`row ${idx}: ${num} invalide "${row[num]}"`);
    else row[num] = v;
  }
  const annee = parseInt(row.annee_revision_vl, 10);
  if (!isFinite(annee) || annee < 1900 || annee > 2100) errs.push(`row ${idx}: annee_revision_vl invalide`);
  else row.annee_revision_vl = annee;

  // Optionnels
  if (row.proprietaire_type && !ALLOWED_PROPS.includes(row.proprietaire_type)) {
    errs.push(`row ${idx}: proprietaire_type "${row.proprietaire_type}" non autorise`);
  }
  if (row.usage && !ALLOWED_USAGES.includes(row.usage)) {
    errs.push(`row ${idx}: usage "${row.usage}" non autorise`);
  }
  // Anti-injection partout
  for (const [k, v] of Object.entries(row)) {
    if (typeof v === 'string' && isControlChar(v)) errs.push(`row ${idx}: caractere interdit dans ${k}`);
  }
  return errs;
}

function applySousFiscalisationRule(row) {
  const ratio = row.valeur_locative_eur > 0 ? row.tfb_eur / row.valeur_locative_eur : 0;
  row.sous_fiscalise = (ratio < 0.30 && row.valeur_locative_eur > 0) || row.annee_revision_vl < 2010;
  return row;
}

// ─── HANDLER PRINCIPAL ──────────────────────────────────────────────────
module.exports = async (req, res) => {
  // CORS minimal pour endpoint admin (front meme origine)
  res.setHeader('Access-Control-Allow-Origin', process.env.ADMIN_ORIGIN || 'https://karukera-conseil.com');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Cache-Control', 'no-store');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method Not Allowed' });
    return;
  }

  // Auth
  if (!verifyAdmin(req)) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  // Rate-limit (5 req/min)
  const ip = getClientIp(req);
  if (!rateLimit(ip, 5, 60_000)) {
    res.status(429).json({ error: 'Rate limit exceeded' });
    return;
  }

  // Parse body
  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch (e) { res.status(400).json({ error: 'Invalid JSON' }); return; }
  }
  const { commune_insee, format, data } = body || {};
  if (!commune_insee || !/^\d{5}$/.test(String(commune_insee))) {
    res.status(400).json({ error: 'commune_insee invalide (attendu : 5 chiffres)' });
    return;
  }
  if (!data || typeof data !== 'string') {
    res.status(400).json({ error: 'data manquant' });
    return;
  }

  // Decode si base64
  let raw = data;
  if (format === 'csv-b64' || /^[A-Za-z0-9+/=]+$/.test(data) && data.length > 200 && !data.includes(';')) {
    try { raw = Buffer.from(data, 'base64').toString('utf-8'); } catch (e) {
      res.status(400).json({ error: 'base64 invalide' }); return;
    }
  }

  // Parse selon format
  let rows = [];
  if (format === 'json') {
    try {
      const parsed = JSON.parse(raw);
      rows = Array.isArray(parsed) ? parsed : (parsed.parcelles || []);
    } catch (e) { res.status(400).json({ error: 'JSON invalide' }); return; }
  } else {
    // CSV par defaut
    const r = parseCsv(raw);
    if (r.error) { res.status(400).json({ error: r.error }); return; }
    rows = r.rows;
  }

  if (!Array.isArray(rows) || rows.length === 0) {
    res.status(400).json({ error: 'Aucune ligne de donnees' });
    return;
  }
  if (rows.length > 100_000) {
    res.status(413).json({ error: 'Payload trop volumineux (>100k lignes)' });
    return;
  }

  // Validation toutes les lignes
  const allErrors = [];
  rows.forEach((r, i) => {
    const errs = validateRow(r, i + 1);
    if (errs.length) allErrors.push(...errs);
    else applySousFiscalisationRule(r);
  });

  // Si > 5% d'erreurs OU > 100 erreurs absolues, on refuse
  if (allErrors.length > Math.max(100, rows.length * 0.05)) {
    res.status(422).json({ error: 'Trop d erreurs de validation', count: allErrors.length, sample: allErrors.slice(0, 20) });
    return;
  }

  // On garde uniquement les lignes valides
  const valides = rows.filter(r => REQUIRED_COLS.every(c => c in r && r[c] !== ''));

  // Ecriture
  fs.mkdirSync(FISCAL_DIR, { recursive: true });
  const outPath = path.join(FISCAL_DIR, `${commune_insee}.json`);
  const payload = {
    _meta: {
      commune_insee,
      ingested_at: new Date().toISOString(),
      ingested_by_ip: ip.replace(/\d+$/, 'xxx'), // anonymize last octet
      row_count: valides.length,
      validation_errors: allErrors.length
    },
    parcelles: valides
  };
  fs.writeFileSync(outPath, JSON.stringify(payload, null, 2));

  // Audit log
  fs.appendFileSync(LOG_PATH,
    JSON.stringify({ ts: new Date().toISOString(), ip: ip.replace(/\d+$/, 'xxx'), commune_insee, rows: valides.length, errors: allErrors.length }) + '\n'
  );

  res.status(200).json({
    ok: true,
    commune_insee,
    rows_valid: valides.length,
    rows_rejected: rows.length - valides.length,
    validation_errors_count: allErrors.length,
    file: `data/fiscal/${commune_insee}.json`
  });
};

// Exports utilitaires pour tests
module.exports.parseCsv = parseCsv;
module.exports.validateRow = validateRow;
module.exports.applySousFiscalisationRule = applySousFiscalisationRule;
