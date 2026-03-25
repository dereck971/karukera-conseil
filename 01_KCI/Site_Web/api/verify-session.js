// api/verify-session.js v6
// Vérifie le paiement Stripe et retourne un token d'accès signé (HMAC)

const Stripe = require('stripe');
const crypto = require('crypto');

function generateToken(payload) {
  const secret = process.env.TOKEN_SECRET;
  if (!secret) throw new Error('TOKEN_SECRET environment variable is required');
  const data = Buffer.from(JSON.stringify(payload)).toString('base64');
  const sig = crypto.createHmac('sha256', secret).update(data).digest('hex');
  return `${data}.${sig}`;
}

module.exports = async (req, res) => {
  const allowedOrigin = process.env.ALLOWED_ORIGIN || 'https://analyse-immo.vercel.app';
  res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  if (!process.env.TOKEN_SECRET) {
    console.error('[verify-session] TOKEN_SECRET not configured');
    return res.status(500).json({ success: false, error: 'Configuration serveur incomplète.' });
  }

  const { session_id } = req.query;
  if (!session_id) {
    return res.status(400).json({ success: false, error: 'session_id manquant' });
  }

  // Validate session_id format (Stripe session IDs start with cs_)
  if (typeof session_id !== 'string' || session_id.length > 200 || !/^cs_/.test(session_id)) {
    return res.status(400).json({ success: false, error: 'session_id invalide' });
  }

  try {
    if (!process.env.STRIPE_SECRET_KEY) {
      console.error('[verify-session] STRIPE_SECRET_KEY not configured');
      return res.status(500).json({ success: false, error: 'Configuration serveur incomplète.' });
    }
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    const session = await stripe.checkout.sessions.retrieve(session_id);

    const paid = session.payment_status === 'paid' || session.status === 'complete';

    if (!paid) {
      return res.status(200).json({ success: false, error: 'Paiement non confirmé' });
    }

    const plan = session.metadata?.plan || 'recommandee';
    const payload = {
      plan,
      email: session.customer_details?.email || '',
      expiresAt: Date.now() + 24 * 60 * 60 * 1000,
      issuedAt: Date.now(),
    };

    const token = generateToken(payload);

    return res.status(200).json({
      success: true,
      token,
      plan,
      expiresAt: payload.expiresAt,
      email: payload.email,
    });

  } catch (err) {
    console.error('[verify-session] Error:', err.message);
    return res.status(500).json({ success: false, error: 'Erreur de vérification du paiement. Veuillez réessayer.' });
  }
};
