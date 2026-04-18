// Static file server for the Petit-Bourg twin (no process.cwd dependency)
// Sert depuis le miroir /tmp/kci-fiscal-preview pour contourner le sandbox preview.
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';

const TOPO_ROOT = '/tmp/kci-fiscal-preview';
const SITE_ROOT = TOPO_ROOT + '/communes/97118-petit-bourg';
const INDEX_PATH = '/communes/97118-petit-bourg/index.html';
const PORT = Number(process.env.PORT || 8765);

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2'
};

function resolveSafe(urlPath) {
  let clean = urlPath.split('?')[0].split('#')[0];
  if (clean === '/' || clean === '' || clean === '/index.html') clean = INDEX_PATH;
  const joined = normalize(join(TOPO_ROOT, decodeURIComponent(clean)));
  if (!joined.startsWith(TOPO_ROOT)) return null;
  return joined;
}

const server = createServer(async (req, res) => {
  try {
    let filePath = resolveSafe(req.url);
    if (!filePath) { res.writeHead(403); res.end('Forbidden'); return; }
    let s;
    try { s = await stat(filePath); } catch { res.writeHead(404); res.end('Not found: ' + req.url); return; }
    if (s.isDirectory()) filePath = join(filePath, 'index.html');
    const data = await readFile(filePath);
    const type = MIME[extname(filePath).toLowerCase()] || 'application/octet-stream';
    res.writeHead(200, {
      'Content-Type': type,
      'Cache-Control': 'no-store',
      'Access-Control-Allow-Origin': '*'
    });
    res.end(data);
  } catch (e) {
    res.writeHead(500); res.end('Error: ' + e.message);
  }
});

server.listen(PORT, () => {
  process.stdout.write('Serving ' + SITE_ROOT + ' (root=' + TOPO_ROOT + ') on http://localhost:' + PORT + '\n');
});
