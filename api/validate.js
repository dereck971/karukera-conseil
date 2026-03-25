// api/validate.js v6
// Endpoint de validation admin : approve → envoie email client / reject → demande révision

const crypto = require('crypto');

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
        const raw = await kvClient.get(`report:${key}`);
        return raw ? (typeof raw === 'string' ? JSON.parse(raw) : raw) : null;
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

// Génère un token HMAC signé à usage unique
function generateAdminToken(reportId, action) {
  const secret = process.env.ADMIN_SECRET;
  if (!secret) throw new Error('ADMIN_SECRET not configured');
  const payload = `${reportId}:${action}`;
  const sig = crypto.createHmac('sha256', secret).update(payload).digest('hex');
  return sig;
}

// Vérifie le token HMAC
function verifyAdminToken(reportId, action, token) {
  const expected = generateAdminToken(reportId, action);
  const tokenBuf = Buffer.from(String(token));
  const expectedBuf = Buffer.from(expected);
  if (tokenBuf.length !== expectedBuf.length) return false;
  return crypto.timingSafeEqual(tokenBuf, expectedBuf);
}

module.exports = async (req, res) => {
  const { id, action, token } = req.query;

  if (!id || !action || !token) {
    return res.status(400).send(html('Paramètre manquant', 'Lien invalide ou incomplet.', '#C43B2E'));
  }

  try {
    if (!verifyAdminToken(id, action, token)) {
      return res.status(403).send(html('Accès refusé', 'Lien invalide ou expiré.', '#C43B2E'));
    }
  } catch (e) {
    return res.status(403).send(html('Accès refusé', 'Lien invalide ou expiré.', '#C43B2E'));
  }

  const report = await store.get(id);
  if (!report) {
    return res.status(404).send(html(
      'Rapport introuvable',
      'Ce rapport a déjà été traité ou le serveur a redémarré.',
      '#D48A1A'
    ));
  }

  if (report.status !== 'pending') {
    return res.status(200).send(html(
      'Déjà traité',
      `Ce rapport a déjà été <strong>${report.status === 'approved' ? 'approuvé' : 'refusé'}</strong>.`,
      '#2A9D6C'
    ));
  }

  // ─── APPROUVER ──────────────────────────────────────────────────
  if (action === 'approve') {
    report.status = 'approved';
    await store.set(id, report);

    try {
      await sendReportToClient(report);
      report.emailSent = true;
      await store.set(id, report);
      // Rapport approuvé + email client envoyé
    } catch (e) {
      console.error('[validate] Erreur envoi email client:', e.message);
      return res.status(500).send(html(
        'Erreur envoi',
        `Rapport approuvé mais l'email client a échoué : ${escapeHtml(e.message)}`,
        '#C43B2E'
      ));
    }

    return res.status(200).send(html(
      'Rapport envoyé au client',
      `Le rapport a été approuvé et envoyé à <strong>${escapeHtml(report.clientEmail)}</strong>.`,
      '#2A9D6C'
    ));
  }

  // ─── REFUSER ────────────────────────────────────────────────────
  if (action === 'reject') {
    report.status = 'rejected';
    await store.set(id, report);

    try {
      await sendRevisionRequestToClient(report);
      // Demande de révision envoyée au client
    } catch (e) {
      console.error('[validate] Erreur envoi demande révision:', e.message);
    }

    return res.status(200).send(html(
      'Demande de révision envoyée',
      `Un email a été envoyé à <strong>${escapeHtml(report.clientEmail)}</strong> pour vérifier ses informations.`,
      '#D48A1A'
    ));
  }

  return res.status(400).send(html('Action inconnue', `Action "${escapeHtml(action)}" non reconnue.`, '#C43B2E'));
};

// ─── ENVOI RAPPORT CLIENT ──────────────────────────────────────────
async function sendReportToClient(report) {
  if (!process.env.RESEND_API_KEY) {
    throw new Error('RESEND_API_KEY not configured');
  }
  const { Resend } = require('resend');
  const resend = new Resend(process.env.RESEND_API_KEY);

  const j = report.analyseJson;
  const scoreColor = j.score >= 7 ? '#2A9D6C' : j.score >= 5 ? '#D48A1A' : '#C43B2E';

  const subScoresHtml = (j.subscores || []).map(ss => {
    const val = ss.valeur ?? ss.val ?? 0;
    const pct = Math.round((val / 10) * 100);
    const barColor = val >= 7 ? '#2A9D6C' : val >= 5 ? '#D48A1A' : '#C43B2E';
    return `
      <tr>
        <td style="padding:8px 0;font-size:13px;color:#6B6B65;border-bottom:1px solid #F0F0EC;">${escapeHtml(ss.label)}</td>
        <td style="padding:8px 0;border-bottom:1px solid #F0F0EC;width:120px;">
          <div style="background:#E8E8E4;border-radius:4px;height:6px;overflow:hidden;">
            <div style="background:${barColor};width:${pct}%;height:100%;border-radius:4px;"></div>
          </div>
        </td>
        <td style="padding:8px 0;font-size:13px;font-weight:700;color:${barColor};text-align:right;border-bottom:1px solid #F0F0EC;">${val}/10</td>
      </tr>`;
  }).join('');

  const checklistHtml = (j.checklist || []).map(item =>
    `<li style="padding:6px 0;font-size:13px;color:#6B6B65;border-bottom:1px dashed #E8E8E4;">${escapeHtml(item)}</li>`
  ).join('');

  const tableauHtml = (j.tableau_financier || []).map(row => {
    const isBold = row.type === 'total' || row.type === 'highlight';
    const bg = row.type === 'total' ? '#F5EFE0' : row.type === 'highlight' ? '#D1FAE5' : 'transparent';
    return `
      <tr style="background:${bg};">
        <td style="padding:9px 12px;font-size:13px;color:#1A1A1A;border-bottom:1px solid #E8E8E4;${isBold ? 'font-weight:700;' : ''}">${escapeHtml(row.poste)}</td>
        <td style="padding:9px 12px;font-size:12px;color:#9C9C94;border-bottom:1px solid #E8E8E4;">${escapeHtml(row.detail || '')}</td>
        <td style="padding:9px 12px;font-size:13px;font-weight:600;text-align:right;border-bottom:1px solid #E8E8E4;color:#1A1A1A;">${escapeHtml(row.montant)}</td>
      </tr>`;
  }).join('');

  await resend.emails.send({
    from: `KCI — Karukera Conseil Immobilier <${process.env.FROM_EMAIL || 'noreply@karukera-conseil.fr'}>`,
    to: report.clientEmail,
    subject: `Votre rapport KCI est prêt — ${report.bienData?.commune || ''} · Score ${j.score}/10`,
    html: `
<!DOCTYPE html><html><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:20px;background:#F7F7F5;font-family:-apple-system,sans-serif;">
<div style="max-width:640px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
  <div style="background:#0B1526;padding:32px;text-align:center;">
    <div style="font-size:28px;color:#C2A060;font-weight:300;letter-spacing:4px;margin-bottom:4px;">KCI</div>
    <div style="font-size:11px;color:rgba(255,255,255,0.4);letter-spacing:3px;text-transform:uppercase;">Karukera Conseil Immobilier</div>
    <div style="width:40px;height:1px;background:rgba(194,160,96,0.3);margin:16px auto;"></div>
    <p style="color:rgba(255,255,255,0.7);font-size:14px;margin:0;">
      Bonjour ${escapeHtml(report.clientName || 'Madame, Monsieur')},<br>
      votre rapport de pré-étude de faisabilité est disponible.
    </p>
  </div>
  <div style="padding:28px 32px 0;">
    <div style="background:#F7F7F5;border-radius:12px;padding:20px 24px;margin-bottom:24px;">
      <div style="font-size:32px;font-weight:700;color:${scoreColor};line-height:1;display:inline;">${j.score}</div>
      <span style="font-size:12px;color:#9C9C94;">/10</span>
      <div style="font-size:16px;font-weight:600;color:#1A1A1A;margin-top:8px;">${j.verdict_texte || j.verdict}</div>
      <div style="font-size:13px;color:#6B6B65;">${escapeHtml(report.bienData?.type_bien || '')} · ${escapeHtml(report.bienData?.commune || '')}</div>
    </div>
    <h3 style="font-size:14px;font-weight:600;color:#0B1526;margin:0 0 12px;padding-bottom:8px;border-bottom:2px solid #C2A060;">Sous-scores détaillés</h3>
    <table style="width:100%;border-collapse:collapse;margin-bottom:24px;">${subScoresHtml}</table>
    <h3 style="font-size:14px;font-weight:600;color:#0B1526;margin:0 0 12px;padding-bottom:8px;border-bottom:2px solid #C2A060;">Estimation financière</h3>
    <table style="width:100%;border-collapse:collapse;margin-bottom:24px;">
      <tr style="background:#0B1526;">
        <th style="padding:10px 12px;color:#C2A060;font-size:11px;text-align:left;font-weight:600;letter-spacing:1px;text-transform:uppercase;">Poste</th>
        <th style="padding:10px 12px;color:#C2A060;font-size:11px;text-align:left;font-weight:600;letter-spacing:1px;text-transform:uppercase;">Détail</th>
        <th style="padding:10px 12px;color:#C2A060;font-size:11px;text-align:right;font-weight:600;letter-spacing:1px;text-transform:uppercase;">Montant</th>
      </tr>
      ${tableauHtml}
    </table>
    <h3 style="font-size:14px;font-weight:600;color:#0B1526;margin:0 0 12px;padding-bottom:8px;border-bottom:2px solid #C2A060;">Checklist avant décision</h3>
    <ul style="list-style:none;padding:0;margin:0 0 24px;">${checklistHtml}</ul>
    <div style="background:#0B1526;border-radius:10px;padding:24px 28px;margin-bottom:28px;">
      <div style="font-size:11px;color:#C2A060;letter-spacing:2px;text-transform:uppercase;font-weight:600;margin-bottom:12px;">Conclusion d'expert</div>
      <p style="font-size:14px;color:rgba(255,255,255,0.85);line-height:1.7;margin:0 0 20px;">${escapeHtml(j.conclusion || '')}</p>
      <div style="border-top:1px solid rgba(255,255,255,0.1);padding-top:16px;">
        <div style="font-size:14px;font-weight:600;color:#fff;">Dereck Rauzduel</div>
        <div style="font-size:11px;color:#C2A060;margin-top:2px;">Architecte EPFL — Fondateur KCI</div>
      </div>
    </div>
    <div style="background:#F7F7F5;border-radius:10px;padding:20px 24px;margin-bottom:28px;border:1px solid #E8E8E4;">
      <h3 style="font-size:13px;font-weight:600;color:#1A1A1A;margin:0 0 8px;">Une question ?</h3>
      <a href="mailto:${process.env.CONTACT_EMAIL || 'contact@karukera-conseil.com'}" style="color:#C2A060;font-size:13px;font-weight:600;text-decoration:none;">${process.env.CONTACT_EMAIL || 'contact@karukera-conseil.com'}</a>
    </div>
  </div>
  <div style="background:#0B1526;padding:20px 32px;text-align:center;">
    <p style="font-size:11px;color:rgba(255,255,255,0.3);margin:0;line-height:1.7;">
      Rapport #${report.id.slice(0,8).toUpperCase()} · ${new Date().toLocaleDateString('fr-FR')}<br>
      Pré-étude non contractuelle basée sur les informations fournies.<br>
      <strong style="color:rgba(255,255,255,0.5);">KCI — Karukera Conseil Immobilier</strong>
    </p>
  </div>
</div>
</body></html>`
  });
}

// ─── ENVOI DEMANDE RÉVISION AU CLIENT ─────────────────────────────
async function sendRevisionRequestToClient(report) {
  if (!process.env.RESEND_API_KEY) {
    throw new Error('RESEND_API_KEY not configured');
  }
  const { Resend } = require('resend');
  const resend = new Resend(process.env.RESEND_API_KEY);

  await resend.emails.send({
    from: `KCI — Karukera Conseil Immobilier <${process.env.FROM_EMAIL || 'noreply@karukera-conseil.fr'}>`,
    to: report.clientEmail,
    subject: `[KCI] Action requise — Vérifiez vos informations`,
    html: `
<!DOCTYPE html><html><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:20px;background:#F7F7F5;font-family:-apple-system,sans-serif;">
<div style="max-width:560px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
  <div style="background:#0B1526;padding:28px 32px;">
    <div style="font-size:24px;color:#C2A060;font-weight:300;letter-spacing:4px;">KCI</div>
    <div style="font-size:11px;color:rgba(255,255,255,0.4);letter-spacing:3px;text-transform:uppercase;">Karukera Conseil Immobilier</div>
  </div>
  <div style="padding:28px 32px;">
    <div style="background:#FEF3C7;border-left:4px solid #D97706;padding:16px 20px;border-radius:6px;margin-bottom:24px;">
      <strong style="color:#92400E;font-size:14px;">Action requise de votre part</strong>
    </div>
    <p style="font-size:14px;color:#1A1A1A;line-height:1.7;margin:0 0 16px;">
      Bonjour ${escapeHtml(report.clientName || 'Madame, Monsieur')},
    </p>
    <p style="font-size:14px;color:#6B6B65;line-height:1.7;margin:0 0 24px;">
      Après examen, des informations nécessitent une vérification. Merci de corriger et soumettre à nouveau votre demande.
    </p>
    <div style="background:#F7F7F5;border-radius:10px;padding:18px 22px;border:1px solid #E8E8E4;">
      <p style="font-size:13px;color:#6B6B65;margin:0 0 6px;">Contact :</p>
      <a href="mailto:contact@karukera-conseil.com" style="color:#C2A060;font-size:14px;font-weight:600;text-decoration:none;">contact@karukera-conseil.com</a>
      <p style="font-size:12px;color:#9C9C94;margin:6px 0 0;">Dereck Rauzduel — Architecte EPFL — Fondateur KCI</p>
    </div>
  </div>
  <div style="background:#0B1526;padding:16px 32px;text-align:center;">
    <p style="font-size:11px;color:rgba(255,255,255,0.3);margin:0;">KCI — Karukera Conseil Immobilier</p>
  </div>
</div>
</body></html>`
  });
}

// ─── ESCAPE HTML (XSS protection) ─────────────────────────────────
function escapeHtml(str) {
  if (typeof str !== 'string') return '';
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

// ─── HTML HELPER ──────────────────────────────────────────────────
function html(title, message, color) {
  const safeTitle = escapeHtml(title);
  const safeColor = escapeHtml(color);
  return `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>${safeTitle} — KCI</title></head>
<body style="margin:0;padding:40px 20px;background:#F7F7F5;font-family:-apple-system,sans-serif;text-align:center;">
<div style="max-width:480px;margin:0 auto;background:#fff;border-radius:12px;padding:40px;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
  <div style="font-size:24px;color:#C2A060;letter-spacing:4px;font-weight:300;margin-bottom:4px;">KCI</div>
  <div style="width:32px;height:1px;background:#C2A060;margin:12px auto 24px;opacity:0.4;"></div>
  <h2 style="color:${safeColor};font-size:18px;margin:0 0 16px;">${safeTitle}</h2>
  <p style="color:#6B6B65;font-size:14px;line-height:1.7;margin:0 0 24px;">${message}</p>
  <p style="font-size:12px;color:#9C9C94;">KCI — Karukera Conseil Immobilier</p>
</div>
</body></html>`;
}
