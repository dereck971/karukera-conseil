// api/verify-session.js
// Vérifie le paiement Stripe et retourne un token d'accès signé (HMAC)

const Stripe = require('stripe');
const crypto = require('crypto');

function generateToken(payload) {
  const secret = process.env.TOKEN_SECRET || 'kci_default_secret_change_me';
  const data = Buffer.from(JSON.stringify(payload)).toString('base64');
  const sig = crypto.createHmac('sha256', secret).update(data).digest('hex');
  return `${data}.${sig}`;
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { session_id } = req.query;
  if (!session_id) {
    return res.status(400).json({ success: false, error: 'session_id manquant' });
  }

  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    const session = await stripe.checkout.sessions.retrieve(session_id);

    const paid =
      session.payment_status === 'paid' ||
      session.status === 'complete';

    if (!paid) {
      return res.status(200).json({ success: false, error: 'Paiement non confirmé' });
    }

    // Token valide 24h pour un rapport one-shot
    const payload = {
      plan: 'one_shot',
      email: session.customer_details?.email || '',
      expiresAt: Date.now() + 24 * 60 * 60 * 1000,
      issuedAt: Date.now(),
    };

    const token = generateToken(payload);

    return res.status(200).json({
      success: true,
      token,
      plan: 'one_shot',
      expiresAt: payload.expiresAt,
      email: payload.email,
    });

  } catch (err) {
    console.error('[verify-session] Error:', err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
};
