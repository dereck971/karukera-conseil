// api/test-pipeline.js — Test du pipeline complet (sans Stripe)
// Appel : POST /api/test-pipeline avec { "testEmail": "ton@email.com" }
// Simule : génération IA → stockage KV → email admin

const crypto = require('crypto');

let kvStore;
try { kvStore = require('@vercel/kv'); } catch (e) { kvStore = null; }
const memoryFallback = global._kciPending || (global._kciPending = new Map());
const reportStore = {
  async set(key, value, options = {}) {
    if (kvStore) {
      await kvStore.set(`report:${key}`, JSON.stringify(value), { ex: options.ttl || 7 * 24 * 3600 });
      return 'kv';
    }
    memoryFallback.set(key, value);
    return 'memory';
  }
};

function escapeHtml(str) {
  if (typeof str !== 'string') return '';
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'POST only' });
  }

  const steps = [];
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminSecret = process.env.ADMIN_SECRET;
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  const resendKey = process.env.RESEND_API_KEY;

  steps.push({ step: 'env_check', adminEmail: !!adminEmail, adminSecret: !!adminSecret, anthropicKey: !!anthropicKey, resendKey: !!resendKey });

  // Step 1: Generate report via Anthropic
  let analyseJson;
  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': anthropicKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1500,
        system: 'Tu es un expert immobilier en Guadeloupe. Réponds UNIQUEMENT en JSON valide.',
        messages: [{ role: 'user', content: `Analyse rapide : terrain 500m² à Sainte-Anne, budget 150000€, objectif location saisonnière.
Réponds en JSON : {"score": <1-10>, "verdict": "GO"|"PRUDENCE"|"STOP", "verdict_texte": "<phrase>", "points_cles": ["..."], "conclusion": "<2 phrases>"}` }]
      })
    });

    const status = r.status;
    steps.push({ step: 'anthropic_call', status });

    if (!r.ok) {
      const errText = await r.text();
      steps.push({ step: 'anthropic_error', body: errText.slice(0, 300) });
      return res.status(200).json({ success: false, steps });
    }

    const d = await r.json();
    const raw = (d?.content || []).map(b => b.text || '').join('').replace(/```json|```/g, '').trim();
    analyseJson = JSON.parse(raw);
    steps.push({ step: 'anthropic_parsed', score: analyseJson.score, verdict: analyseJson.verdict });
  } catch (e) {
    steps.push({ step: 'anthropic_crash', error: e.message });
    return res.status(200).json({ success: false, steps });
  }

  // Step 2: Store in KV
  const reportId = crypto.randomBytes(12).toString('hex');
  try {
    const storeType = await reportStore.set(reportId, {
      id: reportId,
      status: 'test',
      clientEmail: 'test@test.com',
      clientName: 'Test Pipeline',
      analyseJson
    });
    steps.push({ step: 'store', type: storeType, reportId });
  } catch (e) {
    steps.push({ step: 'store_error', error: e.message });
  }

  // Step 3: Send admin email
  try {
    const { Resend } = require('resend');
    const resend = new Resend(resendKey);
    const fromEmail = process.env.FROM_EMAIL || 'noreply@karukera-conseil.com';
    const baseUrl = process.env.BASE_URL || 'https://www.karukera-conseil.com';

    const approveToken = crypto.createHmac('sha256', adminSecret).update(`${reportId}:approve`).digest('hex');
    const approveUrl = `${baseUrl}/api/validate?id=${reportId}&action=approve&token=${approveToken}`;

    const result = await resend.emails.send({
      from: `KCI Test <${fromEmail}>`,
      to: adminEmail,
      subject: `[KCI TEST] Pipeline OK — Score ${analyseJson.score}/10`,
      html: `<div style="font-family:sans-serif;padding:20px;">
        <h2 style="color:#2A9D6C;">Pipeline de rapport KCI fonctionnel</h2>
        <p><strong>Score :</strong> ${analyseJson.score}/10</p>
        <p><strong>Verdict :</strong> ${escapeHtml(analyseJson.verdict_texte || analyseJson.verdict)}</p>
        <p><strong>Report ID :</strong> ${reportId}</p>
        <p><a href="${approveUrl}" style="background:#2A9D6C;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;">Test Approuver</a></p>
        <p style="color:#999;font-size:12px;">Ceci est un test du pipeline. Si tu recois cet email, tout fonctionne.</p>
      </div>`
    });

    steps.push({ step: 'email_sent', resendId: result?.data?.id || result?.id, error: result?.error });
  } catch (e) {
    steps.push({ step: 'email_error', error: e.message, stack: e.stack?.split('\n').slice(0, 3) });
  }

  return res.status(200).json({ success: true, steps });
};
