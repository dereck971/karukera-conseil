// api/create-checkout.js v6
// Crée une session Stripe Checkout pour les 3 offres (49/129/299€)

const Stripe = require('stripe');

const PLANS = {
  essentielle: {
    amount: 4900,
    name: 'Rapport Essentielle — KCI',
    description: '1 page A4, score d\'intérêt /10, verdict rapide GO/PRUDENCE/STOP.'
  },
  recommandee: {
    amount: 12900,
    name: 'Rapport Complète — KCI',
    description: '4 pages, 7 sous-scores, tableau financier complet, FHR, checklist investisseur.'
  },
  premium: {
    amount: 29900,
    name: 'Rapport Premium — KCI',
    description: 'Rapport complet + 3 scénarios, analyse stratégique, recommandation détaillée.'
  }
};

module.exports = async (req, res) => {
  const allowedOrigin = process.env.ALLOWED_ORIGIN || 'https://analyse-immo.vercel.app';
  res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    const baseUrl = req.headers.origin || `https://${req.headers.host}`;
    const { plan } = req.body;

    const planConfig = PLANS[plan] || PLANS.recommandee;

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      locale: 'fr',
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'eur',
          unit_amount: planConfig.amount,
          product_data: {
            name: planConfig.name,
            description: planConfig.description,
          },
        },
        quantity: 1,
      }],
      metadata: { plan: plan || 'recommandee' },
      success_url: `${baseUrl}/?session_id={CHECKOUT_SESSION_ID}&plan=${plan || 'recommandee'}`,
      cancel_url: `${baseUrl}/?cancelled=1`,
    });

    return res.status(200).json({ url: session.url });

  } catch (err) {
    console.error('[create-checkout] Error:', err.message);
    return res.status(500).json({ error: 'Erreur lors de la création du paiement. Veuillez réessayer.' });
  }
};
