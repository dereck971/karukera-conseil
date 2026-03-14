// api/create-checkout.js
// Vercel Serverless Function — crée une session de paiement Stripe (49€ par rapport)

const Stripe = require('stripe');

module.exports = async (req, res) => {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    const baseUrl = req.headers.origin || `https://${req.headers.host}`;

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      locale: 'fr',
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'eur',
          unit_amount: 4900, // 49,00 €
          product_data: {
            name: 'Rapport Analyse Immobilière KCI',
            description: 'Pré-étude de faisabilité complète — score /10, estimation financière, checklist, conclusion expert signée.',
          },
        },
        quantity: 1,
      }],
      metadata: { plan: 'one_shot' },
      success_url: `${baseUrl}/?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/?cancelled=1`,
    });

    return res.status(200).json({ url: session.url });

  } catch (err) {
    console.error('[create-checkout] Error:', err.message);
    return res.status(500).json({ error: err.message });
  }
};
