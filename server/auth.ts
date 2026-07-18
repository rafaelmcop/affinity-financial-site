import crypto from 'crypto';

/**
 * Hash a password using PBKDF2 with salt
 */
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
  return salt + ':' + hash;
}

/**
 * Verify a password against a PBKDF2 hash
 */
export function verifyPassword(password: string, storedHash: string): boolean {
  try {
    const [salt, hash] = storedHash.split(':');
    if (!salt || !hash) return false;
    
    const computedHash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
    return computedHash === hash;
  } catch (error) {
    return false;
  }
}

/**
 * Generate a random affiliate code
 */
export function generateAffiliateCode(): string {
  return 'AFF' + crypto.randomBytes(8).toString('hex').toUpperCase();
}
