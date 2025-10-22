/**
 * Wallet Manager Handler - Connect Wallet Only
 * 
 * This module handles wallet connection for existing authenticated accounts.
 * This is distinct from authentication flow - it's used to add a wallet to an account.
 * 
 * Client must send their user ID in the request body.
 * The API key is used to update preferences for the authenticated user.
 * 
 * NOTE: Wallet disconnection is a client-side operation - simply delete walletEth pref via SDK.
 */

import { Users, Client } from 'node-appwrite';
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
  ErrorResponse,
  UserPrefs,
} from './types.js';

interface ConnectWalletRequest {
  userId: string;
  address: string;
  signature: string;
  message: string;
}

interface ConnectWalletResponse {
  success: boolean;
  userId: string;
  message: string;
}

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

    const { userId, address, signature, message } = connectRequest;

    if (!userId || !address || !signature || !message) {
      log('Missing required fields in request');
      const errorResponse: ErrorResponse = {
        error: 'Missing required fields: userId, address, signature, message',
      };
      return res.json(errorResponse, 400);
    }

    log(`User ${userId} connecting wallet ${address}`);

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
    // Step 3: Initialize Appwrite client using API key
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
    // Step 4: Get the user by their ID and verify it exists
    // ========================================================================
    
    let user: any;
    try {
      user = await users.get(userId);
    } catch (userError: any) {
      logError(`User not found: ${userError.message}`);
      const errorResponse: ErrorResponse = {
        error: 'User not found. Are you logged in?',
      };
      return res.json(errorResponse, 401);
    }

    log(`User ${userId} found, connecting wallet ${address}`);

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
