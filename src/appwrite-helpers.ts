import { Client, Users, ID, Query } from 'node-appwrite';
import type { UserPrefs } from './types.js';

/**
 * Creates an Appwrite client configured for server-side operations
 * @param apiKey - The Appwrite API key
 * @returns Configured Appwrite client
 */
export function createAppwriteClient(apiKey: string): Client {
  const endpoint = process.env.APPWRITE_FUNCTION_API_ENDPOINT;
  const projectId = process.env.APPWRITE_FUNCTION_PROJECT_ID;

  if (!endpoint || !projectId) {
    throw new Error('Appwrite environment variables not configured');
  }

  const client = new Client()
    .setEndpoint(endpoint)
    .setProject(projectId)
    .setKey(apiKey);

  return client;
}

/**
 * Finds or creates a user by email and binds the wallet address
 * @param users - Appwrite Users instance
 * @param email - User email address
 * @param walletAddress - Normalized Ethereum wallet address
 * @returns User ID
 */
export async function findOrCreateUserWithWallet(
  users: Users,
  email: string,
  walletAddress: string
): Promise<string> {
  try {
    // Check if user exists by email
    const existingUsers = await users.list([Query.equal('email', [email])]);

    if ((existingUsers as any).total > 0 && (existingUsers as any).users?.length > 0) {
      const existing = (existingUsers as any).users[0];
      const existingUserId = existing.$id;
      const prefs = (existing.prefs || {}) as UserPrefs;
      const existingWallet = prefs.walletEth?.toLowerCase();
      const hasPasskey = Boolean(prefs.passkey_credentials);

      // If account has passkey but no wallet linked, require passkey sign-in first
      if (hasPasskey && !existingWallet) {
        throw new Error(
          'Account already connected with passkey. Sign in with passkey to link wallet.'
        );
      }

      // Check if email is bound to a different wallet
      if (existingWallet && existingWallet !== walletAddress) {
        throw new Error('Email already bound to a different wallet');
      }

      // First-time wallet binding: attach wallet to user prefs
      if (!existingWallet) {
        await users.updatePrefs(existingUserId, {
          ...prefs,
          walletEth: walletAddress,
        });
      }

      return existingUserId;
    } else {
      // Create new user and bind wallet in prefs
      const userId = ID.unique();
      const created = await users.create({
        userId,
        email,
      });
      const newUserId = (created as any).$id || userId;

      await users.updatePrefs(newUserId, { walletEth: walletAddress });

      return newUserId;
    }
  } catch (error: any) {
    // If error is from our validation, rethrow it
    if (
      error.message.includes('passkey') ||
      error.message.includes('different wallet')
    ) {
      throw error;
    }

    // For other errors (like network issues), try to create new user
    const userId = ID.unique();
    const created = await users.create({ userId, email });
    const newUserId = (created as any).$id || userId;

    try {
      await users.updatePrefs(newUserId, { walletEth: walletAddress });
    } catch {
      // Ignore preference update errors
    }

    return newUserId;
  }
}

/**
 * Creates a custom authentication token for a user
 * @param users - Appwrite Users instance
 * @param userId - User ID
 * @returns Token object with secret
 */
export async function createCustomToken(
  users: Users,
  userId: string
): Promise<{ userId: string; secret: string }> {
  const token = await users.createToken({ userId });

  return {
    userId,
    secret: token.secret,
  };
}
