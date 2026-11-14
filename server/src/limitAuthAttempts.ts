import type { RequestHandler } from 'express';

const minute = 60_000;
const maxAttempts = 20;
const attemptsByIp = new Map<string, { count: number; expiresAt: number }>();

setInterval(() => {
  const now = Date.now();
  for (const [ip, attempt] of attemptsByIp) {
    if (attempt.expiresAt <= now) attemptsByIp.delete(ip);
  }
}, minute).unref();

export const limitAuthAttempts: RequestHandler = (req, res, next) => {
  const ip = req.ip ?? 'unknown';
  const now = Date.now();
  let attempt = attemptsByIp.get(ip);

  if (!attempt || attempt.expiresAt <= now) {
    attempt = { count: 0, expiresAt: now + minute };
    attemptsByIp.set(ip, attempt);
  }

  if (attempt.count >= maxAttempts) {
    const secondsLeft = Math.ceil((attempt.expiresAt - now) / 1000);
    res.set('Retry-After', String(secondsLeft));
    res.status(429).json({ error: 'Слишком много попыток. Попробуйте через минуту.' });
    return;
  }

  attempt.count += 1;
  next();
};
