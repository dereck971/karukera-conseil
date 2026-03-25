// api/submit-form.js v2
// Reçoit les données du formulaire client + fichiers (base64),
// stocke en KV, puis crée une session Stripe Checkout avec formId en metadata.

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

// ─── LISTE DES COMMUNES GUADELOUPE ───────────────────────────────
const COMMUNES_971 = [
  'Abymes', 'Anse-Bertrand', 'Baie-Mahault', 'Baillif', 'Basse-Terre',
  'Bouillante', 'Capesterre-Belle-Eau', 'Capesterre-de-Marie-Galante',
  'Deshaies', 'Gourbeyre', 'Goyave', 'Grand-Bourg', 'Lamentin',
  'Le Gosier', 'Le Moule', 'Morne-à-l\'Eau', 'Petit-Bourg',
  'Petit-Canal', 'Pointe-Noire', 'Pointe-à-Pitre', 'Port-Louis',
  'Saint-Claude', 'Saint-François', 'Saint-Louis', 'Sainte-Anne',
  'Sainte-Rose', 'Terre-de-Bas', 'Terre-de-Haut', 'Trois-Rivières',
  'Vieux-Fort', 'Vieux-Habitants'
];

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

  // ─── EXTRACTION DES DONNÉES ────────────────────────────────────
  const {
    plan,
    // Identité client
    clientName,
    clientEmail,
    clientPhone,
    // Localisation du bien
    commune,
    adresse,
    reference_cadastrale,
    // Caractéristiques du bien
    type_bien,
    surface_terrain,
    surface_habitable,
    nb_pieces,
    annee_construction,
    etat_general,
    // Projet d'investissement
    budget_total,
    apport_personnel,
    objectif,
    horizon_investissement,
    description_projet,
    // Contraintes connues
    zone_plu,
    servitudes_connues,
    // Fichiers joints (base64, max 3 fichiers, 2 Mo chacun)
    fichiers
  } = req.body;

  // ─── VALIDATION ────────────────────────────────────────────────
  if (!clientName || clientName.trim().length < 2) {
    return res.status(400).json({ error: 'Le nom est obligatoire (minimum 2 caractères).' });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!clientEmail || !emailRegex.test(clientEmail)) {
    return res.status(400).json({ error: 'Adresse email invalide.' });
  }

  if (!commune || !commune.trim()) {
    return res.status(400).json({ error: 'La commune est obligatoire.' });
  }

  if (!type_bien || !type_bien.trim()) {
    return res.status(400).json({ error: 'Le type de bien est obligatoire.' });
  }

  // Validation des fichiers (max 3 fichiers, 2 Mo chacun en base64)
  const MAX_FILES = 3;
  const MAX_FILE_SIZE_B64 = 2.67 * 1024 * 1024; // ~2 Mo en base64
  let validatedFiles = [];

  if (fichiers && Array.isArray(fichiers)) {
    if (fichiers.length > MAX_FILES) {
      return res.status(400).json({ error: `Maximum ${MAX_FILES} fichiers autorisés.` });
    }
    for (const f of fichiers) {
      if (!f.name || !f.data || !f.type) continue;
      // Vérifier la taille
      if (f.data.length > MAX_FILE_SIZE_B64) {
        return res.status(400).json({ error: `Le fichier "${f.name}" dépasse 2 Mo.` });
      }
      // Types autorisés
      const allowedTypes = [
        'image/jpeg', 'image/png', 'image/webp',
        'application/pdf',
        'image/tiff'
      ];
      if (!allowedTypes.includes(f.type)) {
        return res.status(400).json({
          error: `Type de fichier non autorisé : ${f.type}. Formats acceptés : JPG, PNG, WebP, PDF, TIFF.`
        });
      }
      validatedFiles.push({
        name: f.name.slice(0, 100),
        type: f.type,
        size: f.data.length,
        data: f.data // base64
      });
    }
  }

  const selectedPlan = plan && PLANS[plan] ? plan : 'recommandee';
  const planConfig = PLANS[selectedPlan];

  // ─── STOCKAGE DES DONNÉES FORMULAIRE ──────────────────────────
  const formId = crypto.randomBytes(16).toString('hex');
  const formData = {
    formId,
    createdAt: new Date().toISOString(),
    plan: selectedPlan,
    clientName: clientName.trim(),
    clientEmail: clientEmail.trim().toLowerCase(),
    clientPhone: (clientPhone || '').trim(),
    bienData: {
      // Localisation
      commune: commune.trim(),
      adresse: (adresse || '').trim(),
      reference_cadastrale: (reference_cadastrale || '').trim(),
      // Caractéristiques
      type_bien: type_bien.trim(),
      surface_terrain: surface_terrain || '',
      surface_habitable: surface_habitable || '',
      nb_pieces: nb_pieces || '',
      annee_construction: annee_construction || '',
      etat_general: (etat_general || '').trim(),
      // Projet
      budget_total: budget_total || '',
      apport_personnel: apport_personnel || '',
      objectif: (objectif || '').trim(),
      horizon_investissement: (horizon_investissement || '').trim(),
      description_projet: (description_projet || '').trim(),
      // Contraintes
      zone_plu: (zone_plu || '').trim(),
      servitudes_connues: (servitudes_connues || '').trim()
    },
    fichiers: validatedFiles.map(f => ({
      name: f.name,
      type: f.type,
      size: f.size,
      data: f.data
    }))
  };

  await store.set(formId, formData, { ttl: 24 * 3600 });

  // ─── CRÉATION SESSION STRIPE CHECKOUT ─────────────────────────
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
        commune: commune.trim(),
        fichiers_count: String(validatedFiles.length)
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
