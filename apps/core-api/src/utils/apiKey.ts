/**
 * API Key utilities - Generate API keys
 */

import { customAlphabet } from "nanoid";

// Generate alphanumeric string (A-Za-z0-9) using nanoid
const generateRandomString = customAlphabet(
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789",
  32
);

/**
 * Generate API key in format: xray_sk_{random32chars}
 * @returns API key string
 */
export function generateApiKey(): string {
  const randomChars = generateRandomString();
  return `xray_sk_${randomChars}`;
}
