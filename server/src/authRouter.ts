import { Router, json } from 'express';
import type { CookieOptions, Request } from 'express';
import { createSession, createUser, deleteSession, findSessionUser, findUser, sessionLifetime, upgradePasswordHash } from './authStore.js';
import { checkPassword, hashPassword } from './passwords.js';
import { limitAuthAttempts } from './limitAuthAttempts.js';

const router = Router();
const sessionCookie = 'reshis_session';
const credentialsError = 'Введите email и пароль длиной от 8 до 128 символов.';

function cookieOptions(req: Request): CookieOptions {
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: req.secure || process.env.NODE_ENV === 'production',
    path: '/',
  };
}

function readSessionToken(req: Request) {
  const cookiePrefix = sessionCookie + '=';
  const cookies = (req.headers.cookie ?? '').split(';');

  for (const part of cookies) {
    const cookie = part.trim();
    if (!cookie.startsWith(cookiePrefix)) continue;

    const token = cookie.slice(cookiePrefix.length);
    return /^[0-9a-f]{64}$/.test(token) ? token : undefined;
  }
}

function readCredentials(body: { email?: unknown; password?: unknown } | undefined) {
  const { email, password } = body ?? {};
  if (typeof email !== 'string' || typeof password !== 'string') return null;

  const normalizedEmail = email.trim().toLowerCase();
  const validEmail = normalizedEmail.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail);
  const validPassword = password.length >= 8 && password.length <= 128;
  if (!validEmail || !validPassword) return null;

  return { email: normalizedEmail, password };
}

router.use((req, res, next) => {
  res.set('Cache-Control', 'no-store');
  if (req.method === 'POST' && !req.is('application/json')) {
    res.status(415).json({ error: 'Ожидаются данные в формате JSON.' });
    return;
  }
  next();
});
router.use(json({ limit: '4kb' }));

router.post('/register', limitAuthAttempts, async (req, res) => {
  const input = readCredentials(req.body);
  if (!input) {
    res.status(400).json({ error: credentialsError });
    return;
  }

  const passwordHash = await hashPassword(input.password);
  const user = createUser(input.email, passwordHash);
  if (!user) {
    res.status(409).json({ error: 'Аккаунт с таким email уже существует.' });
    return;
  }
  res.status(201).json({ user });
});

router.post('/login', limitAuthAttempts, async (req, res) => {
  const input = readCredentials(req.body);
  if (!input) {
    res.status(400).json({ error: credentialsError });
    return;
  }

  const user = findUser(input.email);
  const passwordStatus = await checkPassword(input.password, user?.password_hash);
  if (!user || !passwordStatus) {
    res.status(401).json({ error: 'Неверный email или пароль.' });
    return;
  }

  if (passwordStatus === 'legacy') {
    upgradePasswordHash(user, await hashPassword(input.password));
  }

  const token = createSession(user.id);
  const previousToken = readSessionToken(req);
  if (previousToken) deleteSession(previousToken);
  res.cookie(sessionCookie, token, { ...cookieOptions(req), maxAge: sessionLifetime });
  res.json({ user: { id: user.id, email: user.email } });
});

router.get('/me', (req, res) => {
  const token = readSessionToken(req);
  const user = token ? findSessionUser(token) : undefined;
  res.json({ user: user ?? null });
});

router.post('/logout', (req, res) => {
  const token = readSessionToken(req);
  if (token) deleteSession(token);
  res.clearCookie(sessionCookie, cookieOptions(req));
  res.json({ user: null });
});

export default router;
