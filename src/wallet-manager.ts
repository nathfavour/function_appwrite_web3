/**
 * Wallet Manager Handler
 * 
 * This module handles wallet connection and disconnection for existing authenticated accounts.
 * These are distinct from authentication flows - they're used in account settings to add/remove wallets.
 * 
 * Uses the same SDK initialization approach as the auth handler.
 * The authenticated client context is used directly via the SDK.
 */

import { Account, Users, Client } from 'node-appwrite';
import {
  verifySignature,
  normalizeEthAddress,
  createSignableMessage,
} from './web3-utils.js';
import {
  createAppwriteClient,
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
 * Connects a wallet to an existing authenticated account
 * 
 * Uses the same authentication context the client has.
 * Follows the same registration flow: verify signature, then update user prefs.
 * 
 * @param context - Appwrite Function context
 */
export async function handleConnectWallet(
  context: AppwriteFunctionContext
): Promise<void> {
  const { req, res, log, error: logError } = context;

  try {
    // ========================================================================
    // Step 1: Parse and validate request body
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

    log(`Connecting wallet ${address}`);

    // ========================================================================
    // Step 2: Verify wallet signature (same as auth flow)
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
    // Step 3: Initialize Appwrite client using SDK
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
    const account = new Account(client);
    const users = new Users(client);

    // ========================================================================
    // Step 4: Get the authenticated user from the client context
    // ========================================================================
    
    let user: any;
    try {
      user = await account.get();
    } catch (userError: any) {
      logError(`Failed to get authenticated user: ${userError.message}`);
      const errorResponse: ErrorResponse = {
        error: 'Authentication required. Please log in first.',
      };
      return res.json(errorResponse, 401);
    }

    const userId = user.$id;
    log(`User ${userId} connecting wallet ${address}`);

    // ========================================================================
    // Step 5: Normalize wallet address
    // ========================================================================
    
    const normalizedAddress = normalizeEthAddress(address);
    log(`Normalized address: ${normalizedAddress}`);

    // ========================================================================
    // Step 6: Check for wallet conflicts
    // ========================================================================
    
    const prefs = (user.prefs || {}) as UserPrefs;
    const existingWallet = prefs.walletEth?.toLowerCase();

    if (existingWallet && existingWallet === normalizedAddress) {
      log('Wallet already connected to this account');
      const response: ConnectWalletResponse = {
        success: true,
        userId,
        message: 'Wallet is already connected to this account',
      };
      return res.json(response, 200);
    }

    if (existingWallet && existingWallet !== normalizedAddress) {
      logError('User already has a connected wallet');
      const errorResponse: ErrorResponse = {
        error: 'Account already has a connected wallet. Disconnect the existing wallet first.',
      };
      return res.json(errorResponse, 403);
    }

    // ========================================================================
    // Step 7: Bind wallet to account
    // ========================================================================
    
    try {
      await users.updatePrefs(userId, {
        ...prefs,
        walletEth: normalizedAddress,
      });

      log(`✓ Wallet ${normalizedAddress} connected to user ${userId}`);

      const successResponse: ConnectWalletResponse = {
        success: true,
        userId,
        message: 'Wallet connected successfully to your account',
      };

      return res.json(successResponse, 200);
      
    } catch (updateError: any) {
      logError(`Failed to update user preferences: ${updateError.message}`);
      const errorResponse: ErrorResponse = {
        error: 'Failed to connect wallet',
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
 * Uses the same authentication context the client has.
 * Simple: get authenticated user, remove wallet from prefs.
 * 
 * @param context - Appwrite Function context
 */
export async function handleDisconnectWallet(
  context: AppwriteFunctionContext
): Promise<void> {
  const { req, res, log, error: logError } = context;

  try {
    // ========================================================================
    // Step 1: Initialize Appwrite client using SDK
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
    const account = new Account(client);
    const users = new Users(client);

    // ========================================================================
    // Step 2: Get the authenticated user from the client context
    // ========================================================================
    
    let user: any;
    try {
      user = await account.get();
    } catch (userError: any) {
      logError(`Failed to get authenticated user: ${userError.message}`);
      const errorResponse: ErrorResponse = {
        error: 'Authentication required. Please log in first.',
      };
      return res.json(errorResponse, 401);
    }

    const userId = user.$id;
    log(`User ${userId} requesting wallet disconnection`);

    // ========================================================================
    // Step 3: Get user preferences and remove wallet
    // ========================================================================
    
    const prefs = (user.prefs || {}) as UserPrefs;
    const hadWallet = Boolean(prefs.walletEth);

    if (!hadWallet) {
      log('No wallet connected to this account');
      const response: DisconnectWalletResponse = {
        success: true,
        userId,
        message: 'No wallet connected to this account',
      };
      return res.json(response, 200);
    }

    // ========================================================================
    // Step 4: Update preferences to remove wallet
    // ========================================================================
    
    try {
      const updatedPrefs: UserPrefs = { ...prefs };
      delete updatedPrefs.walletEth;

      await users.updatePrefs(userId, updatedPrefs);

      log(`✓ Wallet disconnected from user ${userId}`);

      const successResponse: DisconnectWalletResponse = {
        success: true,
        userId,
        message: 'Wallet disconnected successfully from your account',
      };

      return res.json(successResponse, 200);
      
    } catch (updateError: any) {
      logError(`Failed to update user preferences: ${updateError.message}`);
      const errorResponse: ErrorResponse = {
        error: 'Failed to disconnect wallet',
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
