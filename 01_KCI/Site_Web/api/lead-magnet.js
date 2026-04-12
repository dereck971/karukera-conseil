// api/lead-magnet.js v1
// Envoie le guide PDF "5 pièges à éviter" par email via Resend
// Déclenché par le formulaire exit-popup de la landing page

module.exports = async (req, res) => {
  const allowedOrigins = [
    'https://www.karukera-conseil.com',
    'https://karukera-conseil.com',
    process.env.ALLOWED_ORIGIN
  ].filter(Boolean);
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  const { email } = req.body;
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'Adresse email invalide.' });
  }

  // Vérifier que Resend est configuré
  if (!process.env.RESEND_API_KEY) {
    console.error('[lead-magnet] RESEND_API_KEY manquante');
    return res.status(200).json({ success: true, fallback: true });
  }

  try {
    const { Resend } = require('resend');
    const resend = new Resend(process.env.RESEND_API_KEY);

    await resend.emails.send({
      from: `KCI — Karukera Conseil Immobilier <${process.env.FROM_EMAIL || 'noreply@karukera-conseil.com'}>`,
      to: email,
      subject: 'Votre guide KCI — Les 5 pièges à éviter avant d\'acheter un terrain en Guadeloupe',
      html: `
<!DOCTYPE html><html><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:20px;background:#F7F7F5;font-family:-apple-system,sans-serif;">
<div style="max-width:560px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
  <div style="background:#0B1526;padding:32px;text-align:center;">
    <div style="font-size:24px;color:#C2A060;font-weight:300;letter-spacing:4px;">KCI</div>
    <div style="font-size:11px;color:rgba(255,255,255,0.4);letter-spacing:3px;text-transform:uppercase;margin-top:4px;">Karukera Conseil Immobilier</div>
    <div style="width:40px;height:1px;background:rgba(194,160,96,0.3);margin:16px auto;"></div>
    <p style="color:rgba(255,255,255,0.7);font-size:14px;margin:0;">Votre guide gratuit est prêt</p>
  </div>
  <div style="padding:32px;">
    <h2 style="font-size:18px;font-weight:700;color:#1A1A1A;margin:0 0 16px;">Les 5 pièges à éviter avant d'acheter un terrain en Guadeloupe</h2>

    <div style="background:#F7F7F5;border-radius:10px;padding:24px;margin-bottom:24px;">
      <p style="font-size:14px;color:#6B6B65;line-height:1.8;margin:0 0 16px;">Chaque année, des investisseurs perdent des milliers d'euros sur des terrains en Guadeloupe à cause d'erreurs évitables. Voici les 5 plus fréquentes :</p>

      <div style="margin-bottom:16px;">
        <div style="display:flex;align-items:flex-start;gap:12px;padding:12px 0;border-bottom:1px solid #E8E8E4;">
          <span style="background:#C43B2E;color:#fff;width:24px;height:24px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;flex-shrink:0;">1</span>
          <div>
            <strong style="color:#1A1A1A;font-size:13px;">Ne pas vérifier le PLU avant d'acheter</strong>
            <p style="font-size:12px;color:#6B6B65;margin:4px 0 0;">Un terrain en zone N (naturelle) ou A (agricole) ne vous permettra jamais de construire. Vérifiez sur le Géoportail de l'Urbanisme (gpu.gouv.fr) AVANT de signer.</p>
          </div>
        </div>
        <div style="display:flex;align-items:flex-start;gap:12px;padding:12px 0;border-bottom:1px solid #E8E8E4;">
          <span style="background:#C43B2E;color:#fff;width:24px;height:24px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;flex-shrink:0;">2</span>
          <div>
            <strong style="color:#1A1A1A;font-size:13px;">Ignorer les risques naturels (PPRI/PPRN)</strong>
            <p style="font-size:12px;color:#6B6B65;margin:4px 0 0;">Zone sismique 5, risque cyclonique, inondation — la Guadeloupe cumule les contraintes. Un terrain en zone rouge PPRI est inconstructible. Consultez georisques.gouv.fr.</p>
          </div>
        </div>
        <div style="display:flex;align-items:flex-start;gap:12px;padding:12px 0;border-bottom:1px solid #E8E8E4;">
          <span style="background:#C43B2E;color:#fff;width:24px;height:24px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;flex-shrink:0;">3</span>
          <div>
            <strong style="color:#1A1A1A;font-size:13px;">Sous-estimer le coût réel de construction</strong>
            <p style="font-size:12px;color:#6B6B65;margin:4px 0 0;">Les prix catalogue des constructeurs (1 200-1 500 €/m²) n'incluent pas VRD, assainissement, géotechnie, MOE. Le coût réel all-in en Guadeloupe : 2 500 à 4 000 €/m² TTC.</p>
          </div>
        </div>
        <div style="display:flex;align-items:flex-start;gap:12px;padding:12px 0;border-bottom:1px solid #E8E8E4;">
          <span style="background:#C43B2E;color:#fff;width:24px;height:24px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;flex-shrink:0;">4</span>
          <div>
            <strong style="color:#1A1A1A;font-size:13px;">Acheter un terrain en indivision sans accord écrit</strong>
            <p style="font-size:12px;color:#6B6B65;margin:4px 0 0;">En Guadeloupe, l'indivision touche des milliers de parcelles familiales. Sans accord unanime des indivisaires, toute transaction peut être bloquée pendant des années.</p>
          </div>
        </div>
        <div style="display:flex;align-items:flex-start;gap:12px;padding:12px 0;">
          <span style="background:#C43B2E;color:#fff;width:24px;height:24px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;flex-shrink:0;">5</span>
          <div>
            <strong style="color:#1A1A1A;font-size:13px;">Se fier uniquement au prix DVF sans contexte</strong>
            <p style="font-size:12px;color:#6B6B65;margin:4px 0 0;">Les prix DVF reflètent le marché existant, pas le neuf. Un terrain constructible vaut +10-15% au-dessus de la médiane DVF. Et les micro-marchés varient fortement d'une commune à l'autre.</p>
          </div>
        </div>
      </div>
    </div>

    <div style="background:#0B1526;border-radius:10px;padding:24px;text-align:center;margin-bottom:24px;">
      <p style="color:rgba(255,255,255,0.7);font-size:13px;margin:0 0 16px;">Vous avez un projet d'achat en Guadeloupe ?</p>
      <a href="https://www.karukera-conseil.com/#tarifs" style="display:inline-block;padding:12px 28px;background:#C2A060;color:#0B1526;border-radius:8px;font-size:14px;font-weight:600;text-decoration:none;">Analyser mon projet dès 49€</a>
      <p style="color:rgba(255,255,255,0.35);font-size:11px;margin:12px 0 0;">Score /10 + estimation financière + analyse des risques. Livré en 24h.</p>
    </div>

    <div style="border-top:1px solid #E8E8E4;padding-top:20px;">
      <div style="font-size:13px;font-weight:600;color:#1A1A1A;">Dereck Rauzduel</div>
      <div style="font-size:11px;color:#C2A060;margin-top:2px;">Architecte EPFL — Fondateur KCI</div>
      <div style="font-size:11px;color:#9C9C94;margin-top:4px;">contact@karukera-conseil.com</div>
    </div>
  </div>
</div>
<div style="text-align:center;padding:16px;">
  <p style="font-size:10px;color:#9C9C94;">Vous recevez cet email car vous avez demandé le guide gratuit KCI sur karukera-conseil.com.</p>
</div>
</body></html>`
    });

    console.log('[lead-magnet] Guide envoyé à:', email);

    // Notifier l'admin du nouveau lead
    const adminEmail = process.env.ADMIN_EMAIL;
    if (adminEmail) {
      await resend.emails.send({
        from: `KCI Lead <${process.env.FROM_EMAIL || 'noreply@karukera-conseil.com'}>`,
        to: adminEmail,
        subject: `[KCI] Nouveau lead — ${email}`,
        html: `<p>Nouveau lead via le guide gratuit KCI.</p><p><strong>Email :</strong> ${email.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;')}</p><p><strong>Date :</strong> ${new Date().toLocaleString('fr-FR')}</p><p><strong>Source :</strong> Exit popup — "5 pièges à éviter"</p>`
      });
    }

    return res.status(200).json({ success: true });

  } catch (err) {
    console.error('[lead-magnet] Error:', err.message);
    return res.status(200).json({ success: true, fallback: true });
  }
};
