// api/verify-session.js v7
// Vérifie le paiement Stripe et retourne un token d'accès chiffré (AES-256-GCM)

const Stripe = require('stripe');
const { encryptPayload } = require('./_lib/security');

module.exports = async (req, res) => {
  const allowedOrigin = process.env.ALLOWED_ORIGIN || 'https://www.karukera-conseil.com';
  res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { session_id } = req.query;
  if (!session_id) {
    return res.status(400).json({ success: false, error: 'session_id manquant' });
  }

  try {
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

    const token = encryptPayload(payload);

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
