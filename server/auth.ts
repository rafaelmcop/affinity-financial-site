import crypto from 'crypto';
import bcryptjs from 'bcryptjs';

/**
 * Hash a password using a slow, salted password hash.
 */
export function hashPassword(password: string): string {
  return bcryptjs.hashSync(password, 12);
}

/**
 * Verify a password against a hash
 */
export function verifyPassword(password: string, hash: string): boolean {
  if (hash.startsWith('$2')) return bcryptjs.compareSync(password, hash);

  // Compatibility for existing accounts. A successful login should be
  // followed by migrating the stored hash to bcrypt.
  const legacyHash = crypto.createHash('sha256').update(password).digest('hex');
  const expected = Buffer.from(hash, 'hex');
  const actual = Buffer.from(legacyHash, 'hex');
  return expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
}

/**
 * Generate a random affiliate code
 */
export function generateAffiliateCode(): string {
  return 'AFF' + crypto.randomBytes(8).toString('hex').toUpperCase();
}
