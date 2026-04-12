// api/pending.js
// Liste les rapports en attente de validation admin
// GET /api/pending (Authorization: Bearer ADMIN_SECRET)

const { verifyAdmin } = require('./_lib/security');

let kvClient = null;
try {
  if (process.env.KV_REST_API_URL) {
    kvClient = require('@vercel/kv').kv;
  }
} catch (e) {
  kvClient = null;
}

const memoryFallback = global._kciPending || (global._kciPending = new Map());

module.exports = async (req, res) => {
  if (req.method !== 'GET') return res.status(405).end();

  if (!verifyAdmin(req)) {
    return res.status(403).json({ error: 'Accès refusé.' });
  }

  try {
    let pending = [];

    if (kvClient) {
      const keys = await kvClient.keys('report:*');
      const reports = await Promise.all(
        keys.map(async k => {
          const raw = await kvClient.get(k);
          return raw ? (typeof raw === 'string' ? JSON.parse(raw) : raw) : null;
        })
      );
      pending = reports
        .filter(r => r && r.status === 'pending')
        .map(r => ({
          id: r.id,
          clientName: r.clientName,
          clientEmail: r.clientEmail,
          plan: r.plan,
          commune: r.bienData?.commune || 'N/A',
          score: r.analyseJson?.score,
          verdict: r.analyseJson?.verdict,
          createdAt: r.createdAt,
          expiresAt: r.expiresAt
        }))
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    } else {
      memoryFallback.forEach((r) => {
        if (r.status === 'pending') {
          pending.push({
            id: r.id,
            clientName: r.clientName,
            clientEmail: r.clientEmail,
            plan: r.plan,
            commune: r.bienData?.commune || 'N/A',
            score: r.analyseJson?.score,
            verdict: r.analyseJson?.verdict,
            createdAt: r.createdAt,
            expiresAt: r.expiresAt
          });
        }
      });
    }

    return res.status(200).json({ count: pending.length, reports: pending });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
};
