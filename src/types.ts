/**
 * Type definitions for Appwrite Function context and API contracts
 * Replicates the exact data structures from the Next.js implementation
 */

// ============================================================================
// Appwrite Function Context Types
// ============================================================================

export interface AppwriteFunctionContext {
  req: AppwriteRequest;
  res: AppwriteResponse;
  log: (message: string) => void;
  error: (message: string) => void;
}

export interface AppwriteRequest {
  bodyRaw: string;
  body: Record<string, any>;
  headers: Record<string, string>;
  method: string;
  url: string;
  scheme: string;
  host: string;
  port: number;
  path: string;
  queryString: string;
  query: Record<string, string>;
}

export interface AppwriteResponse {
  send: (text: string, statusCode?: number, headers?: Record<string, string>) => void;
  json: (obj: any, statusCode?: number, headers?: Record<string, string>) => void;
  empty: () => void;
  redirect: (url: string, statusCode?: number) => void;
}

// ============================================================================
// API Request/Response Types (matches Next.js /api/custom-token)
// ============================================================================

/**
 * Authentication request payload
 * Matches the POST body sent from the Next.js login page
 */
export interface AuthRequest {
  email: string;           // User's email address
  address: string;         // Ethereum wallet address (0x...)
  signature: string;       // Signature produced by wallet
  message: string;         // Original message (timestamp part: auth-{timestamp})
}

/**
 * Successful authentication response
 * Contains the custom token needed to create an Appwrite session
 */
export interface AuthResponse {
  userId: string;          // Appwrite user ID
  secret: string;          // Custom token secret for session creation
}

/**
 * Error response structure
 * Returned for any authentication failures
 */
export interface ErrorResponse {
  error: string;           // Human-readable error message
}

// ============================================================================
// User Preference Types
// ============================================================================

/**
 * User preferences stored in Appwrite
 * Used to bind wallet addresses to user accounts
 */
export interface UserPrefs {
  walletEth?: string;                  // Normalized lowercase Ethereum address
  passkey_credentials?: boolean;        // Indicator of passkey authentication setup
  [key: string]: any;                  // Allow additional custom preferences
}

// ============================================================================
// Token Types
// ============================================================================

/**
 * Custom token data structure
 * Returned by Appwrite Users API
 */
export interface TokenData {
  userId: string;
  secret: string;
}

// ============================================================================
// Health Check Types
// ============================================================================

/**
 * Health check response
 */
export interface HealthResponse {
  status: 'ok';
  service: string;
  timestamp: string;
}

/**
 * API documentation response
 */
export interface ApiDocumentation {
  service: string;
  version: string;
  endpoints: Record<string, any>;
  documentation: string;
  security: string;
}

