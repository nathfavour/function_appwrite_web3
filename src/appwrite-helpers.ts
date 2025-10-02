/**
 * Appwrite SDK Helper Functions
 * 
 * This module provides utility functions for interacting with Appwrite's Users API.
 * It handles user creation, wallet binding, and custom token generation.
 * 
 * The logic exactly replicates the implementation from /app/api/custom-token/route.ts
 * in the Next.js application.
 */

import { Client, Users, ID, Query } from 'node-appwrite';
import type { UserPrefs } from './types.js';

/**
 * Creates an Appwrite client configured for server-side operations
 * 
 * Uses Appwrite Function environment variables that are automatically
 * provided by the Appwrite runtime:
 * - APPWRITE_FUNCTION_API_ENDPOINT: The Appwrite API endpoint
 * - APPWRITE_FUNCTION_PROJECT_ID: The project ID
 * 
 * @param apiKey - The Appwrite API key (passed via x-appwrite-key header)
 * @returns Configured Appwrite client instance
 * @throws Error if environment variables are not configured
 * 
 * @example
 * const client = createAppwriteClient(apiKey);
 * const users = new Users(client);
 */
export function createAppwriteClient(apiKey: string): Client {
  const endpoint = process.env.APPWRITE_FUNCTION_API_ENDPOINT;
  const projectId = process.env.APPWRITE_FUNCTION_PROJECT_ID;

  if (!endpoint || !projectId) {
    throw new Error(
      'Appwrite environment variables not configured. ' +
      'Required: APPWRITE_FUNCTION_API_ENDPOINT, APPWRITE_FUNCTION_PROJECT_ID'
    );
  }

  const client = new Client()
    .setEndpoint(endpoint)
    .setProject(projectId)
    .setKey(apiKey);

  return client;
}

/**
 * Finds or creates a user by email and binds the wallet address
 * 
 * This function implements the core user management logic:
 * 1. Search for existing user by email
 * 2. If exists:
 *    - Validate passkey conflicts (passkey users must link wallet via passkey)
 *    - Validate wallet conflicts (prevent switching wallets)
 *    - Bind wallet if first time
 * 3. If not exists:
 *    - Create new user
 *    - Bind wallet to preferences
 * 
 * Wallet addresses are stored in user preferences as { walletEth: "0x..." }
 * This approach avoids creating a separate database and keeps the implementation simple.
 * 
 * @param users - Appwrite Users API instance
 * @param email - User email address
 * @param walletAddress - Normalized Ethereum wallet address (lowercase)
 * @returns User ID
 * @throws Error if wallet binding conflicts are detected
 * 
 * @example
 * const userId = await findOrCreateUserWithWallet(users, "user@example.com", "0xabc...");
 */
export async function findOrCreateUserWithWallet(
  users: Users,
  email: string,
  walletAddress: string
): Promise<string> {
  try {
    // Check if user exists by email
    // Note: Query.equal expects an array for the value parameter in some SDK versions
    const existingUsers = await users.list([Query.equal('email', [email])]);

    // Check if we found any users
    if ((existingUsers as any).total > 0 && (existingUsers as any).users?.length > 0) {
      // User exists - validate and potentially bind wallet
      const existing = (existingUsers as any).users[0];
      const existingUserId = existing.$id;
      const prefs = (existing.prefs || {}) as UserPrefs;
      const existingWallet = prefs.walletEth?.toLowerCase();
      const hasPasskey = Boolean(prefs.passkey_credentials);

      // Security Check 1: Passkey Conflict
      // If account has passkey authentication but no wallet linked,
      // require the user to sign in with passkey first to link wallet.
      // This prevents wallet-based takeover of passkey accounts.
      if (hasPasskey && !existingWallet) {
        throw new Error(
          'Account already connected with passkey. Sign in with passkey to link wallet.'
        );
      }

      // Security Check 2: Wallet Conflict
      // If email is already bound to a different wallet, reject the request.
      // This enforces one wallet per email and prevents account hijacking.
      if (existingWallet && existingWallet !== walletAddress) {
        throw new Error('Email already bound to a different wallet');
      }

      // First-time wallet binding
      // If the user exists but has no wallet linked, bind it now
      if (!existingWallet) {
        await users.updatePrefs(existingUserId, {
          ...prefs,
          walletEth: walletAddress,
        });
      }

      return existingUserId;
    } else {
      // User doesn't exist - create new user and bind wallet
      const userId = ID.unique();
      const created = await users.create({
        userId,
        email,
      });
      const newUserId = (created as any).$id || userId;

      // Bind wallet to the newly created user
      await users.updatePrefs(newUserId, { walletEth: walletAddress });

      return newUserId;
    }
  } catch (error: any) {
    // Re-throw our validation errors (passkey conflict, wallet conflict)
    if (
      error.message.includes('passkey') ||
      error.message.includes('different wallet')
    ) {
      throw error;
    }

    // For other errors (network issues, API errors, etc.),
    // attempt to create a new user as a fallback
    // This ensures the authentication flow can complete even if
    // the user lookup fails for non-security reasons
    try {
      const userId = ID.unique();
      const created = await users.create({ userId, email });
      const newUserId = (created as any).$id || userId;

      // Try to bind wallet, but don't fail if it doesn't work
      try {
        await users.updatePrefs(newUserId, { walletEth: walletAddress });
      } catch {
        // Ignore preference update errors in fallback path
      }

      return newUserId;
    } catch (createError: any) {
      // If we can't create a user at all, throw the original error
      throw new Error(`Failed to create or find user: ${createError.message}`);
    }
  }
}

/**
 * Creates a custom authentication token for a user
 * 
 * Custom tokens are temporary credentials that can be exchanged for a session.
 * The client will call `account.createSession({ userId, secret })` to establish
 * a session using this token.
 * 
 * Tokens are time-limited and can only be used once, providing security against
 * token reuse attacks.
 * 
 * @param users - Appwrite Users API instance
 * @param userId - User ID for whom to create the token
 * @returns Token object with userId and secret
 * @throws Error if token creation fails
 * 
 * @example
 * const token = await createCustomToken(users, "user123");
 * // Returns: { userId: "user123", secret: "abc..." }
 * // Client then calls: account.createSession({ userId, secret })
 */
export async function createCustomToken(
  users: Users,
  userId: string
): Promise<{ userId: string; secret: string }> {
  // Create a custom token using Appwrite's Users API
  const token = await users.createToken({ userId });

  return {
    userId,
    secret: token.secret,
  };
}

