/**
 * Appwrite Function: Web3 Wallet Authentication
 * 
 * This function provides a complete Web3 wallet authentication API
 * that can be used by any frontend framework (Vue, Svelte, vanilla JS, etc.)
 * without needing backend API routes.
 * 
 * It replicates the exact functionality of the Next.js API route at:
 * /app/api/custom-token/route.ts
 * 
 * This enables frontend-only frameworks to implement MetaMask/Web3 authentication
 * with Appwrite user management, without requiring their own backend infrastructure.
 * 
 * ============================================================================
 * ENDPOINTS
 * ============================================================================
 * 
 * POST /auth (or / or /authenticate)
 *   Authenticate with Web3 wallet signature
 *   
 *   Request Headers:
 *     Content-Type: application/json
 *     x-appwrite-key: YOUR_API_KEY
 *   
 *   Request Body:
 *     {
 *       "email": "user@example.com",
 *       "address": "0xABC...",
 *       "signature": "0x123...",
 *       "message": "auth-1234567890"
 *     }
 *   
 *   Success Response (200):
 *     {
 *       "userId": "unique_user_id",
 *       "secret": "custom_token_secret"
 *     }
 *   
 *   Error Responses:
 *     400: Missing required fields / Invalid JSON
 *     401: Invalid signature / Missing API key
 *     403: Email bound to different wallet / Passkey conflict
 *     500: Server error
 * 
 * GET /ping (or /health)
 *   Health check endpoint
 *   
 *   Response (200):
 *     {
 *       "status": "ok",
 *       "service": "Web3 Authentication",
 *       "timestamp": "2024-01-01T00:00:00.000Z"
 *     }
 * 
 * ============================================================================
 * USAGE EXAMPLE (Frontend)
 * ============================================================================
 * 
 * // 1. Connect wallet and sign message
 * const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
 * const address = accounts[0];
 * const message = `auth-${Date.now()}`;
 * const fullMessage = `Sign this message to authenticate: ${message}`;
 * const signature = await window.ethereum.request({
 *   method: 'personal_sign',
 *   params: [fullMessage, address]
 * });
 * 
 * // 2. Call this function
 * const response = await fetch('YOUR_FUNCTION_URL/auth', {
 *   method: 'POST',
 *   headers: {
 *     'Content-Type': 'application/json',
 *     'x-appwrite-key': 'YOUR_API_KEY'
 *   },
 *   body: JSON.stringify({ email, address, signature, message })
 * });
 * 
 * const { userId, secret } = await response.json();
 * 
 * // 3. Create Appwrite session
 * import { Client, Account } from 'appwrite';
 * const client = new Client()
 *   .setEndpoint('YOUR_ENDPOINT')
 *   .setProject('YOUR_PROJECT');
 * const account = new Account(client);
 * await account.createSession({ userId, secret });
 * 
 * ============================================================================
 */

import { handleAuthentication } from './auth-handler.js';
import type { 
  AppwriteFunctionContext, 
  HealthResponse, 
  ApiDocumentation 
} from './types.js';

/**
 * Main Appwrite Function entry point
 * 
 * Handles routing and execution of Web3 authentication flows.
 * This function is called by the Appwrite runtime for each request.
 * 
 * @param context - Appwrite Function context with request/response objects
 */
export default async (context: AppwriteFunctionContext) => {
  const { req, res, log } = context;

  // Log every incoming request for debugging
  log(`📥 Request: ${req.method} ${req.path}`);
  log(`Headers: ${JSON.stringify(req.headers)}`);

  // ========================================================================
  // Route: Health Check / Ping
  // ========================================================================
  
  if (req.path === '/ping' || req.path === '/health') {
    log('Health check requested');
    
    const healthResponse: HealthResponse = {
      status: 'ok',
      service: 'Web3 Authentication',
      timestamp: new Date().toISOString(),
    };
    
    return res.json(healthResponse, 200);
  }

  // ========================================================================
  // Route: Web3 Authentication
  // ========================================================================
  
  if (req.path === '/auth' || req.path === '/authenticate' || req.path === '/') {
    if (req.method === 'POST') {
      // Handle authentication request
      return handleAuthentication(context);
    } else {
      // Return API documentation for non-POST requests
      log('API documentation requested');
      
      const documentation: ApiDocumentation = {
        service: 'Web3 Authentication API',
        version: '1.0.0',
        endpoints: {
          'POST /auth': {
            description: 'Authenticate with Web3 wallet signature',
            headers: {
              'Content-Type': 'application/json',
              'x-appwrite-key': 'string (required) - Your Appwrite API key'
            },
            body: {
              email: 'string (required) - User email address',
              address: 'string (required) - Ethereum wallet address (0x...)',
              signature: 'string (required) - Signed message from wallet',
              message: 'string (required) - Original message that was signed (e.g., auth-1234567890)',
            },
            responses: {
              '200': {
                description: 'Authentication successful',
                body: {
                  userId: 'string - Appwrite user ID',
                  secret: 'string - Custom token secret for session creation',
                }
              },
              '400': {
                description: 'Bad request - missing fields or invalid JSON',
                body: { error: 'string - Error description' }
              },
              '401': {
                description: 'Unauthorized - invalid signature or missing API key',
                body: { error: 'string - Error description' }
              },
              '403': {
                description: 'Forbidden - email bound to different wallet or passkey conflict',
                body: { error: 'string - Error description' }
              },
              '500': {
                description: 'Internal server error',
                body: { error: 'string - Error description' }
              }
            }
          },
          'GET /ping': {
            description: 'Health check endpoint',
            response: {
              status: 'ok',
              service: 'Web3 Authentication',
              timestamp: 'ISO 8601 timestamp',
            },
          },
        },
        documentation: 
          'This function verifies Web3 wallet signatures and creates Appwrite user sessions. ' +
          'It enables frontend-only frameworks to implement wallet authentication without backend infrastructure. ' +
          'The signature verification uses ethers.js to cryptographically prove wallet ownership.',
        security: 
          'Requires x-appwrite-key header with a valid API key. ' +
          'The API key should have permissions to create users and tokens. ' +
          'Never expose the API key in frontend code - use environment variables or secure configuration.'
      };
      
      return res.json(documentation, 200);
    }
  }

  // ========================================================================
  // Route: Not Found
  // ========================================================================
  
  log(`❌ Route not found: ${req.path}`);
  
  return res.json(
    {
      error: 'Route not found',
      path: req.path,
      method: req.method,
      availableRoutes: [
        'POST /auth - Authenticate with Web3 wallet',
        'POST /authenticate - Alias for /auth',
        'POST / - Alias for /auth',
        'GET /ping - Health check',
        'GET /health - Health check',
      ],
      documentation: 'Send a GET request to /auth for detailed API documentation'
    },
    404
  );
};

