/**
 * Hash utilities - Password hashing with argon2, schema hashing with SHA256
 */

import argon2 from "argon2";
import { createHash } from "crypto";

/**
 * Hash password with argon2
 */
export async function hashPassword(password: string): Promise<string> {
  return argon2.hash(password);
}

/**
 * Verify password against hash
 */
export async function verifyPassword(
  hash: string,
  password: string
): Promise<boolean> {
  return argon2.verify(hash, password);
}

/**
 * Hash schema shape with SHA256
 * Recursively sorts nested objects for consistent hashing
 * @param schemaShape - Object mapping keys to types or nested schema shapes
 * @returns SHA256 hash as hex string
 */
export function hashSchema(schemaShape: Record<string, unknown>): string {
  // Recursively sort keys for consistent hashing
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function sortSchema(shape: Record<string, any>): Record<string, any> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sorted: Record<string, any> = {};
    const keys = Object.keys(shape).sort();

    for (const key of keys) {
      const value = shape[key];
      if (
        typeof value === "object" &&
        value !== null &&
        !Array.isArray(value)
      ) {
        // Recursively sort nested objects
        sorted[key] = sortSchema(value);
      } else {
        sorted[key] = value;
      }
    }

    return sorted;
  }

  const sorted = sortSchema(schemaShape);
  const jsonString = JSON.stringify(sorted);
  return createHash("sha256").update(jsonString).digest("hex");
}
