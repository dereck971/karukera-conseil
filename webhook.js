// api/webhook.js
// Récepteur de webhooks Stripe — signature verification
// Activer dans Stripe Dashboard → Developers → Webhooks → ajouter endpoint /api/webhook

const Stripe = require('stripe');

// Désactiver le body parsing automatique de Vercel
export const config = {
  api: { bodyParser: false },
};

async function getRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).end();
  }

  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    console.error('[webhook] STRIPE_WEBHOOK_SECRET non configuré');
    return res.status(500).json({ error: 'Webhook secret manquant' });
  }

  let event;
  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    const rawBody = await getRawBody(req);
    event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
  } catch (err) {
    console.error('[webhook] Signature invalide:', err.message);
    return res.status(400).json({ error: `Webhook Error: ${err.message}` });
  }

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object;
      console.log('[webhook] Paiement confirmé:', {
        id: session.id,
        plan: session.metadata?.plan,
        email: session.customer_details?.email,
        amount: session.amount_total,
      });
      // Extension future : enregistrer en base (Supabase, PlanetScale...)
      break;
    }
    case 'payment_intent.payment_failed': {
      const pi = event.data.object;
      console.log('[webhook] Paiement échoué:', pi.last_payment_error?.message);
      break;
    }
    default:
      console.log('[webhook] Événement non géré:', event.type);
  }

  return res.status(200).json({ received: true });
};// api/webhook.js
// Récepteur de webhooks Stripe — signature verification
// Activer dans Stripe Dashboard → Developers → Webhooks → ajouter endpoint /api/webhook

const Stripe = require('stripe');

// Désactiver le body parsing automatique de Vercel
export const config = {
  api: { bodyParser: false },
};

async function getRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).end();
  }

  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    console.error('[webhook] STRIPE_WEBHOOK_SECRET non configuré');
    return res.status(500).json({ error: 'Webhook secret manquant' });
  }

  let event;
  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    const rawBody = await getRawBody(req);
    event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
  } catch (err) {
    console.error('[webhook] Signature invalide:', err.message);
    return res.status(400).json({ error: `Webhook Error: ${err.message}` });
  }

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object;
      console.log('[webhook] Paiement confirmé:', {
        id: session.id,
        plan: session.metadata?.plan,
        email: session.customer_details?.email,
        amount: session.amount_total,
      });
      // Extension future : enregistrer en base (Supabase, PlanetScale...)
      break;
    }
    case 'payment_intent.payment_failed': {
      const pi = event.data.object;
      console.log('[webhook] Paiement échoué:', pi.last_payment_error?.message);
      break;
    }
    default:
      console.log('[webhook] Événement non géré:', event.type);
  }

  return res.status(200).json({ received: true });
};
