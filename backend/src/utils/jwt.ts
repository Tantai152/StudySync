import { sign, type Secret, type SignOptions } from 'jsonwebtoken';
import { env } from '../config/env.js';

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