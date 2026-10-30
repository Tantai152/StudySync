import type { Secret, SignOptions } from 'jsonwebtoken';
import { createRequire } from 'module';
import { env } from '../config/env.js';

const require = createRequire(import.meta.url);
const { sign } = require('jsonwebtoken');

export interface JWTPayload {
  userId: string;
  email: string;
  role: string;
}

/**
 * Generate a JWT access token.
 *
 * @param payload - The payload to sign (userId, email, role)
 * @returns The signed JWT string
 */
export function generateToken(payload: JWTPayload): string {
  const secret: Secret = env.JWT_SECRET;
  const options: SignOptions = {
    expiresIn: env.JWT_EXPIRES_IN as SignOptions['expiresIn'],
  };

  return sign(payload, secret, options);
}
