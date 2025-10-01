import { ethers } from 'ethers';

/**
 * Verifies that a signature matches the expected message and address
 * @param message - The original message that was signed
 * @param signature - The signature produced by signing the message
 * @param address - The expected Ethereum address
 * @returns true if signature is valid, false otherwise
 */
export async function verifySignature(
  message: string,
  signature: string,
  address: string
): Promise<boolean> {
  try {
    // Recover the address from the signature
    const recoveredAddress = ethers.verifyMessage(message, signature);

    // Compare with expected address (case insensitive)
    return recoveredAddress.toLowerCase() === address.toLowerCase();
  } catch (error) {
    return false;
  }
}

/**
 * Normalizes an Ethereum address to lowercase format
 * @param address - The Ethereum address to normalize
 * @returns Normalized lowercase address
 */
export function normalizeEthAddress(address: string): string {
  try {
    // ethers v6 canonicalizes and checksums the address
    // Store and compare using lower-case to avoid checksum mismatches
    // This keeps prefs stable and comparisons simple
    return ethers.getAddress(address).toLowerCase();
  } catch (error) {
    // If invalid, fallback to trimmed lowercase
    return (address || '').trim().toLowerCase();
  }
}

/**
 * Generates a timestamp-based authentication message
 * @returns Object with timestamp and message
 */
export function generateAuthMessage(): { timestamp: number; message: string } {
  const timestamp = Date.now();
  const message = `auth-${timestamp}`;
  return { timestamp, message };
}

/**
 * Creates the full message that should be signed by the wallet
 * @param message - The base authentication message
 * @returns The full message to be signed
 */
export function createSignableMessage(message: string): string {
  return `Sign this message to authenticate: ${message}`;
}
