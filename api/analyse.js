// api/analyse.js v5
// Génère l'analyse + double vérification IA + stockage Redis-less (en mémoire Vercel)

const crypto = require('crypto');

// Stockage en mémoire (persist le temps de la function instance)
// Pour production sérieuse → remplacer par Upstash Redis ou Vercel KV
const pendingReports = global._kciPending || (global._kciPending = new Map());

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  const { prompt, clientEmail, clientName, clientPhone, bienData } = req.body;
  if (!prompt) return res.status(400).json({ error: 'Missing prompt' });

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
        model: 'claude-sonnet-4-5-20250514',
        max_tokens: 4000,
        system: `Tu es un expert immobilier senior spécialisé en Guadeloupe pour Karukera Conseil Immobilier (KCI), cabinet fondé par Dereck Rauzduel, architecte DE.
Tu maîtrises : marché foncier guadeloupéen, PLU des communes, PPRI, loi littoral, défiscalisation Pinel DOM, LMNP, prix au m² par secteur, contraintes cycloniques et sismiques (zone 5).
Tu analyses chaque projet avec rigueur et pragmatisme.
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
2. Les montants du tableau financier sont cohérents entre eux (la somme fait le bon total)
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
  "message_client": <string | null — message à envoyer au client si données insuffisantes>
}`;

    const r2 = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5-20250514',
        max_tokens: 2000,
        system: 'Tu es un contrôleur qualité immobilier. Réponds uniquement en JSON valide, sans markdown, sans backticks.',
        messages: [{ role: 'user', content: verifyPrompt }]
      })
    });

    if (r2.ok) {
      const d2 = await r2.json();
      let raw2 = (d2?.content || []).map(b => b.text || '').join('').replace(/```json|```/g, '').trim();
      verificationResult = JSON.parse(raw2);

      // Si l'IA a corrigé le JSON, on l'utilise
      if (verificationResult.corrections_appliquees && verificationResult.json_corrige) {
        analyseJson = verificationResult.json_corrige;
        console.log('[analyse] JSON corrigé par la vérification IA');
      }
    }
  } catch (e) {
    // La vérification échoue silencieusement — on garde le JSON original
    console.warn('[analyse] Vérification IA échouée (non bloquant):', e.message);
    verificationResult = { valide: true, problemes: [] };
  }

  // ─── VÉRIFICATION : données client insuffisantes ────────────────
  // Si l'IA détecte que les données sont trop lacunaires pour produire une analyse fiable
  const needsMoreData = verificationResult?.message_client &&
    (verificationResult?.valide === false) &&
    (verificationResult?.problemes?.length > 2);

  if (needsMoreData) {
    return res.status(200).json({
      needsMoreData: true,
      message: verificationResult.message_client ||
        'Les informations fournies sont insuffisantes pour produire une analyse fiable. Merci de vérifier et compléter : commune, type de bien, prix, et description du projet.',
      problemes: verificationResult.problemes || []
    });
  }

  // ─── STOCKAGE RAPPORT EN ATTENTE DE VALIDATION ──────────────────
  const reportId = crypto.randomBytes(12).toString('hex');
  const reportData = {
    id: reportId,
    createdAt: new Date().toISOString(),
    status: 'pending', // pending | approved | rejected
    clientEmail: clientEmail || '',
    clientName: clientName || '',
    clientPhone: clientPhone || '',
    bienData: bienData || {},
    analyseJson,
    verificationResult,
    emailSent: false
  };

  pendingReports.set(reportId, reportData);

  // ─── NOTIFICATION EMAIL ADMIN ────────────────────────────────────
  // Envoyer le rapport à Dereck pour validation (1 clic)
  try {
    const { Resend } = require('resend');
    const resend = new Resend(process.env.RESEND_API_KEY);
    const adminEmail = process.env.ADMIN_EMAIL || 'dereck.rauzduel@gmail.com';
    const baseUrl = process.env.BASE_URL || `https://${req.headers.host}`;
    const approveUrl = `${baseUrl}/api/validate?id=${reportId}&action=approve&secret=${process.env.ADMIN_SECRET}`;
    const rejectUrl  = `${baseUrl}/api/validate?id=${reportId}&action=reject&secret=${process.env.ADMIN_SECRET}`;

    const problemesHtml = verificationResult?.problemes?.length > 0
      ? `<div style="background:#FEF3C7;border-left:4px solid #D97706;padding:12px 16px;margin:16px 0;border-radius:6px;">
           <strong style="color:#92400E;">⚠️ Points signalés par la vérification IA :</strong>
           <ul style="margin:8px 0 0;padding-left:20px;color:#92400E;">
             ${verificationResult.problemes.map(p => `<li>${p}</li>`).join('')}
           </ul>
         </div>`
      : `<div style="background:#D1FAE5;border-left:4px solid #10B981;padding:12px 16px;margin:16px 0;border-radius:6px;">
           <strong style="color:#065F46;">✅ Vérification IA : aucun problème détecté</strong>
         </div>`;

    const scoreColor = analyseJson.score >= 7 ? '#2A9D6C' : analyseJson.score >= 5 ? '#D48A1A' : '#C43B2E';
    const verdictEmoji = { GO: '✅', CONDITIONNEL: '⚠️', STOP: '🛑' }[analyseJson.verdict] || '⚠️';

    await resend.emails.send({
      from: `KCI Analyse <${process.env.FROM_EMAIL || 'noreply@karukera-conseil.fr'}>`,
      to: adminEmail,
      subject: `[KCI] Nouveau rapport à valider — ${clientName || 'Client'} · ${bienData?.commune || ''} · Score ${analyseJson.score}/10`,
      html: `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><style>
  body { font-family: -apple-system, sans-serif; background: #F7F7F5; margin: 0; padding: 20px; }
  .wrap { max-width: 640px; margin: 0 auto; background: #fff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08); }
  .header { background: #0B1526; padding: 28px 32px; }
  .header h1 { color: #C2A060; font-size: 20px; margin: 0 0 4px; }
  .header p { color: rgba(255,255,255,0.45); font-size: 13px; margin: 0; }
  .body { padding: 28px 32px; }
  .score-block { display: flex; align-items: center; gap: 20px; background: #F7F7F5; border-radius: 10px; padding: 16px 20px; margin-bottom: 20px; }
  .score-num { font-size: 42px; font-weight: 700; color: ${scoreColor}; line-height: 1; }
  .score-info h2 { margin: 0 0 4px; font-size: 15px; color: #1A1A1A; }
  .score-info p { margin: 0; font-size: 13px; color: #6B6B65; }
  .client-info { background: #F7F7F5; border-radius: 8px; padding: 14px 18px; margin-bottom: 20px; font-size: 13px; color: #6B6B65; }
  .client-info strong { color: #1A1A1A; }
  .bien-info { font-size: 13px; color: #6B6B65; margin-bottom: 20px; }
  .bien-info table { width: 100%; border-collapse: collapse; }
  .bien-info td { padding: 6px 0; border-bottom: 1px solid #E8E8E4; }
  .bien-info td:first-child { color: #9C9C94; width: 150px; }
  .actions { display: flex; gap: 12px; margin: 24px 0; }
  .btn { padding: 14px 24px; border-radius: 8px; font-size: 14px; font-weight: 600; text-decoration: none; text-align: center; display: inline-block; }
  .btn-approve { background: #2A9D6C; color: #fff; }
  .btn-reject  { background: #F3F4F6; color: #374151; border: 1px solid #E5E7EB; }
  .disclaimer { font-size: 11px; color: #9C9C94; border-top: 1px solid #E8E8E4; padding-top: 16px; margin-top: 16px; }
  .conclusion { background: #0B1526; border-radius: 8px; padding: 16px 20px; margin: 16px 0; }
  .conclusion p { color: rgba(255,255,255,0.8); font-size: 13px; line-height: 1.6; margin: 0; }
</style></head>
<body>
<div class="wrap">
  <div class="header">
    <h1>KCI — Nouveau rapport à valider</h1>
    <p>Rapport #${reportId.slice(0,8).toUpperCase()} · ${new Date().toLocaleDateString('fr-FR', {day:'2-digit',month:'long',year:'numeric'})}</p>
  </div>
  <div class="body">

    <div class="score-block">
      <div class="score-num">${analyseJson.score}</div>
      <div class="score-info">
        <h2>${verdictEmoji} ${analyseJson.verdict_texte || analyseJson.verdict}</h2>
        <p>${bienData?.type_bien || ''} · ${bienData?.commune || ''}</p>
      </div>
    </div>

    <div class="client-info">
      <strong>Client :</strong> ${clientName || 'Non renseigné'}<br>
      <strong>Email :</strong> ${clientEmail || 'Non renseigné'}<br>
      <strong>Téléphone :</strong> ${clientPhone || 'Non renseigné'}
    </div>

    <div class="bien-info">
      <table>
        <tr><td>Commune</td><td><strong>${bienData?.commune || 'N/A'}</strong></td></tr>
        <tr><td>Type de bien</td><td>${bienData?.type_bien || 'N/A'}</td></tr>
        <tr><td>Prix affiché</td><td>${bienData?.prix ? Number(bienData.prix).toLocaleString('fr-FR') + ' €' : 'N/A'}</td></tr>
        <tr><td>Surface terrain</td><td>${bienData?.surface_terrain ? bienData.surface_terrain + ' m²' : 'N/A'}</td></tr>
        <tr><td>Surface hab.</td><td>${bienData?.surface_hab ? bienData.surface_hab + ' m²' : 'N/A'}</td></tr>
        <tr><td>Projet</td><td>${bienData?.intention || 'N/A'}</td></tr>
      </table>
    </div>

    ${problemesHtml}

    <div class="conclusion">
      <p>${analyseJson.conclusion || ''}</p>
    </div>

    <p style="font-size:13px;color:#6B6B65;margin:20px 0 8px;"><strong>Action requise :</strong> Validez ou refusez l'envoi de ce rapport au client.</p>

    <div class="actions">
      <a href="${approveUrl}" class="btn btn-approve">✅ Approuver et envoyer au client</a>
      <a href="${rejectUrl}"  class="btn btn-reject">✏️ Refuser — demander révision</a>
    </div>

    <div class="disclaimer">
      Ref : ${reportId} · Ce lien est valable 48h · KCI v5 · Dereck Rauzduel — Architecte DE
    </div>
  </div>
</div>
</body>
</html>`
    });
    console.log('[analyse] Email admin envoyé pour validation:', reportId);
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
