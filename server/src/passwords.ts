import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';

const keyLength = 64;
const hashPrefix = 'scrypt-v2:';
const missingUserHash = `${hashPrefix}${'0'.repeat(32)}:${'0'.repeat(keyLength * 2)}`;

function deriveKey(password: string, salt: string, legacy = false) {
  const options = { N: 2 ** 14, r: 8, p: legacy ? 1 : 5 };
  return new Promise<Buffer>((resolve, reject) => {
    scrypt(password, salt, keyLength, options, (error, key) => {
      if (error) {
        reject(error);
        return;
      }
      resolve(key);
    });
  });
}

export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString('hex');
  const key = await deriveKey(password, salt);
  return `${hashPrefix}${salt}:${key.toString('hex')}`;
}

export async function checkPassword(password: string, storedHash?: string) {
  // Для неизвестного email используем те же параметры, что и для новых аккаунтов.
  const value = storedHash ?? missingUserHash;
  const legacy = !value.startsWith(hashPrefix);
  const [salt, hash] = (legacy ? value : value.slice(hashPrefix.length)).split(':');
  const key = await deriveKey(password, salt, legacy);
  const expected = Buffer.from(hash ?? '', 'hex');
  const valid = expected.length === keyLength && timingSafeEqual(key, expected);
  if (!storedHash || !valid) return null;
  return legacy ? 'legacy' : 'current';
}
