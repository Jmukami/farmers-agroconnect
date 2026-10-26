import { createHash, timingSafeEqual } from 'node:crypto';

const digest = (value) => createHash('sha256').update(value).digest();

// Fixed windows begin with the first accepted request. No raw keys are retained.
export function createApiProtection({ keys = process.env.API_KEYS, limit = 120, windowMs = 60000, now = Date.now } = {}) {
  const configured = [...new Set((keys || '').split(',').map((key) => key.trim()).filter(Boolean))];
  if (!configured.length) throw new Error('Configure API_KEYS with private API keys before starting.');
  const accepted = configured.map(digest);
  const windows = new Map();
  return (req, res, next) => {
    if (req.method === 'OPTIONS' || (req.path === '/health' && ['GET', 'HEAD'].includes(req.method))) return next();
    res.set('Cache-Control', 'no-store');
    const supplied = req.get('X-API-Key');
    const hashed = digest(supplied || '');
    const index = accepted.findIndex((key) => timingSafeEqual(key, hashed));
    if (!supplied || index < 0) return res.status(401).json({ message: 'A valid X-API-Key header is required.' });
    const time = now();
    let bucket = windows.get(index);
    if (!bucket || time >= bucket.reset) {
      bucket = { count: 0, reset: time + windowMs };
      windows.set(index, bucket);
    }
    if (bucket.count >= limit) {
      res.set('Retry-After', String(Math.max(1, Math.ceil((bucket.reset - time) / 1000))));
      return res.status(429).json({ message: 'Rate limit exceeded. Please try again later.' });
    }
    bucket.count += 1;
    return next();
  };
}
