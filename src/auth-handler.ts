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
 * Verifies signature, finds/creates user, and generates custom token
 */
export async function handleAuthentication(
  context: AppwriteFunctionContext
): Promise<void> {
  const { req, res, log, error: logError } = context;

  try {
    // Parse request body
    let authRequest: AuthRequest;
    try {
      authRequest = JSON.parse(req.bodyRaw) as AuthRequest;
    } catch (parseError) {
      const errorResponse: ErrorResponse = { error: 'Invalid JSON in request body' };
      return res.json(errorResponse, 400);
    }

    const { email, address, signature, message } = authRequest;

    // Validate required fields
    if (!email || !address || !signature || !message) {
      const errorResponse: ErrorResponse = { error: 'Missing required fields' };
      return res.json(errorResponse, 400);
    }

    log(`Authentication attempt for email: ${email}, address: ${address}`);

    // Verify signature matches expected message and address
    const expectedMessage = createSignableMessage(message);
    const isValidSignature = await verifySignature(
      expectedMessage,
      signature,
      address
    );

    if (!isValidSignature) {
      logError('Invalid signature verification failed');
      const errorResponse: ErrorResponse = { error: 'Invalid signature' };
      return res.json(errorResponse, 401);
    }

    log('Signature verified successfully');

    // Get API key from request header
    const apiKey = req.headers['x-appwrite-key'];
    if (!apiKey) {
      const errorResponse: ErrorResponse = { error: 'API key required' };
      return res.json(errorResponse, 401);
    }

    // Create Appwrite client
    const client = createAppwriteClient(apiKey);
    const users = new Users(client);

    // Normalize wallet address
    const normalizedAddress = normalizeEthAddress(address);
    log(`Normalized address: ${normalizedAddress}`);

    // Find or create user with wallet binding
    let userId: string;
    try {
      userId = await findOrCreateUserWithWallet(users, email, normalizedAddress);
      log(`User ID: ${userId}`);
    } catch (userError: any) {
      logError(`User creation/lookup error: ${userError.message}`);
      const errorResponse: ErrorResponse = {
        error: userError.message || 'User authentication failed',
      };
      return res.json(
        errorResponse,
        userError.message.includes('passkey') ||
          userError.message.includes('different wallet')
          ? 403
          : 500
      );
    }

    // Create custom token
    const tokenData = await createCustomToken(users, userId);
    log('Custom token created successfully');

    // Return success response
    const successResponse: AuthResponse = {
      userId: tokenData.userId,
      secret: tokenData.secret,
    };

    return res.json(successResponse, 200);
  } catch (err: any) {
    logError(`Authentication error: ${err.message}`);
    const errorResponse: ErrorResponse = {
      error: err.message || 'Authentication failed',
    };
    return res.json(errorResponse, 500);
  }
}
