// Type definitions for Appwrite Function context
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

// API Request/Response types
export interface AuthRequest {
  email: string;
  address: string;
  signature: string;
  message: string;
}

export interface AuthResponse {
  userId: string;
  secret: string;
}

export interface ErrorResponse {
  error: string;
}

// User preference types
export interface UserPrefs {
  walletEth?: string;
  passkey_credentials?: boolean;
  [key: string]: any;
}
