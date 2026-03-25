// api/submit-form.js v1
// Reçoit les données du formulaire client, les stocke en KV,
// puis crée une session Stripe Checkout avec le formId en metadata.
// Retourne l'URL de paiement Stripe.

const crypto = require('crypto');
const Stripe = require('stripe');

// ─── STOCKAGE PERSISTANT ──────────────────────────────────────────
let kvStore;
try {
  kvStore = require('@vercel/kv');
} catch (e) {
  kvStore = null;
}

const memoryFallback = global._kciFormData || (global._kciFormData = new Map());

const store = {
  async set(key, value, options = {}) {
    if (kvStore) {
      await kvStore.set(`form:${key}`, JSON.stringify(value), { ex: options.ttl || 24 * 3600 });
    } else {
      memoryFallback.set(key, value);
    }
  },
  async get(key) {
    if (kvStore) {
      const raw = await kvStore.get(`form:${key}`);
      return raw ? (typeof raw === 'string' ? JSON.parse(raw) : raw) : null;
    }
    return memoryFallback.get(key) || null;
  }
};

// ─── PLANS KCI ────────────────────────────────────────────────────
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
  // CORS
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

  // ─── VALIDATION ──────────────────────────────────────────────────
  const {
    plan,
    clientName,
    clientEmail,
    clientPhone,
    // Données du bien immobilier
    commune,
    type_bien,
    surface_terrain,
    surface_habitable,
    budget_total,
    objectif,
    description_projet
  } = req.body;

  if (!clientName || clientName.trim().length < 2) {
    return res.status(400).json({ error: 'Le nom est obligatoire (minimum 2 caractères).' });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!clientEmail || !emailRegex.test(clientEmail)) {
    return res.status(400).json({ error: 'Adresse email invalide.' });
  }

  const selectedPlan = plan && PLANS[plan] ? plan : 'recommandee';
  const planConfig = PLANS[selectedPlan];

  // ─── STOCKAGE DES DONNÉES FORMULAIRE ─────────────────────────────
  const formId = crypto.randomBytes(16).toString('hex');
  const formData = {
    formId,
    createdAt: new Date().toISOString(),
    plan: selectedPlan,
    clientName: clientName.trim(),
    clientEmail: clientEmail.trim().toLowerCase(),
    clientPhone: (clientPhone || '').trim(),
    bienData: {
      commune: (commune || '').trim(),
      type_bien: (type_bien || '').trim(),
      surface_terrain: surface_terrain || '',
      surface_habitable: surface_habitable || '',
      budget_total: budget_total || '',
      objectif: (objectif || '').trim(),
      description_projet: (description_projet || '').trim()
    }
  };

  await store.set(formId, formData, { ttl: 24 * 3600 });

  // ─── CRÉATION SESSION STRIPE CHECKOUT ────────────────────────────
  try {
    if (!process.env.STRIPE_SECRET_KEY) {
      return res.status(500).json({ error: 'Configuration serveur incomplète.' });
    }

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    const baseUrl = process.env.BASE_URL || `https://${req.headers.host}`;

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      locale: 'fr',
      payment_method_types: ['card'],
      customer_email: clientEmail.trim().toLowerCase(),
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
      metadata: {
        formId,
        plan: selectedPlan,
        clientName: clientName.trim(),
        clientEmail: clientEmail.trim().toLowerCase(),
        commune: (commune || '').trim()
      },
      success_url: `${baseUrl}/success.html?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/?cancelled=1`,
    });

    return res.status(200).json({ url: session.url, formId });

  } catch (err) {
    console.error('[submit-form] Stripe error:', err.message);
    return res.status(500).json({ error: 'Erreur lors de la création du paiement.' });
  }
};
