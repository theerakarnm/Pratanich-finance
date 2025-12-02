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

/**
 * Normalize Thai mobile phone number to consistent format
 * Handles various input formats:
 * - With/without country code (+66, 66)
 * - With/without leading 0
 * - With spaces, dashes, parentheses
 * 
 * Returns normalized format: 10 digits starting with 0 (e.g., "0812345678")
 * 
 * @param phoneNumber - Phone number in any format
 * @returns Normalized phone number or null if invalid
 */
export function normalizePhoneNumber(phoneNumber: string): string | null {
  if (!phoneNumber) return null;

  // Remove all non-digit characters (spaces, dashes, parentheses, etc.)
  let normalized = phoneNumber.replace(/\D/g, "");

  // Handle country code +66 or 66
  if (normalized.startsWith("66")) {
    normalized = "0" + normalized.slice(2);
  }

  // Ensure it starts with 0 and has 10 digits (Thai mobile format)
  if (!normalized.startsWith("0")) {
    normalized = "0" + normalized;
  }

  // Validate Thai mobile number format (10 digits starting with 0)
  if (normalized.length !== 10 || !normalized.startsWith("0")) {
    return null;
  }

  return normalized;
}
