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
async function getRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
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

  // 4. Construire le prompt IA selon le plan
  const prompt = buildAnalysePrompt(plan, bienData, clientName);

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
    emailSent: false
  };

  await reportStore.set(reportId, reportData);
  console.log('[webhook] Rapport stocké:', reportId);

  // 7. Envoyer notification email admin avec boutons approuver/refuser
  await sendAdminNotification(reportId, reportData);
  console.log('[webhook] Email admin envoyé pour rapport:', reportId);
}

// ─── CONSTRUCTION DU PROMPT IA ───────────────────────────────────
function buildAnalysePrompt(plan, bienData, clientName) {
  const base = `Analyse de faisabilité immobilière pour ${clientName} en Guadeloupe.`;
  const bienInfo = Object.entries(bienData)
    .filter(([, v]) => v && String(v).trim())
    .map(([k, v]) => `- ${k}: ${v}`)
    .join('\n');

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
