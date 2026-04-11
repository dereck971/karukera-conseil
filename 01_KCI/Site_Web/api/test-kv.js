// api/test-kv.js — Inspect @vercel/kv API shape
const kv = require('@vercel/kv');

module.exports = async (req, res) => {
  const info = {
    type: typeof kv,
    keys: Object.keys(kv),
    hasSet: typeof kv.set,
    hasGet: typeof kv.get,
    hasKv: typeof kv.kv,
    kvKeys: kv.kv ? Object.keys(kv.kv) : null,
    kvType: kv.kv ? typeof kv.kv.set : null,
    hasDefault: typeof kv.default,
    defaultKeys: kv.default ? Object.keys(kv.default) : null,
    hasCreateClient: typeof kv.createClient
  };
  return res.status(200).json(info);
};
