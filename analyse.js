// api/analyse.js
// Vercel Serverless Function — appel Claude API pour analyse immobilière KCI

module.exports = async (req, res) => {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { prompt } = req.body;
  if (!prompt) {
    return res.status(400).json({ error: 'Missing prompt' });
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5-20250514',
        max_tokens: 4000,
        system: `Tu es un expert immobilier senior spécialisé en Guadeloupe pour Karukera Conseil Immobilier (KCI), cabinet fondé par Dereck Rauzduel, architecte DE.
Tu maîtrises : marché foncier guadeloupéen, PLU des communes, PPRI, loi littoral, défiscalisation Pinel DOM, LMNP, prix au m² par secteur, contraintes cycloniques et sismiques.
Tu analyses chaque projet avec rigueur et pragmatisme pour aider les investisseurs à prendre la bonne décision.
Réponds UNIQUEMENT en JSON valide. Zéro markdown. Zéro backtick. Zéro explication hors JSON.`,
        messages: [
          { role: 'user', content: prompt }
        ]
      })
    });

    if (!response.ok) {
      const err = await response.text();
      console.error('Anthropic API error:', err);
      return res.status(500).json({ error: 'Anthropic API error', detail: err });
    }

    const data = await response.json();

    // Extraire et valider le JSON pour une meilleure robustesse
    try {
      let raw = '';
      if (data?.content) {
        raw = data.content.map(b => b.text || '').join('');
      }
      raw = raw.replace(/```json|```/g, '').trim();
      const parsed = JSON.parse(raw);
      return res.status(200).json({ content: [{ text: JSON.stringify(parsed) }] });
    } catch (parseErr) {
      // Si le parsing échoue, renvoyer la réponse brute
      console.warn('JSON parse warning:', parseErr.message);
      return res.status(200).json(data);
    }

  } catch (error) {
    console.error('Handler error:', error);
    return res.status(500).json({ error: error.message });
  }
};
