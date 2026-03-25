// api/health.js — Diagnostic des env vars (sans exposer les valeurs)
module.exports = (req, res) => {
  const vars = [
    'STRIPE_SECRET_KEY',
    'STRIPE_WEBHOOK_SECRET',
    'ANTHROPIC_API_KEY',
    'RESEND_API_KEY',
    'ADMIN_EMAIL',
    'ADMIN_SECRET',
    'FROM_EMAIL',
    'BASE_URL'
  ];

  const status = {};
  for (const v of vars) {
    const val = process.env[v];
    if (!val) {
      status[v] = 'MISSING';
    } else {
      status[v] = `OK (${val.length} chars, starts: ${val.slice(0, 4)}...)`;
    }
  }

  // Test require des modules
  const modules = {};
  for (const m of ['stripe', 'resend', '@vercel/kv', 'pdf-lib']) {
    try {
      require(m);
      modules[m] = 'OK';
    } catch (e) {
      modules[m] = `FAIL: ${e.message.slice(0, 60)}`;
    }
  }

  return res.status(200).json({
    timestamp: new Date().toISOString(),
    node: process.version,
    envVars: status,
    modules
  });
};
