import { handleAuthentication } from './auth-handler.js';
import type { AppwriteFunctionContext } from './types.js';

/**
 * Main Appwrite Function entry point
 * Handles routing and execution of Web3 authentication flows
 */
export default async (context: AppwriteFunctionContext) => {
  const { req, res, log } = context;

  log(`Request received: ${req.method} ${req.path}`);
  log(`Headers: ${JSON.stringify(req.headers)}`);

  // Route: Health check / Ping
  if (req.path === '/ping' || req.path === '/health') {
    log('Health check requested');
    return res.json({
      status: 'ok',
      service: 'Web3 Authentication',
      timestamp: new Date().toISOString(),
    });
  }

  // Route: Web3 Authentication
  if (req.path === '/auth' || req.path === '/authenticate' || req.path === '/') {
    if (req.method === 'POST') {
      return handleAuthentication(context);
    } else {
      // Return API documentation for non-POST requests
      return res.json({
        service: 'Web3 Authentication API',
        version: '1.0.0',
        endpoints: {
          'POST /auth': {
            description: 'Authenticate with Web3 wallet signature',
            body: {
              email: 'string (required)',
              address: 'string (required) - Ethereum wallet address',
              signature: 'string (required) - Signed message',
              message: 'string (required) - Original message that was signed',
            },
            response: {
              userId: 'string - Appwrite user ID',
              secret: 'string - Custom token secret for session creation',
            },
          },
          'GET /ping': {
            description: 'Health check endpoint',
            response: {
              status: 'ok',
              service: 'Web3 Authentication',
              timestamp: 'ISO timestamp',
            },
          },
        },
        documentation:
          'This function verifies Web3 wallet signatures and creates Appwrite user sessions.',
        security: 'Requires x-appwrite-key header with valid API key',
      });
    }
  }

  // Route: Not found
  log(`Route not found: ${req.path}`);
  return res.json(
    {
      error: 'Route not found',
      path: req.path,
      availableRoutes: ['/auth', '/ping', '/health'],
    },
    404
  );
};

