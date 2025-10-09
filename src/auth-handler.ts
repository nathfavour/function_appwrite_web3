/**
 * Web3 Authentication Handler
 * 
 * This module handles the complete Web3 wallet authentication flow.
 * It exactly replicates the logic from the Next.js API route at:
 * /app/api/custom-token/route.ts
 * 
 * Flow:
 * 1. Parse and validate request body
 * 2. Verify wallet signature
 * 3. Find or create user with wallet binding
 * 4. Generate custom token
 * 5. Return token for session creation
 */

import { Users } from 'node-appwrite';
import {
  verifySignature,
  normalizeEthAddress,
  createSignableMessage,
} from './web3-utils.js';
import {
  createAppwriteClient,
  findOrCreateUserWithWallet,
  createCustomToken,
} from './appwrite-helpers.js';
import type {
  AppwriteFunctionContext,
  AuthRequest,
  AuthResponse,
  ErrorResponse,
} from './types.js';

/**
 * Main authentication handler for Web3 wallet login
 * 
 * This function processes authentication requests from Web3 wallets.
 * It verifies the signature, manages user accounts, and generates
 * custom tokens for session creation.
 * 
 * Expected request body (JSON):
 * {
 *   "email": "user@example.com",
 *   "address": "0xABC...",
 *   "signature": "0x123...",
 *   "message": "auth-1234567890"
 * }
 * 
 * Success response (200):
 * {
 *   "userId": "user_id",
 *   "secret": "token_secret"
 * }
 * 
 * Error responses:
 * - 400: Missing required fields or invalid JSON
 * - 401: Invalid signature
 * - 403: Email bound to different wallet or passkey conflict
 * - 500: Server error or configuration error
 * 
 * @param context - Appwrite Function context
 */
export async function handleAuthentication(
  context: AppwriteFunctionContext
): Promise<void> {
  const { req, res, log, error: logError } = context;

  try {
    // ========================================================================
    // Step 1: Parse and validate request body
    // ========================================================================
    
    let authRequest: AuthRequest;
    try {
      authRequest = JSON.parse(req.bodyRaw) as AuthRequest;
    } catch (parseError) {
      log('Failed to parse request body as JSON');
      const errorResponse: ErrorResponse = { 
        error: 'Invalid JSON in request body' 
      };
      return res.json(errorResponse, 400);
    }

    const { email, address, signature, message } = authRequest;

    // Validate that all required fields are present
    if (!email || !address || !signature || !message) {
      log('Missing required fields in request');
      const errorResponse: ErrorResponse = { 
        error: 'Missing required fields' 
      };
      return res.json(errorResponse, 400);
    }

    log(`Authentication attempt for email: ${email}, address: ${address}`);

    // ========================================================================
    // Step 2: Verify wallet signature
    // ========================================================================
    
    // Reconstruct the full message that was signed
    // This must match exactly what the client signed in their wallet
    const expectedMessage = createSignableMessage(message);
    log(`Expected message: ${expectedMessage}`);
    
    // Cryptographically verify the signature
    const isValidSignature = await verifySignature(
      expectedMessage,
      signature,
      address
    );

    if (!isValidSignature) {
      logError('Signature verification failed');
      const errorResponse: ErrorResponse = { 
        error: 'Invalid signature' 
      };
      return res.json(errorResponse, 401);
    }

    log('✓ Signature verified successfully');

    // ========================================================================
    // Step 3: Initialize Appwrite client with function's API key
    // ========================================================================
    
    // Use the API key from environment (automatically provided by Appwrite)
    // This is more secure than passing API key from client
    const apiKey = process.env.APPWRITE_API_KEY;
    if (!apiKey) {
      logError('Function API key not configured in environment');
      const errorResponse: ErrorResponse = { 
        error: 'Server configuration error' 
      };
      return res.json(errorResponse, 500);
    }

    // Create Appwrite client with API key
    const client = createAppwriteClient(apiKey);
    const users = new Users(client);

    // ========================================================================
    // Step 4: Normalize wallet address
    // ========================================================================
    
    // Convert address to lowercase for consistent storage and comparison
    const normalizedAddress = normalizeEthAddress(address);
    log(`Normalized address: ${normalizedAddress}`);

    // ========================================================================
    // Step 5: Find or create user with wallet binding
    // ========================================================================
    
    let userId: string;
    try {
      userId = await findOrCreateUserWithWallet(
        users, 
        email, 
        normalizedAddress
      );
      log(`✓ User ID: ${userId}`);
    } catch (userError: any) {
      logError(`User creation/lookup error: ${userError.message}`);
      
      // Determine appropriate HTTP status code based on error type
      const statusCode = 
        userError.message.includes('passkey') ||
        userError.message.includes('different wallet') ||
        userError.message.includes('Account already exists')
          ? 403  // Forbidden - security validation failed
          : 500; // Internal server error
      
      const errorResponse: ErrorResponse = {
        error: userError.message || 'User authentication failed',
      };
      return res.json(errorResponse, statusCode);
    }

    // ========================================================================
    // Step 6: Create custom token
    // ========================================================================
    
    // Generate a custom token that the client can use to create a session
    const tokenData = await createCustomToken(users, userId);
    log('✓ Custom token created successfully');

    // ========================================================================
    // Step 7: Return success response
    // ========================================================================
    
    const successResponse: AuthResponse = {
      userId: tokenData.userId,
      secret: tokenData.secret,
    };

    log('Authentication completed successfully');
    return res.json(successResponse, 200);
    
  } catch (err: any) {
    // Catch-all error handler for unexpected errors
    logError(`Unexpected authentication error: ${err.message}`);
    const errorResponse: ErrorResponse = {
      error: err.message || 'Authentication failed',
    };
    return res.json(errorResponse, 500);
  }
}

