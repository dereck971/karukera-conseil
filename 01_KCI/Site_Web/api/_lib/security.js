// api/_lib/security.js
// Module de sécurité partagé pour tous les endpoints KCI
// Créé le 11/04/2026 — Sprint sécurité API

const crypto = require('crypto');

// ─── BASE URL (anti host-header injection) ──────────────────────────
function getBaseUrl() {
  return process.env.BASE_URL || 'https://www.karukera-conseil.com';
}

// ─── ESCAPE HTML (XSS protection complète) ──────────────────────────
function escapeHtml(str) {
  if (typeof str !== 'string') return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// ─── CHIFFREMENT TOKEN AES-256-GCM ──────────────────────────────────
function encryptPayload(payload) {
  const secret = process.env.TOKEN_SECRET;
  if (!secret) throw new Error('TOKEN_SECRET environment variable is required');
  const key = crypto.createHash('sha256').update(secret).digest();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  let encrypted = cipher.update(JSON.stringify(payload), 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const tag = cipher.getAuthTag().toString('hex');
  return `${iv.toString('hex')}.${encrypted}.${tag}`;
}

function decryptPayload(token) {
  const secret = process.env.TOKEN_SECRET;
  if (!secret) throw new Error('TOKEN_SECRET environment variable is required');
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const [ivHex, encrypted, tagHex] = parts;
    const key = crypto.createHash('sha256').update(secret).digest();
    const iv = Buffer.from(ivHex, 'hex');
    const tag = Buffer.from(tagHex, 'hex');
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(tag);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return JSON.parse(decrypted);
  } catch (e) {
    return null;
  }
}

// ─── AUTH ADMIN (Authorization: Bearer header) ──────────────────────
function verifyAdmin(req) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) return false;
  const token = auth.slice(7);
  const expected = process.env.ADMIN_SECRET;
  if (!expected) return false;
  // Timing-safe comparison
  const tokenBuf = Buffer.from(token);
  const expectedBuf = Buffer.from(expected);
  if (tokenBuf.length !== expectedBuf.length) return false;
  return crypto.timingSafeEqual(tokenBuf, expectedBuf);
}

// ─── RATE LIMITER IN-MEMORY (par IP) ────────────────────────────────
const rateLimitMap = new Map();
const CLEANUP_INTERVAL = 5 * 60 * 1000; // cleanup toutes les 5 min

// Auto-cleanup des entrées expirées
setInterval(() => {
  const now = Date.now();
  for (const [ip, entry] of rateLimitMap) {
    if (now > entry.resetAt) rateLimitMap.delete(ip);
  }
}, CLEANUP_INTERVAL).unref();

function rateLimit(ip, maxRequests = 5, windowMs = 60000) {
  const now = Date.now();
  const entry = rateLimitMap.get(ip) || { count: 0, resetAt: now + windowMs };
  if (now > entry.resetAt) {
    entry.count = 1;
    entry.resetAt = now + windowMs;
  } else {
    entry.count++;
  }
  rateLimitMap.set(ip, entry);
  return entry.count <= maxRequests;
}

// ─── MAGIC BYTES VALIDATION (anti MIME spoofing) ────────────────────
function validateMagicBytes(base64Data, declaredType) {
  try {
    const buffer = Buffer.from(base64Data, 'base64');
    if (buffer.length < 12) return false;

    switch (declaredType) {
      case 'image/jpeg':
        return buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF;
      case 'image/png':
        return buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47;
      case 'application/pdf':
        return buffer[0] === 0x25 && buffer[1] === 0x50 && buffer[2] === 0x44 && buffer[3] === 0x46;
      case 'image/webp':
        return buffer.slice(0, 4).toString() === 'RIFF' && buffer.slice(8, 12).toString() === 'WEBP';
      case 'image/tiff':
        return (buffer[0] === 0x49 && buffer[1] === 0x49) || (buffer[0] === 0x4D && buffer[1] === 0x4D);
      default:
        return false;
    }
  } catch (e) {
    return false;
  }
}

// ─── GET CLIENT IP ──────────────────────────────────────────────────
function getClientIp(req) {
  return req.headers['x-forwarded-for']?.split(',')[0]?.trim()
    || req.headers['x-real-ip']
    || req.socket?.remoteAddress
    || '0.0.0.0';
}

module.exports = {
  getBaseUrl,
  escapeHtml,
  encryptPayload,
  decryptPayload,
  verifyAdmin,
  rateLimit,
  validateMagicBytes,
  getClientIp
};
