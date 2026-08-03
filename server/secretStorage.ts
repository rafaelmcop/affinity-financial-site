import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';

function key() {
  const source = process.env.SMTP_ENCRYPTION_KEY || process.env.ADMIN_PASSWORD_HASH || process.env.ADMIN_PASSWORD || process.env.JWT_SECRET;
  if (!source || source.length < 12) throw new Error('Chave de proteção não configurada');
  return createHash('sha256').update(source).digest();
}

export function encryptSecret(value: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key(), iv);
  const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  return `enc:v1:${iv.toString('hex')}:${cipher.getAuthTag().toString('hex')}:${encrypted.toString('hex')}`;
}

export function decryptSecret(value: string) {
  if (!value.startsWith('enc:v1:')) return value;
  const [, , ivHex, tagHex, encryptedHex] = value.split(':');
  const decipher = createDecipheriv('aes-256-gcm', key(), Buffer.from(ivHex, 'hex'));
  decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
  return Buffer.concat([decipher.update(Buffer.from(encryptedHex, 'hex')), decipher.final()]).toString('utf8');
}
