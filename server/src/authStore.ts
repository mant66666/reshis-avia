import { createHash, randomBytes } from 'node:crypto';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { fileURLToPath } from 'node:url';

export type User = { id: number; email: string };
type StoredUser = User & { password_hash: string };

export const sessionLifetime = 7 * 24 * 60 * 60 * 1000;
const databasePath = process.env.SQLITE_PATH ?? fileURLToPath(new URL('../../storage/reshis.sqlite', import.meta.url));

mkdirSync(dirname(databasePath), { recursive: true, mode: 0o700 });
const db = new DatabaseSync(databasePath);

db.exec(`
  PRAGMA foreign_keys = ON;

  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS sessions (
    token_hash TEXT PRIMARY KEY NOT NULL,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at INTEGER NOT NULL
  );
`);

export function createUser(email: string, passwordHash: string) {
  return db.prepare(`
    INSERT INTO users (email, password_hash) VALUES (?, ?)
    ON CONFLICT(email) DO NOTHING
    RETURNING id, email
  `).get(email, passwordHash) as User | undefined;
}

export function findUser(email: string) {
  return db.prepare('SELECT id, email, password_hash FROM users WHERE email = ?')
    .get(email) as StoredUser | undefined;
}

export function upgradePasswordHash(user: StoredUser, passwordHash: string) {
  db.prepare('UPDATE users SET password_hash = ? WHERE id = ? AND password_hash = ?')
    .run(passwordHash, user.id, user.password_hash);
}

function tokenHash(token: string) {
  return createHash('sha256').update(token).digest('hex');
}

export function createSession(userId: number) {
  const token = randomBytes(32).toString('hex');
  const now = Date.now();
  db.prepare('DELETE FROM sessions WHERE expires_at <= ?').run(now);
  db.prepare('INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)')
    .run(tokenHash(token), userId, now + sessionLifetime);
  return token;
}

export function findSessionUser(token: string) {
  return db.prepare(`
    SELECT users.id, users.email FROM sessions
    JOIN users ON users.id = sessions.user_id
    WHERE token_hash = ? AND expires_at > ?
  `).get(tokenHash(token), Date.now()) as User | undefined;
}

export function deleteSession(token: string) {
  db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(tokenHash(token));
}
