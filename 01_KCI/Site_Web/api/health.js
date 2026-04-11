// api/health.js — Diagnostic (static requires for proper bundling)
const Stripe = require('stripe');
const { Resend } = require('resend');

let kvStore;
try { kvStore = require('@vercel/kv'); } catch (e) { kvStore = null; }

let pdfLib;
try { pdfLib = require('pdf-lib'); } catch (e) { pdfLib = null; }

module.exports = (req, res) => {
  const vars = [
    'STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET', 'ANTHROPIC_API_KEY',
    'RESEND_API_KEY', 'ADMIN_EMAIL', 'ADMIN_SECRET', 'FROM_EMAIL', 'BASE_URL'
  ];

  const status = {};
  for (const v of vars) {
    const val = process.env[v];
    status[v] = val ? `OK (${val.length}c)` : 'MISSING';
  }

  return res.status(200).json({
    ts: new Date().toISOString(),
    node: process.version,
    env: status,
    modules: {
      stripe: typeof Stripe === 'function' ? 'OK' : 'FAIL',
      resend: typeof Resend === 'function' ? 'OK' : 'FAIL',
      '@vercel/kv': kvStore ? 'OK' : 'FAIL (optional)',
      'pdf-lib': pdfLib ? 'OK' : 'FAIL (optional)'
    }
  });
};
