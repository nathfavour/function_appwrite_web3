/**
 * Web3 Utilities for Signature Verification and Address Normalization
 * 
 * This module provides cryptographic verification of Ethereum wallet signatures
 * and address normalization utilities. It mirrors the exact implementation from
 * the Next.js API route at /app/api/custom-token/route.ts
 */

import { ethers } from 'ethers';

/**
 * Verifies that a signature matches the expected message and address
 * 
 * This function uses ethers.js to recover the Ethereum address from a signature
 * and compares it with the expected address. This is the core security mechanism
 * that proves wallet ownership without requiring private keys.
 * 
 * @param message - The original message that was signed (full message, not just timestamp)
 * @param signature - The signature produced by signing the message with the wallet
 * @param address - The expected Ethereum address (case-insensitive)
 * @returns true if signature is valid and matches the address, false otherwise
 * 
 * @example
 * const message = "Sign this message to authenticate: auth-1234567890";
 * const signature = "0x...";
 * const address = "0xABC...";
 * const isValid = await verifySignature(message, signature, address);
 */
export async function verifySignature(
  message: string,
  signature: string,
  address: string
): Promise<boolean> {
  try {
    // Recover the address from the signature using ethers.js
    // This cryptographically proves who signed the message
    const recoveredAddress = ethers.verifyMessage(message, signature);

    // Compare with expected address (case insensitive)
    // Ethereum addresses are case-insensitive but often checksummed
    return recoveredAddress.toLowerCase() === address.toLowerCase();
  } catch (_error: unknown) {
    // If verification fails for any reason (invalid signature, malformed data, etc.)
    // we treat it as an invalid signature
    return false;
  }
}

/**
 * Normalizes an Ethereum address to lowercase format
 * 
 * Ethereum addresses can be represented in multiple formats:
 * - Lowercase: 0xabc...
 * - Checksummed: 0xAbC... (mixed case for validation)
 * 
 * This function validates and normalizes addresses to lowercase for consistent
 * storage and comparison. This prevents issues where the same wallet address
 * appears different due to casing.
 * 
 * @param address - The Ethereum address to normalize
 * @returns Normalized lowercase address (0x prefixed, 42 characters)
 * 
 * @example
 * normalizeEthAddress("0xABC123...") // returns "0xabc123..."
 * normalizeEthAddress("0xInvalid")   // returns "0xinvalid" (fallback)
 */
export function normalizeEthAddress(address: string): string {
  try {
    // ethers.getAddress() validates and checksums the address
    // We then convert to lowercase for consistent storage
    // This ensures:
    // 1. Address is valid (throws if not)
    // 2. Address is properly formatted
    // 3. Comparisons work regardless of original casing
    return ethers.getAddress(address).toLowerCase();
  } catch (_e: unknown) {
    // If address is invalid, fall back to a trimmed lowercase version
    // This prevents errors but may store invalid addresses
    // The signature verification will fail for invalid addresses anyway
    return (address || '').trim().toLowerCase();
  }
}

/**
 * Generates a timestamp-based authentication message
 * 
 * Creates a unique message for wallet signing that includes a timestamp.
 * The timestamp helps prevent replay attacks and ensures messages are fresh.
 * 
 * @returns Object with timestamp and base message
 * 
 * @example
 * const { timestamp, message } = generateAuthMessage();
 * // timestamp: 1234567890
 * // message: "auth-1234567890"
 */
export function generateAuthMessage(): { timestamp: number; message: string } {
  const timestamp = Date.now();
  const message = `auth-${timestamp}`;
  return { timestamp, message };
}

/**
 * Creates the full message that should be signed by the wallet
 * 
 * This wraps the base authentication message in a human-readable format
 * that will be displayed to the user in their wallet's signing interface.
 * 
 * Format matches exactly what the Next.js frontend sends for verification.
 * 
 * @param message - The base authentication message (e.g., "auth-1234567890")
 * @returns The full message to be signed (e.g., "Sign this message to authenticate: auth-1234567890")
 * 
 * @example
 * const baseMessage = "auth-1234567890";
 * const fullMessage = createSignableMessage(baseMessage);
 * // Returns: "Sign this message to authenticate: auth-1234567890"
 */
export function createSignableMessage(message: string): string {
  return `Sign this message to authenticate: ${message}`;
}

