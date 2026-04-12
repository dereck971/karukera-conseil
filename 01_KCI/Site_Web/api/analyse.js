// api/analyse.js v7
// Génère l'analyse + double vérification IA + notification admin

const crypto = require('crypto');
const { getBaseUrl, rateLimit, getClientIp } = require('./_lib/security');

// ─── STOCKAGE PERSISTANT ──────────────────────────────────────────
// Utilise Vercel KV si disponible, sinon fallback RAM (dev local)
let kvClient = null;
try {
  if (process.env.KV_REST_API_URL) {
    kvClient = require('@vercel/kv').kv;
  }
} catch (e) {
  kvClient = null;
}

const memoryFallback = global._kciPending || (global._kciPending = new Map());

const store = {
  async get(key) {
    if (kvClient) {
      try {
        return await kvClient.get(`report:${key}`);
      } catch (e) {
        console.error('[store] KV get error:', e.message);
        return memoryFallback.get(key) || null;
      }
    }
    return memoryFallback.get(key) || null;
  },
  async set(key, value, options = {}) {
    if (kvClient) {
      try {
        // TTL de 7 jours par défaut
        await kvClient.set(`report:${key}`, JSON.stringify(value), { ex: options.ttl || 7 * 24 * 3600 });
      } catch (e) {
        console.error('[store] KV set error:', e.message);
        memoryFallback.set(key, value);
      }
    } else {
      memoryFallback.set(key, value);
    }
  }
};

module.exports = async (req, res) => {
  const allowedOrigin = process.env.ALLOWED_ORIGIN || 'https://www.karukera-conseil.com';
  res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  // ─── RATE LIMITING (5 requêtes/min par IP) ─────────────────────
  const clientIp = getClientIp(req);
  if (!rateLimit(clientIp, 5, 60000)) {
    return res.status(429).json({ error: 'Trop de requêtes. Réessayez dans 1 minute.' });
  }

  const { prompt, clientEmail, clientName, clientPhone, bienData } = req.body;
  if (!prompt) return res.status(400).json({ error: 'Missing prompt' });

  // ─── VALIDATION DES CHAMPS ──────────────────────────────────────
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const phoneRegex = /^[\d\s\-+().]{7,20}$/;

  if (clientEmail && !emailRegex.test(clientEmail)) {
    return res.status(400).json({ error: 'Adresse email invalide.' });
  }
  if (clientPhone && !phoneRegex.test(clientPhone)) {
    return res.status(400).json({ error: 'Numéro de téléphone invalide.' });
  }
  if (!clientName || clientName.trim().length < 2) {
    return res.status(400).json({ error: 'Le nom est obligatoire (minimum 2 caractères).' });
  }
  if (!clientEmail) {
    return res.status(400).json({ error: 'L\'adresse email est obligatoire.' });
  }

  const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;

  // ─── ÉTAPE 1 : GÉNÉRATION PRINCIPALE ────────────────────────────
  let analyseJson;
  try {
    const r1 = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 5000,
        system: `Tu es un expert immobilier senior spécialisé en Guadeloupe pour Karukera Conseil Immobilier (KCI), cabinet fondé par Dereck Rauzduel, architecte EPFL.

EXPERTISE MARCHÉ :
Tu maîtrises : marché foncier guadeloupéen, PLU des 32 communes, PPRI, loi littoral, prix au m² par secteur, contraintes cycloniques et sismiques (zone 5). Prix construction réaliste : 1 500-1 800 €/m² TTC all-in.

EXPERTISE FISCALE OM 2026 (TOUJOURS ANALYSER) :
Pinel Outre-Mer = FERMÉ depuis 31/12/2024. NE JAMAIS PROPOSER.
Dispositifs actifs : CIOP (art. 244 quater W, crédit impôt 35-38.25% hors plafond niches), LLI (TVA 10% + exo TF 20 ans hors plafond), Girardin industriel (one-shot 110-115%, jusqu'à 2029), Girardin logement social (jusqu'à 60k€, jusqu'à 2029), Denormandie OM (23/29/32% sur 6/9/12 ans, Basse-Terre éligible zone ORT), Déficit foncier (10 700€/an, 21 400€ rénov énergétique), Loc'Avantages (20-65%), LMNP réel (amortissement 2-3.5%/an, PS 18.6% en 2026), PTZ OM (zone B1, jusqu'à 2027).
Subventions : MaPrimeRénov OM, Éco-PTZ, LBU, ANAH, ADEME, ZFANG, LODEOM (réformé 2026, 6 barèmes), ACRE.

RÈGLES : Le score global DOIT intégrer le potentiel fiscal. Toujours identifier les dispositifs éligibles et chiffrer l'impact.
Réponds UNIQUEMENT en JSON valide. Zéro markdown. Zéro backtick. Zéro explication hors JSON.`,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    if (!r1.ok) {
      const err = await r1.text();
      console.error('[analyse] Anthropic step1 error:', err);
      return res.status(500).json({ error: 'Anthropic API error', detail: err });
    }

    const d1 = await r1.json();
    let raw1 = (d1?.content || []).map(b => b.text || '').join('').replace(/```json|```/g, '').trim();
    analyseJson = JSON.parse(raw1);
  } catch (e) {
    console.error('[analyse] Step1 parse error:', e.message);
    return res.status(500).json({ error: 'Erreur génération analyse', detail: e.message });
  }

  // ─── ÉTAPE 2 : VÉRIFICATION IA (double-check) ───────────────────
  let verificationResult;
  try {
    const verifyPrompt = `Tu es un contrôleur qualité expert immobilier KCI.
Vérifie cet objet JSON d'analyse immobilière et détecte toute erreur, incohérence ou donnée suspecte.

JSON à vérifier :
${JSON.stringify(analyseJson, null, 2)}

Données brutes fournies par le client :
${JSON.stringify(bienData || {}, null, 2)}

Règles de vérification :
1. Le score /10 est cohérent avec les sous-scores (écart max ±1 point)
2. Les montants du tableau financier sont cohérents entre eux
3. Le verdict (GO/CONDITIONNEL/STOP) correspond à la plage du score
4. Les hypothèses sont réalistes pour le marché guadeloupéen (coûts construction 1800-2500€/m², loyers T2 450-650€/mois)
5. Il n'y a pas d'information contradictoire ou absurde
6. La conclusion est cohérente avec le score et le verdict

Réponds UNIQUEMENT en JSON valide avec cette structure :
{
  "valide": <true | false>,
  "score_coherent": <true | false>,
  "montants_coherents": <true | false>,
  "verdict_coherent": <true | false>,
  "hypotheses_realistes": <true | false>,
  "problemes": [<string>, ...],
  "corrections_appliquees": <true | false>,
  "json_corrige": <objet JSON corrigé si corrections appliquées, null sinon>,
  "message_client": <string | null>
}`;

    const r2 = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2000,
        system: 'Tu es un contrôleur qualité immobilier. Réponds uniquement en JSON valide, sans markdown, sans backticks.',
        messages: [{ role: 'user', content: verifyPrompt }]
      })
    });

    if (r2.ok) {
      const d2 = await r2.json();
      let raw2 = (d2?.content || []).map(b => b.text || '').join('').replace(/```json|```/g, '').trim();
      verificationResult = JSON.parse(raw2);

      if (verificationResult.corrections_appliquees && verificationResult.json_corrige) {
        analyseJson = verificationResult.json_corrige;
        console.log('[analyse] JSON corrigé par la vérification IA');
      }
    }
  } catch (e) {
    console.warn('[analyse] Vérification IA échouée — rapport mis en attente manuelle:', e.message);
    verificationResult = { valide: false, problemes: ['Vérification IA indisponible — contrôle manuel requis'], verification_failed: true };
  }

  // ─── VÉRIFICATION : données client insuffisantes ────────────────
  const needsMoreData = verificationResult?.message_client &&
    (verificationResult?.valide === false) &&
    (verificationResult?.problemes?.length > 2);

  if (needsMoreData) {
    return res.status(200).json({
      needsMoreData: true,
      message: verificationResult.message_client ||
        'Les informations fournies sont insuffisantes pour produire une analyse fiable.',
      problemes: verificationResult.problemes || []
    });
  }

  // ─── STOCKAGE RAPPORT EN ATTENTE DE VALIDATION ──────────────────
  const reportId = crypto.randomBytes(12).toString('hex');
  const reportData = {
    id: reportId,
    createdAt: new Date().toISOString(),
    status: 'pending',
    clientEmail: clientEmail || '',
    clientName: clientName || '',
    clientPhone: clientPhone || '',
    bienData: bienData || {},
    analyseJson,
    verificationResult,
    emailSent: false
  };

  await store.set(reportId, reportData);

  // ─── NOTIFICATION EMAIL ADMIN ────────────────────────────────────
  try {
    const { Resend } = require('resend');
    const resend = new Resend(process.env.RESEND_API_KEY);
    const adminEmail = process.env.ADMIN_EMAIL || 'dereck.rauzduel@gmail.com';
    const baseUrl = getBaseUrl();
    const approveToken = crypto.createHmac('sha256', process.env.ADMIN_SECRET).update(`${reportId}:approve`).digest('hex');
    const rejectToken  = crypto.createHmac('sha256', process.env.ADMIN_SECRET).update(`${reportId}:reject`).digest('hex');
    const approveUrl = `${baseUrl}/api/validate?id=${reportId}&action=approve&token=${approveToken}`;
    const rejectUrl  = `${baseUrl}/api/validate?id=${reportId}&action=reject&token=${rejectToken}`;

    const problemesHtml = verificationResult?.problemes?.length > 0
      ? `<div style="background:#FEF3C7;border-left:4px solid #D97706;padding:12px 16px;margin:16px 0;border-radius:6px;">
           <strong style="color:#92400E;">Points signalés par la vérification IA :</strong>
           <ul style="margin:8px 0 0;padding-left:20px;color:#92400E;">
             ${verificationResult.problemes.map(p => `<li>${p}</li>`).join('')}
           </ul>
         </div>`
      : `<div style="background:#D1FAE5;border-left:4px solid #10B981;padding:12px 16px;margin:16px 0;border-radius:6px;">
           <strong style="color:#065F46;">Vérification IA : aucun problème détecté</strong>
         </div>`;

    const scoreColor = analyseJson.score >= 7 ? '#2A9D6C' : analyseJson.score >= 5 ? '#D48A1A' : '#C43B2E';

    await resend.emails.send({
      from: `KCI Analyse <${process.env.FROM_EMAIL || 'noreply@karukera-conseil.fr'}>`,
      to: adminEmail,
      subject: `[KCI] Nouveau rapport — ${clientName || 'Client'} · ${bienData?.commune || ''} · Score ${analyseJson.score}/10`,
      html: `
<!DOCTYPE html><html><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:20px;background:#F7F7F5;font-family:-apple-system,sans-serif;">
<div style="max-width:640px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
  <div style="background:#0B1526;padding:28px 32px;">
    <h1 style="color:#C2A060;font-size:20px;margin:0 0 4px;">KCI — Nouveau rapport à valider</h1>
    <p style="color:rgba(255,255,255,0.45);font-size:13px;margin:0;">Rapport #${reportId.slice(0,8).toUpperCase()} · ${new Date().toLocaleDateString('fr-FR')}</p>
  </div>
  <div style="padding:28px 32px;">
    <div style="display:flex;align-items:center;gap:20px;background:#F7F7F5;border-radius:10px;padding:16px 20px;margin-bottom:20px;">
      <div style="font-size:42px;font-weight:700;color:${scoreColor};line-height:1;">${analyseJson.score}</div>
      <div>
        <h2 style="margin:0 0 4px;font-size:15px;color:#1A1A1A;">${analyseJson.verdict_texte || analyseJson.verdict}</h2>
        <p style="margin:0;font-size:13px;color:#6B6B65;">${bienData?.type_bien || ''} · ${bienData?.commune || ''}</p>
      </div>
    </div>
    <div style="background:#F7F7F5;border-radius:8px;padding:14px 18px;margin-bottom:20px;font-size:13px;color:#6B6B65;">
      <strong style="color:#1A1A1A;">Client :</strong> ${clientName || 'Non renseigné'}<br>
      <strong style="color:#1A1A1A;">Email :</strong> ${clientEmail || 'Non renseigné'}<br>
      <strong style="color:#1A1A1A;">Téléphone :</strong> ${clientPhone || 'Non renseigné'}
    </div>
    ${problemesHtml}
    <div style="display:flex;gap:12px;margin:24px 0;">
      <a href="${approveUrl}" style="padding:14px 24px;border-radius:8px;font-size:14px;font-weight:600;text-decoration:none;background:#2A9D6C;color:#fff;">Approuver et envoyer</a>
      <a href="${rejectUrl}" style="padding:14px 24px;border-radius:8px;font-size:14px;font-weight:600;text-decoration:none;background:#F3F4F6;color:#374151;border:1px solid #E5E7EB;">Refuser</a>
    </div>
    <p style="font-size:11px;color:#9C9C94;border-top:1px solid #E8E8E4;padding-top:16px;margin-top:16px;">
      Ref : ${reportId} · Lien valable 48h · KCI v6 · Dereck Rauzduel — Architecte EPFL
    </p>
  </div>
</div>
</body></html>`
    });
    console.log('[analyse] Email admin envoyé:', reportId);
  } catch (emailErr) {
    console.error('[analyse] Email admin error (non bloquant):', emailErr.message);
  }

  // ─── RÉPONSE AU CLIENT ───────────────────────────────────────────
  return res.status(200).json({
    content: [{ text: JSON.stringify(analyseJson) }],
    reportId,
    verified: verificationResult?.valide !== false,
    verificationProblemes: verificationResult?.problemes || []
  });
};
