/**
 * Wallet Manager Handler - Connect Wallet Only
 * 
 * This module handles wallet connection for existing authenticated accounts.
 * This is distinct from authentication flow - it's used to add a wallet to an account.
 * 
 * Uses the session context from request headers (passed by authenticated client).
 * The client must already be logged in.
 * 
 * NOTE: Wallet disconnection is a client-side operation - simply delete walletEth pref via SDK.
 */

import { Account, Users, Client } from 'node-appwrite';
import {
  verifySignature,
  normalizeEthAddress,
  createSignableMessage,
} from './web3-utils.js';
import type {
  AppwriteFunctionContext,
  ConnectWalletRequest,
  ConnectWalletResponse,
  ErrorResponse,
  UserPrefs,
} from './types.js';

/**
 * Connects a wallet to an existing authenticated account
 * 
 * Verifies wallet ownership via signature, then binds to existing account prefs.
 * Follows same verification approach as registration flow: sign message, verify, bind.
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
    // Step 3: Initialize Appwrite client using session from request
    // ========================================================================
    
    const sessionToken = req.headers['x-appwrite-session'] as string;
    if (!sessionToken) {
      logError('No session token in request headers');
      const errorResponse: ErrorResponse = {
        error: 'Authentication required. Please log in first.',
      };
      return res.json(errorResponse, 401);
    }

    const endpoint = process.env.APPWRITE_FUNCTION_API_ENDPOINT;
    const projectId = process.env.APPWRITE_FUNCTION_PROJECT_ID;

    if (!endpoint || !projectId) {
      logError('Appwrite environment variables not configured');
      const errorResponse: ErrorResponse = {
        error: 'Server configuration error',
      };
      return res.json(errorResponse, 500);
    }

    const client = new Client()
      .setEndpoint(endpoint)
      .setProject(projectId)
      .setSession(sessionToken);

    const account = new Account(client);
    const users = new Users(client);

    // ========================================================================
    // Step 4: Get the authenticated user from session
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
