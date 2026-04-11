// api/webhook.js v7
// Récepteur de webhooks Stripe — déclenche la génération de rapport après paiement
// Pipeline : checkout.session.completed → récupère données → IA génère rapport → email admin

const crypto = require('crypto');
const Stripe = require('stripe');

// ─── STOCKAGE PERSISTANT ──────────────────────────────────────────
// @vercel/kv exporte { kv } — le client pre-configure
// Nécessite KV_REST_API_URL + KV_REST_API_TOKEN en env vars
let kvClient = null;
try {
  if (process.env.KV_REST_API_URL) {
    kvClient = require('@vercel/kv').kv;
  }
} catch (e) {
  kvClient = null;
}

const memoryFallback = global._kciPending || (global._kciPending = new Map());
const formFallback = global._kciFormData || (global._kciFormData = new Map());

const reportStore = {
  async get(key) {
    try {
      if (kvClient) {
        const raw = await kvClient.get(`report:${key}`);
        return raw ? (typeof raw === 'string' ? JSON.parse(raw) : raw) : null;
      }
    } catch (e) { /* KV unavailable, fallback */ }
    return memoryFallback.get(key) || null;
  },
  async set(key, value) {
    try {
      if (kvClient) {
        await kvClient.set(`report:${key}`, JSON.stringify(value), { ex: 7 * 24 * 3600 });
        return;
      }
    } catch (e) { /* KV unavailable, fallback */ }
    memoryFallback.set(key, value);
  }
};

const formStore = {
  async get(key) {
    try {
      if (kvClient) {
        const raw = await kvClient.get(`form:${key}`);
        return raw ? (typeof raw === 'string' ? JSON.parse(raw) : raw) : null;
      }
    } catch (e) { /* KV unavailable, fallback */ }
    return formFallback.get(key) || null;
  }
};

// ─── ESCAPE HTML ─────────────────────────────────────────────────
function escapeHtml(str) {
  if (typeof str !== 'string') return '';
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

// ─── RAW BODY READER ─────────────────────────────────────────────
// Vercel Node 24.x peut pre-lire le body. On gère les 3 cas :
// 1. req.body est un Buffer (bodyParser: false sur Vercel récent)
// 2. req.body est un string
// 3. body pas encore lu → lire le stream
async function getRawBody(req) {
  // Cas 1 & 2 : Vercel a déjà lu le body
  if (req.body) {
    if (Buffer.isBuffer(req.body)) return req.body;
    if (typeof req.body === 'string') return Buffer.from(req.body);
    // req.body est un objet parsé — on le re-stringify (pas idéal mais fonctionne)
    return Buffer.from(JSON.stringify(req.body));
  }
  // Cas 3 : stream classique
  return new Promise((resolve, reject) => {
    const chunks = [];
    const timeout = setTimeout(() => reject(new Error('Body read timeout')), 5000);
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => { clearTimeout(timeout); resolve(Buffer.concat(chunks)); });
    req.on('error', (err) => { clearTimeout(timeout); reject(err); });
  });
}

// ─── MAIN HANDLER ────────────────────────────────────────────────
const handler = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).end();

  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    console.error('[webhook] STRIPE_WEBHOOK_SECRET non configuré');
    return res.status(500).json({ error: 'Configuration serveur incomplète.' });
  }
  if (!sig) {
    return res.status(400).json({ error: 'Signature Stripe manquante.' });
  }
  if (!process.env.STRIPE_SECRET_KEY) {
    console.error('[webhook] STRIPE_SECRET_KEY not configured');
    return res.status(500).json({ error: 'Configuration serveur incomplète.' });
  }

  let event;
  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    const rawBody = await getRawBody(req);
    event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
  } catch (err) {
    console.error('[webhook] Signature invalide:', err.message);
    return res.status(400).json({ error: 'Signature webhook invalide.' });
  }

  // Répondre immédiatement à Stripe (200 OK)
  // puis traiter en arrière-plan via waitUntil si disponible
  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object;
      console.log('[webhook] Paiement confirmé — session:', session.id);

      // Traitement asynchrone : ne pas bloquer la réponse Stripe
      // Vercel serverless : on traite directement car pas de waitUntil
      try {
        await handleCheckoutCompleted(session);
      } catch (err) {
        console.error('[webhook] Erreur traitement rapport:', err.message);
        // On ne renvoie pas d'erreur à Stripe pour éviter les retries
      }
      break;
    }
    case 'payment_intent.payment_failed': {
      const pi = event.data.object;
      console.error('[webhook] Paiement échoué:', pi.last_payment_error?.message);
      break;
    }
    default:
      break;
  }

  return res.status(200).json({ received: true });
};

// ═══════════════════════════════════════════════════════════════════
// PIPELINE : Paiement → Données → IA → Rapport → Email Admin
// ═══════════════════════════════════════════════════════════════════
async function handleCheckoutCompleted(session) {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

  // 1. Récupérer la session complète avec les détails client
  const fullSession = await stripe.checkout.sessions.retrieve(session.id, {
    expand: ['line_items', 'customer_details']
  });

  const metadata = fullSession.metadata || {};
  const customerDetails = fullSession.customer_details || {};

  // 2. Récupérer les données du formulaire depuis KV (via formId)
  let formData = null;
  if (metadata.formId) {
    formData = await formStore.get(metadata.formId);
    console.log('[webhook] FormData récupéré:', formData ? 'OK' : 'NON TROUVÉ');
  }

  // 3. Construire les données client (priorité : formData > metadata > customerDetails)
  const clientName = formData?.clientName || metadata.clientName || customerDetails.name || 'Client';
  const clientEmail = formData?.clientEmail || metadata.clientEmail || customerDetails.email || '';
  const clientPhone = formData?.clientPhone || '';
  const plan = formData?.plan || metadata.plan || 'recommandee';
  const bienData = formData?.bienData || {};

  if (!clientEmail) {
    console.error('[webhook] Pas d\'email client — impossible d\'envoyer le rapport');
    return;
  }

  console.log('[webhook] Client:', clientName, clientEmail, '| Plan:', plan);

  // 4. Lookup DVF réel (non bloquant — si ça échoue, l'IA génère sans)
  let dvfData = null;
  try {
    dvfData = await fetchDVFData(bienData.commune);
    if (dvfData) {
      console.log('[webhook] DVF récupéré:', dvfData.nb_transactions, 'transactions,', dvfData.mediane_prix_m2, '€/m²');
    }
  } catch (err) {
    console.warn('[webhook] DVF lookup non bloquant:', err.message);
  }

  // 5. Construire le prompt IA selon le plan + données DVF réelles
  const prompt = buildAnalysePrompt(plan, bienData, clientName, dvfData);

  // 5. Générer le rapport via Anthropic
  const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;
  if (!ANTHROPIC_KEY) {
    console.error('[webhook] ANTHROPIC_API_KEY manquante — notification admin sans rapport');
    await sendAdminNotificationNoReport(clientName, clientEmail, clientPhone, plan, bienData, session.id);
    return;
  }

  let analyseJson;
  try {
    analyseJson = await generateReport(ANTHROPIC_KEY, prompt, plan, bienData);
  } catch (err) {
    console.error('[webhook] Erreur génération IA:', err.message);
    await sendAdminNotificationNoReport(clientName, clientEmail, clientPhone, plan, bienData, session.id);
    return;
  }

  // 6. Stocker le rapport en attente de validation admin
  const reportId = crypto.randomBytes(12).toString('hex');
  const mapUrl = getStaticMapUrl(bienData.commune);
  const reportData = {
    id: reportId,
    stripeSessionId: session.id,
    createdAt: new Date().toISOString(),
    status: 'pending',
    plan,
    clientEmail,
    clientName,
    clientPhone,
    bienData,
    analyseJson,
    dvfData: dvfData || null,
    mapUrl: mapUrl || null,
    emailSent: false
  };

  await reportStore.set(reportId, reportData);
  console.log('[webhook] Rapport stocké:', reportId);

  // 7. Envoyer notification email admin avec boutons approuver/refuser
  await sendAdminNotification(reportId, reportData);
  console.log('[webhook] Email admin envoyé pour rapport:', reportId);
}

// ─── CAPTURE SATELLITE AUTOMATIQUE ───────────────────────────────
// Génère une URL de carte statique centrée sur la commune via OpenStreetMap/Geoportail
// Retourne l'URL de l'image (à intégrer dans le rapport)
function getStaticMapUrl(commune) {
  // Coordonnées GPS des communes Guadeloupe (centroides approximatifs)
  const COORDS = {
    'Abymes': [16.2708, -61.5028], 'Anse-Bertrand': [16.4717, -61.5036],
    'Baie-Mahault': [16.2667, -61.5833], 'Baillif': [16.0167, -61.7500],
    'Basse-Terre': [15.9972, -61.7278], 'Bouillante': [16.1333, -61.7667],
    'Capesterre-Belle-Eau': [16.0500, -61.5667], 'Deshaies': [16.3000, -61.7833],
    'Gourbeyre': [15.9833, -61.7000], 'Goyave': [16.1333, -61.5667],
    'Grand-Bourg': [15.8833, -61.3167], 'Lamentin': [16.2667, -61.6333],
    'Le Gosier': [16.2167, -61.4833], 'Le Moule': [16.3333, -61.3500],
    'Morne-à-l\'Eau': [16.3333, -61.4500], 'Petit-Bourg': [16.2000, -61.5833],
    'Petit-Canal': [16.3833, -61.4833], 'Pointe-Noire': [16.2333, -61.7833],
    'Pointe-à-Pitre': [16.2411, -61.5339], 'Port-Louis': [16.4167, -61.5333],
    'Saint-Claude': [16.0167, -61.7000], 'Saint-François': [16.2500, -61.2667],
    'Saint-Louis': [15.9500, -61.3167], 'Sainte-Anne': [16.2333, -61.3833],
    'Sainte-Rose': [16.3333, -61.7000], 'Terre-de-Bas': [15.8500, -61.6333],
    'Terre-de-Haut': [15.8667, -61.5833], 'Trois-Rivières': [15.9667, -61.6500],
    'Vieux-Fort': [15.9500, -61.7000], 'Vieux-Habitants': [16.0500, -61.7500]
  };
  const coords = COORDS[commune];
  if (!coords) return null;
  const [lat, lon] = coords;
  // OpenStreetMap static tile (gratuit, sans API key)
  const zoom = 14;
  return `https://static-maps.yandex.ru/v1?ll=${lon},${lat}&z=${zoom}&size=600,400&l=sat&lang=fr_FR`;
}

// ─── LOOKUP DVF RÉEL ─────────────────────────────────────────────
// Récupère les dernières transactions immobilières réelles via l'API DVF open data
async function fetchDVFData(commune) {
  if (!commune) return null;
  try {
    // Mapping commune → code INSEE (communes Guadeloupe 971)
    const COMMUNE_INSEE = {
      'Abymes': '97101', 'Anse-Bertrand': '97102', 'Baie-Mahault': '97103',
      'Baillif': '97104', 'Basse-Terre': '97105', 'Bouillante': '97106',
      'Capesterre-Belle-Eau': '97107', 'Capesterre-de-Marie-Galante': '97108',
      'Deshaies': '97109', 'Gourbeyre': '97110', 'Goyave': '97111',
      'Grand-Bourg': '97112', 'Lamentin': '97113', 'Le Gosier': '97114',
      'Le Moule': '97115', 'Morne-à-l\'Eau': '97116', 'Petit-Bourg': '97117',
      'Petit-Canal': '97118', 'Pointe-Noire': '97119', 'Pointe-à-Pitre': '97120',
      'Port-Louis': '97121', 'Saint-Claude': '97122', 'Saint-François': '97123',
      'Saint-Louis': '97134', 'Sainte-Anne': '97128', 'Sainte-Rose': '97129',
      'Terre-de-Bas': '97130', 'Terre-de-Haut': '97131', 'Trois-Rivières': '97132',
      'Vieux-Fort': '97133', 'Vieux-Habitants': '97134'
    };
    const codeInsee = COMMUNE_INSEE[commune];
    if (!codeInsee) {
      console.log('[DVF] Commune non trouvée dans la table INSEE:', commune);
      return null;
    }
    // API DVF open data — dernières 2 années
    const url = `https://api.cquest.org/dvf?code_commune=${codeInsee}&nature_mutation=Vente&limit=20`;
    const response = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (!response.ok) return null;
    const data = await response.json();
    if (!data.resultats || data.resultats.length === 0) return null;
    // Extraire les stats pertinentes
    const ventes = data.resultats
      .filter(v => v.valeur_fonciere && v.valeur_fonciere > 0)
      .map(v => ({
        date: v.date_mutation,
        prix: v.valeur_fonciere,
        type: v.type_local || 'Terrain',
        surface: v.surface_terrain || v.surface_reelle_bati || 0,
        prix_m2: (v.surface_terrain || v.surface_reelle_bati) > 0
          ? Math.round(v.valeur_fonciere / (v.surface_terrain || v.surface_reelle_bati))
          : null
      }));
    if (ventes.length === 0) return null;
    const prix_m2_list = ventes.filter(v => v.prix_m2).map(v => v.prix_m2);
    const mediane_m2 = prix_m2_list.length > 0
      ? prix_m2_list.sort((a, b) => a - b)[Math.floor(prix_m2_list.length / 2)]
      : null;
    return {
      nb_transactions: ventes.length,
      mediane_prix_m2: mediane_m2,
      derniere_vente: ventes[0],
      echantillon: ventes.slice(0, 5).map(v =>
        `${v.date} — ${v.type} — ${v.prix.toLocaleString('fr-FR')}€ (${v.surface}m²${v.prix_m2 ? ', ' + v.prix_m2 + '€/m²' : ''})`
      )
    };
  } catch (err) {
    console.warn('[DVF] Lookup failed (non bloquant):', err.message);
    return null;
  }
}

// ─── CONSTRUCTION DU PROMPT IA ───────────────────────────────────
function buildAnalysePrompt(plan, bienData, clientName, dvfData) {
  const base = `Analyse de faisabilité immobilière pour ${clientName} en Guadeloupe.`;
  const bienInfo = Object.entries(bienData)
    .filter(([, v]) => v && String(v).trim())
    .map(([k, v]) => `- ${k}: ${v}`)
    .join('\n');

  // Injecter les données DVF réelles si disponibles
  const dvfSection = dvfData ? `

DONNÉES DVF RÉELLES (source : data.gouv.fr) :
- Nombre de transactions récentes : ${dvfData.nb_transactions}
- Prix médian au m² : ${dvfData.mediane_prix_m2 ? dvfData.mediane_prix_m2 + ' €/m²' : 'Non disponible'}
- Dernières ventes :
${dvfData.echantillon.map(v => '  ' + v).join('\n')}

IMPORTANT : Utilise ces prix DVF réels comme base de ton analyse financière. Ne fabrique PAS de prix — utilise ceux ci-dessus.` : '';

  const planInstructions = {
    essentielle: `Produis une analyse ESSENTIELLE (format court, 1 page A4) :
- Score d'intérêt global /10
- Verdict : GO, PRUDENCE ou STOP
- 3-4 points clés
- Conclusion en 2 phrases

Structure JSON attendue :
{
  "score": <number 1-10>,
  "verdict": "GO" | "PRUDENCE" | "STOP",
  "verdict_texte": "<phrase résumant le verdict>",
  "points_cles": ["<point1>", "<point2>", ...],
  "conclusion": "<2 phrases>"
}`,
    recommandee: `Produis une analyse COMPLÈTE (4 pages A4) :
- Score global /10
- 7 sous-scores détaillés (localisation, rentabilité, risques, PLU, marché, construction, potentiel)
- Verdict : GO, PRUDENCE ou STOP
- Tableau financier complet (prix terrain, construction, frais notaire, total, loyer estimé, rendement)
- Checklist investisseur (5-8 items)
- Conclusion d'expert

Structure JSON attendue :
{
  "score": <number 1-10>,
  "verdict": "GO" | "PRUDENCE" | "STOP",
  "verdict_texte": "<phrase résumant le verdict>",
  "subscores": [{"label": "<nom>", "valeur": <number 1-10>, "commentaire": "<texte>"}],
  "tableau_financier": [{"poste": "<nom>", "detail": "<detail>", "montant": "<montant €>", "type": "normal"|"total"|"highlight"}],
  "checklist": ["<item1>", "<item2>", ...],
  "conclusion": "<paragraphe>"
}`,
    premium: `Produis une analyse PREMIUM (rapport complet + 3 scénarios) :
- Score global /10
- 7 sous-scores détaillés
- Verdict : GO, PRUDENCE ou STOP
- Tableau financier complet
- 3 scénarios (optimiste, réaliste, pessimiste) avec rendements
- Analyse stratégique détaillée
- Checklist investisseur (8-12 items)
- Recommandation détaillée + conclusion d'expert

Structure JSON attendue :
{
  "score": <number 1-10>,
  "verdict": "GO" | "PRUDENCE" | "STOP",
  "verdict_texte": "<phrase résumant le verdict>",
  "subscores": [{"label": "<nom>", "valeur": <number 1-10>, "commentaire": "<texte>"}],
  "tableau_financier": [{"poste": "<nom>", "detail": "<detail>", "montant": "<montant €>", "type": "normal"|"total"|"highlight"}],
  "scenarios": [{"nom": "<Optimiste|Réaliste|Pessimiste>", "rendement": "<X%>", "description": "<texte>"}],
  "analyse_strategique": "<paragraphe>",
  "checklist": ["<item1>", "<item2>", ...],
  "recommandation": "<paragraphe>",
  "conclusion": "<paragraphe>"
}`
  };

  return `${base}

Données du bien :
${bienInfo || '(Données limitées — produis une analyse générale basée sur le marché guadeloupéen)'}
${dvfSection}

${planInstructions[plan] || planInstructions.recommandee}

IMPORTANT : Réponds UNIQUEMENT en JSON valide. Zéro markdown. Zéro backtick.`;
}

// ─── GÉNÉRATION DU RAPPORT VIA ANTHROPIC ─────────────────────────
async function generateReport(apiKey, prompt, plan, bienData) {
  const r1 = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: plan === 'premium' ? 6000 : plan === 'recommandee' ? 4000 : 2000,
      system: `Tu es un expert immobilier senior spécialisé en Guadeloupe pour Karukera Conseil Immobilier (KCI), cabinet fondé par Dereck Rauzduel, architecte EPFL.
Tu maîtrises : marché foncier guadeloupéen, PLU des communes, PPRI, loi littoral, LMNP, prix au m² par secteur, contraintes cycloniques et sismiques (zone 5).
Tu analyses chaque projet avec rigueur et pragmatisme.
Réponds UNIQUEMENT en JSON valide. Zéro markdown. Zéro backtick. Zéro explication hors JSON.`,
      messages: [{ role: 'user', content: prompt }]
    })
  });

  if (!r1.ok) {
    const errText = await r1.text();
    throw new Error(`Anthropic API error ${r1.status}: ${errText.slice(0, 200)}`);
  }

  const d1 = await r1.json();
  const raw = (d1?.content || []).map(b => b.text || '').join('').replace(/```json|```/g, '').trim();
  return JSON.parse(raw);
}

// ─── NOTIFICATION EMAIL ADMIN (avec rapport) ─────────────────────
async function sendAdminNotification(reportId, report) {
  if (!process.env.RESEND_API_KEY) {
    console.error('[webhook] RESEND_API_KEY manquante');
    return;
  }

  const { Resend } = require('resend');
  const resend = new Resend(process.env.RESEND_API_KEY);
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminSecret = process.env.ADMIN_SECRET;

  if (!adminEmail || !adminSecret) {
    console.error('[webhook] ADMIN_EMAIL ou ADMIN_SECRET manquant');
    return;
  }

  const baseUrl = process.env.BASE_URL || 'https://www.karukera-conseil.com';
  const approveToken = crypto.createHmac('sha256', adminSecret).update(`${reportId}:approve`).digest('hex');
  const rejectToken = crypto.createHmac('sha256', adminSecret).update(`${reportId}:reject`).digest('hex');
  const approveUrl = `${baseUrl}/api/validate?id=${reportId}&action=approve&token=${approveToken}`;
  const rejectUrl = `${baseUrl}/api/validate?id=${reportId}&action=reject&token=${rejectToken}`;

  const j = report.analyseJson;
  const scoreColor = j.score >= 7 ? '#2A9D6C' : j.score >= 5 ? '#D48A1A' : '#C43B2E';

  const subScoresHtml = (j.subscores || []).map(ss => {
    const val = ss.valeur ?? ss.val ?? 0;
    return `<tr>
      <td style="padding:6px 0;font-size:12px;color:#6B6B65;border-bottom:1px solid #F0F0EC;">${escapeHtml(ss.label)}</td>
      <td style="padding:6px 0;font-size:12px;font-weight:700;color:${val >= 7 ? '#2A9D6C' : val >= 5 ? '#D48A1A' : '#C43B2E'};text-align:right;border-bottom:1px solid #F0F0EC;">${val}/10</td>
    </tr>`;
  }).join('');

  const planLabel = { essentielle: 'Essentielle (49€)', recommandee: 'Complète (129€)', premium: 'Premium (299€)' };

  await resend.emails.send({
    from: `KCI Analyse <${process.env.FROM_EMAIL || 'noreply@karukera-conseil.com'}>`,
    to: adminEmail,
    subject: `[KCI] Nouveau rapport — ${escapeHtml(report.clientName)} · ${escapeHtml(report.bienData?.commune || 'N/A')} · Score ${j.score}/10`,
    html: `
<!DOCTYPE html><html><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:20px;background:#F7F7F5;font-family:-apple-system,sans-serif;">
<div style="max-width:640px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
  <div style="background:#0B1526;padding:28px 32px;">
    <h1 style="color:#C2A060;font-size:20px;margin:0 0 4px;">KCI — Nouveau rapport a valider</h1>
    <p style="color:rgba(255,255,255,0.45);font-size:13px;margin:0;">Rapport #${reportId.slice(0, 8).toUpperCase()} · ${new Date().toLocaleDateString('fr-FR')} · ${escapeHtml(planLabel[report.plan] || report.plan)}</p>
  </div>
  <div style="padding:28px 32px;">

    <div style="display:flex;align-items:center;gap:20px;background:#F7F7F5;border-radius:10px;padding:16px 20px;margin-bottom:20px;">
      <div style="font-size:42px;font-weight:700;color:${scoreColor};line-height:1;">${j.score}</div>
      <div>
        <h2 style="margin:0 0 4px;font-size:15px;color:#1A1A1A;">${escapeHtml(j.verdict_texte || j.verdict)}</h2>
        <p style="margin:0;font-size:13px;color:#6B6B65;">${escapeHtml(report.bienData?.type_bien || '')} · ${escapeHtml(report.bienData?.commune || '')}</p>
      </div>
    </div>

    <div style="background:#F7F7F5;border-radius:8px;padding:14px 18px;margin-bottom:16px;font-size:13px;color:#6B6B65;">
      <strong style="color:#1A1A1A;">Client :</strong> ${escapeHtml(report.clientName)}<br>
      <strong style="color:#1A1A1A;">Email :</strong> ${escapeHtml(report.clientEmail)}<br>
      <strong style="color:#1A1A1A;">Tel :</strong> ${escapeHtml(report.clientPhone || 'Non renseigné')}<br>
      <strong style="color:#1A1A1A;">Stripe :</strong> ${escapeHtml(report.stripeSessionId || '')}
    </div>

    ${subScoresHtml ? `
    <div style="margin-bottom:16px;">
      <h3 style="font-size:13px;font-weight:600;color:#0B1526;margin:0 0 8px;">Sous-scores</h3>
      <table style="width:100%;border-collapse:collapse;">${subScoresHtml}</table>
    </div>` : ''}

    <div style="background:#FFFBEB;border-left:4px solid #D48A1A;padding:12px 16px;margin:16px 0;border-radius:6px;">
      <strong style="color:#92400E;font-size:12px;">Conclusion :</strong>
      <p style="margin:4px 0 0;font-size:13px;color:#92400E;">${escapeHtml(j.conclusion || j.recommandation || '')}</p>
    </div>

    <div style="display:flex;gap:12px;margin:24px 0;">
      <a href="${approveUrl}" style="padding:14px 24px;border-radius:8px;font-size:14px;font-weight:600;text-decoration:none;background:#2A9D6C;color:#fff;display:inline-block;">Approuver et envoyer</a>
      <a href="${rejectUrl}" style="padding:14px 24px;border-radius:8px;font-size:14px;font-weight:600;text-decoration:none;background:#F3F4F6;color:#374151;border:1px solid #E5E7EB;display:inline-block;">Refuser</a>
    </div>

    <p style="font-size:11px;color:#9C9C94;border-top:1px solid #E8E8E4;padding-top:16px;margin-top:16px;">
      Ref : ${reportId} · Lien valable 48h · KCI v7
    </p>
  </div>
</div>
</body></html>`
  });
}

// ─── NOTIFICATION ADMIN SANS RAPPORT (fallback si IA échoue) ─────
async function sendAdminNotificationNoReport(clientName, clientEmail, clientPhone, plan, bienData, stripeSessionId) {
  if (!process.env.RESEND_API_KEY || !process.env.ADMIN_EMAIL) return;

  const { Resend } = require('resend');
  const resend = new Resend(process.env.RESEND_API_KEY);

  const bienInfo = Object.entries(bienData || {})
    .filter(([, v]) => v && String(v).trim())
    .map(([k, v]) => `<strong>${escapeHtml(k)} :</strong> ${escapeHtml(String(v))}`)
    .join('<br>');

  const planLabel = { essentielle: 'Essentielle (49€)', recommandee: 'Complète (129€)', premium: 'Premium (299€)' };

  await resend.emails.send({
    from: `KCI Analyse <${process.env.FROM_EMAIL || 'noreply@karukera-conseil.com'}>`,
    to: process.env.ADMIN_EMAIL,
    subject: `[KCI] URGENT — Paiement recu, rapport non genere — ${escapeHtml(clientName)}`,
    html: `
<!DOCTYPE html><html><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:20px;background:#F7F7F5;font-family:-apple-system,sans-serif;">
<div style="max-width:560px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
  <div style="background:#C43B2E;padding:24px 32px;">
    <h1 style="color:#fff;font-size:18px;margin:0;">Paiement recu — Rapport non genere</h1>
    <p style="color:rgba(255,255,255,0.7);font-size:12px;margin:4px 0 0;">L'IA n'a pas pu generer le rapport. Action manuelle requise.</p>
  </div>
  <div style="padding:24px 32px;">
    <div style="background:#F7F7F5;border-radius:8px;padding:14px 18px;margin-bottom:16px;font-size:13px;color:#6B6B65;">
      <strong>Client :</strong> ${escapeHtml(clientName)}<br>
      <strong>Email :</strong> ${escapeHtml(clientEmail)}<br>
      <strong>Tel :</strong> ${escapeHtml(clientPhone || 'N/A')}<br>
      <strong>Plan :</strong> ${escapeHtml(planLabel[plan] || plan)}<br>
      <strong>Stripe :</strong> ${escapeHtml(stripeSessionId)}
    </div>
    ${bienInfo ? `<div style="background:#FEF3C7;border-radius:8px;padding:14px 18px;font-size:12px;color:#92400E;">${bienInfo}</div>` : ''}
    <p style="font-size:13px;color:#6B6B65;margin:16px 0 0;">Veuillez generer le rapport manuellement et l'envoyer au client.</p>
  </div>
</div>
</body></html>`
  });
}

module.exports = handler;

module.exports.config = {
  api: { bodyParser: false },
};
