import { randomBytes } from "crypto";

/**
 * Generate a secure random connect code
 * Format: XXXX-XXXX (8 alphanumeric characters)
 */
export function generateConnectCode(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  const bytes = randomBytes(8);

  let code = "";
  for (let i = 0; i < 8; i++) {
    code += chars[bytes[i] % chars.length];
  }

  // Format as XXXX-XXXX for readability
  return `${code.slice(0, 4)}-${code.slice(4)}`;
}

/**
 * Calculate expiration timestamp based on days from now
 */
export function calculateExpirationDate(days: number): Date {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + days);
  return expiresAt;
}
