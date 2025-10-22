/**
 * Wallet Manager Handler
 * 
 * This module handles wallet connection and disconnection for existing authenticated accounts.
 * These are distinct from authentication flows - they're used in account settings to add/remove wallets.
 * 
 * Connection flow:
 * 1. User must be authenticated (have valid session)
 * 2. User presents a wallet signature
 * 3. Signature is verified
 * 4. Wallet is bound to the account
 * 5. No session creation happens
 * 
 * Disconnection flow:
 * 1. User must be authenticated (have valid session)
 * 2. Wallet is removed from account
 * 3. No signature verification needed
 */

import { Users } from 'node-appwrite';
import {
  verifySignature,
  normalizeEthAddress,
  createSignableMessage,
} from './web3-utils.js';
import {
  createAppwriteClient,
  createCustomToken,
} from './appwrite-helpers.js';
import type {
  AppwriteFunctionContext,
  ConnectWalletRequest,
  ConnectWalletResponse,
  DisconnectWalletResponse,
  ErrorResponse,
  UserPrefs,
} from './types.js';

/**
 * Extracts user ID from the Appwrite authorization header
 * 
 * The authorization header contains the user's session token.
 * This allows us to identify which user is making the request.
 * 
 * @param authHeader - The Authorization header value
 * @returns User ID if valid session, null otherwise
 * 
 * @example
 * const userId = extractUserIdFromAuth('Bearer user_id.session_secret');
 */
function extractUserIdFromAuth(authHeader?: string): string | null {
  if (!authHeader) return null;
  
  try {
    // Authorization header format: "Bearer user_id.session_secret"
    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') return null;
    
    const [userId] = parts[1].split('.');
    return userId;
  } catch {
    return null;
  }
}

/**
 * Connects a wallet to an existing authenticated account
 * 
 * This function allows users to add a wallet to their existing account (e.g., from settings).
 * The user must be authenticated and the wallet signature must be valid.
 * 
 * Flow:
 * 1. Extract user ID from authorization header (must be authenticated)
 * 2. Parse and validate request body
 * 3. Verify wallet signature
 * 4. Check for wallet conflicts (not already bound to different account)
 * 5. Bind wallet to user's account
 * 6. Return success without creating a session
 * 
 * @param context - Appwrite Function context
 */
export async function handleConnectWallet(
  context: AppwriteFunctionContext
): Promise<void> {
  const { req, res, log, error: logError } = context;

  try {
    // ========================================================================
    // Step 1: Verify user is authenticated
    // ========================================================================
    
    const authHeader = req.headers['authorization'] || req.headers['x-appwrite-user-id'];
    const userId = extractUserIdFromAuth(authHeader as string);

    if (!userId) {
      log('No valid authentication provided');
      const errorResponse: ErrorResponse = {
        error: 'Authentication required. Please log in first.',
      };
      return res.json(errorResponse, 401);
    }

    log(`User ${userId} requesting wallet connection`);

    // ========================================================================
    // Step 2: Parse and validate request body
    // ========================================================================
    
    let connectRequest: ConnectWalletRequest;
    try {
      connectRequest = JSON.parse(req.bodyRaw) as ConnectWalletRequest;
    } catch (parseError) {
      log('Failed to parse request body as JSON');
      const errorResponse: ErrorResponse = {
        error: 'Invalid JSON in request body',
      };
      return res.json(errorResponse, 400);
    }

    const { address, signature, message } = connectRequest;

    if (!address || !signature || !message) {
      log('Missing required fields in request');
      const errorResponse: ErrorResponse = {
        error: 'Missing required fields: address, signature, message',
      };
      return res.json(errorResponse, 400);
    }

    log(`Connecting wallet ${address} to user ${userId}`);

    // ========================================================================
    // Step 3: Verify wallet signature
    // ========================================================================
    
    const expectedMessage = createSignableMessage(message);
    log(`Expected message: ${expectedMessage}`);

    const isValidSignature = await verifySignature(
      expectedMessage,
      signature,
      address
    );

    if (!isValidSignature) {
      logError('Signature verification failed');
      const errorResponse: ErrorResponse = {
        error: 'Invalid signature. Wallet ownership could not be verified.',
      };
      return res.json(errorResponse, 401);
    }

    log('✓ Signature verified successfully');

    // ========================================================================
    // Step 4: Initialize Appwrite client
    // ========================================================================
    
    const apiKey = process.env.APPWRITE_FUNCTION_API_KEY || process.env.APPWRITE_API_KEY;
    if (!apiKey) {
      logError('Function API key not configured in environment');
      const errorResponse: ErrorResponse = {
        error: 'Server configuration error',
      };
      return res.json(errorResponse, 500);
    }

    const client = createAppwriteClient(apiKey);
    const users = new Users(client);

    // ========================================================================
    // Step 5: Normalize wallet address
    // ========================================================================
    
    const normalizedAddress = normalizeEthAddress(address);
    log(`Normalized address: ${normalizedAddress}`);

    // ========================================================================
    // Step 6: Check for wallet conflicts
    // ========================================================================
    
    try {
      // Get current user's preferences
      const user = await users.get(userId);
      const prefs = (user.prefs || {}) as UserPrefs;
      const existingWallet = prefs.walletEth?.toLowerCase();

      if (existingWallet && existingWallet === normalizedAddress) {
        // Wallet is already connected to this account
        log('Wallet already connected to this account');
        const response: ConnectWalletResponse = {
          success: true,
          userId,
          message: 'Wallet is already connected to this account',
        };
        return res.json(response, 200);
      }

      if (existingWallet && existingWallet !== normalizedAddress) {
        // Try to connect a different wallet to an account that already has one
        logError('User already has a connected wallet');
        const errorResponse: ErrorResponse = {
          error: 'Account already has a connected wallet. Disconnect the existing wallet first.',
        };
        return res.json(errorResponse, 403);
      }

      // ========================================================================
      // Step 7: Bind wallet to account
      // ========================================================================
      
      await users.updatePrefs(userId, {
        ...prefs,
        walletEth: normalizedAddress,
      });

      log(`✓ Wallet ${normalizedAddress} connected to user ${userId}`);

      // ========================================================================
      // Step 8: Return success response
      // ========================================================================
      
      const successResponse: ConnectWalletResponse = {
        success: true,
        userId,
        message: 'Wallet connected successfully to your account',
      };

      return res.json(successResponse, 200);
      
    } catch (userError: any) {
      logError(`User operation error: ${userError.message}`);
      const errorResponse: ErrorResponse = {
        error: userError.message || 'Failed to connect wallet',
      };
      return res.json(errorResponse, 500);
    }
    
  } catch (err: any) {
    logError(`Unexpected error: ${err.message}`);
    const errorResponse: ErrorResponse = {
      error: err.message || 'Failed to connect wallet',
    };
    return res.json(errorResponse, 500);
  }
}

/**
 * Disconnects a wallet from an existing authenticated account
 * 
 * This function allows users to remove a wallet from their account (e.g., from settings).
 * The user must be authenticated. No signature verification is needed.
 * 
 * Flow:
 * 1. Extract user ID from authorization header (must be authenticated)
 * 2. Get user's current preferences
 * 3. Remove wallet binding
 * 4. Update user preferences
 * 5. Return success
 * 
 * @param context - Appwrite Function context
 */
export async function handleDisconnectWallet(
  context: AppwriteFunctionContext
): Promise<void> {
  const { req, res, log, error: logError } = context;

  try {
    // ========================================================================
    // Step 1: Verify user is authenticated
    // ========================================================================
    
    const authHeader = req.headers['authorization'] || req.headers['x-appwrite-user-id'];
    const userId = extractUserIdFromAuth(authHeader as string);

    if (!userId) {
      log('No valid authentication provided');
      const errorResponse: ErrorResponse = {
        error: 'Authentication required. Please log in first.',
      };
      return res.json(errorResponse, 401);
    }

    log(`User ${userId} requesting wallet disconnection`);

    // ========================================================================
    // Step 2: Initialize Appwrite client
    // ========================================================================
    
    const apiKey = process.env.APPWRITE_FUNCTION_API_KEY || process.env.APPWRITE_API_KEY;
    if (!apiKey) {
      logError('Function API key not configured in environment');
      const errorResponse: ErrorResponse = {
        error: 'Server configuration error',
      };
      return res.json(errorResponse, 500);
    }

    const client = createAppwriteClient(apiKey);
    const users = new Users(client);

    // ========================================================================
    // Step 3: Get user and remove wallet binding
    // ========================================================================
    
    try {
      const user = await users.get(userId);
      const prefs = (user.prefs || {}) as UserPrefs;
      const hadWallet = Boolean(prefs.walletEth);

      if (!hadWallet) {
        // No wallet connected, nothing to do
        log('No wallet connected to this account');
        const response: DisconnectWalletResponse = {
          success: true,
          userId,
          message: 'No wallet connected to this account',
        };
        return res.json(response, 200);
      }

      // ========================================================================
      // Step 4: Remove wallet from preferences
      // ========================================================================
      
      const updatedPrefs: UserPrefs = { ...prefs };
      delete updatedPrefs.walletEth;

      await users.updatePrefs(userId, updatedPrefs);

      log(`✓ Wallet disconnected from user ${userId}`);

      // ========================================================================
      // Step 5: Return success response
      // ========================================================================
      
      const successResponse: DisconnectWalletResponse = {
        success: true,
        userId,
        message: 'Wallet disconnected successfully from your account',
      };

      return res.json(successResponse, 200);
      
    } catch (userError: any) {
      logError(`User operation error: ${userError.message}`);
      const errorResponse: ErrorResponse = {
        error: userError.message || 'Failed to disconnect wallet',
      };
      return res.json(errorResponse, 500);
    }
    
  } catch (err: any) {
    logError(`Unexpected error: ${err.message}`);
    const errorResponse: ErrorResponse = {
      error: err.message || 'Failed to disconnect wallet',
    };
    return res.json(errorResponse, 500);
  }
}
