/**
 * JWT utilities - Token generation and verification
 */

import jwt from "jsonwebtoken";
import type { Config } from "../config";

export interface JWTPayload {
  userId: string;
}

/**
 * Generate JWT token
 */
export function generateToken(payload: JWTPayload, config: Config): string {
  return jwt.sign(payload, config.jwtSecret, {
    expiresIn: config.jwtExpiry,
  });
}

/**
 * Verify and decode JWT token
 * @returns Decoded payload if valid, throws error if invalid
 */
export function verifyToken(token: string, config: Config): JWTPayload {
  return jwt.verify(token, config.jwtSecret) as JWTPayload;
}
