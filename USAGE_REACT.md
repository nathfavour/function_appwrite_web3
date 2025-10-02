# 🔐 Web3 Authentication for React - Complete Guide

A comprehensive guide for integrating Web3 wallet authentication (MetaMask, WalletConnect) into React applications using the Appwrite Function.

---

## 📋 Table of Contents

1. [Quick Start](#quick-start)
2. [Setup & Installation](#setup--installation)
3. [Basic Integration](#basic-integration)
4. [React Hook - Production Ready](#react-hook---production-ready)
5. [Complete Examples](#complete-examples)
6. [Context API Integration](#context-api-integration)
7. [Error Handling](#error-handling)
8. [TypeScript Support](#typescript-support)
9. [Best Practices](#best-practices)
10. [Troubleshooting](#troubleshooting)

---

## 🚀 Quick Start

### 30-Second Integration

```tsx
import { Client, Account, Functions } from 'appwrite';
import { useState } from 'react';

function Login() {
  const [email, setEmail] = useState('');

  const handleLogin = async () => {
    // 1. Initialize Appwrite
    const client = new Client()
      .setEndpoint('https://cloud.appwrite.io/v1')
      .setProject('YOUR_PROJECT_ID');
    
    const account = new Account(client);
    const functions = new Functions(client);

    // 2. Connect wallet
    const accounts = await window.ethereum.request({ 
      method: 'eth_requestAccounts' 
    });
    const address = accounts[0];

    // 3. Sign message
    const message = `auth-${Date.now()}`;
    const fullMessage = `Sign this message to authenticate: ${message}`;
    const signature = await window.ethereum.request({
      method: 'personal_sign',
      params: [fullMessage, address]
    });

    // 4. Call Appwrite Function
    const execution = await functions.createExecution(
      'YOUR_FUNCTION_ID',
      JSON.stringify({ email, address, signature, message }),
      false
    );

    const response = JSON.parse(execution.responseBody);

    // 5. Create session
    await account.createSession({
      userId: response.userId,
      secret: response.secret
    });
  };

  return (
    <div>
      <input 
        type="email" 
        value={email} 
        onChange={e => setEmail(e.target.value)} 
      />
      <button onClick={handleLogin}>Connect Wallet</button>
    </div>
  );
}
```

---

## 📦 Setup & Installation

### 1. Install Dependencies

```bash
npm install appwrite
# or
yarn add appwrite
# or
pnpm add appwrite
```

### 2. Environment Variables

Create `.env` (or `.env.local` for Next.js):

```env
REACT_APP_APPWRITE_ENDPOINT=https://cloud.appwrite.io/v1
REACT_APP_APPWRITE_PROJECT=your-project-id
REACT_APP_FUNCTION_ID=your-web3-auth-function-id
```

**For Next.js**, use `NEXT_PUBLIC_` prefix:
```env
NEXT_PUBLIC_APPWRITE_ENDPOINT=https://cloud.appwrite.io/v1
NEXT_PUBLIC_APPWRITE_PROJECT=your-project-id
NEXT_PUBLIC_FUNCTION_ID=your-function-id
```

### 3. TypeScript Types (Optional)

```typescript
// types/web3.ts
export interface Web3AuthRequest {
  email: string;
  address: string;
  signature: string;
  message: string;
}

export interface Web3AuthResponse {
  userId: string;
  secret: string;
}

declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: any[] }) => Promise<any>;
      isMetaMask?: boolean;
    };
  }
}
```

---

## 🔧 Basic Integration

### Appwrite Client Setup

Create a singleton Appwrite client:

```typescript
// lib/appwrite.ts
import { Client, Account, Functions } from 'appwrite';

const client = new Client()
  .setEndpoint(process.env.REACT_APP_APPWRITE_ENDPOINT!)
  .setProject(process.env.REACT_APP_APPWRITE_PROJECT!);

export const account = new Account(client);
export const functions = new Functions(client);
export { client };
```

### Web3 Authentication Function

```typescript
// lib/web3Auth.ts
import { functions, account } from './appwrite';

export async function authenticateWithWallet(email: string) {
  // Step 1: Check MetaMask
  if (!window.ethereum) {
    throw new Error('MetaMask not installed');
  }

  // Step 2: Connect wallet
  const accounts = await window.ethereum.request({ 
    method: 'eth_requestAccounts' 
  });
  const address = accounts[0];

  // Step 3: Generate message
  const timestamp = Date.now();
  const message = `auth-${timestamp}`;
  const fullMessage = `Sign this message to authenticate: ${message}`;

  // Step 4: Sign message
  const signature = await window.ethereum.request({
    method: 'personal_sign',
    params: [fullMessage, address]
  });

  // Step 5: Call Appwrite Function
  const execution = await functions.createExecution(
    process.env.REACT_APP_FUNCTION_ID!,
    JSON.stringify({ email, address, signature, message }),
    false // Synchronous execution
  );

  // Parse response
  const response = JSON.parse(execution.responseBody);
  
  if (execution.responseStatusCode !== 200) {
    throw new Error(response.error || 'Authentication failed');
  }

  // Step 6: Create session
  await account.createSession({
    userId: response.userId,
    secret: response.secret
  });

  // Step 7: Get user info
  return await account.get();
}
```

---

## 🪝 React Hook - Production Ready

### Complete useWeb3Auth Hook

```typescript
// hooks/useWeb3Auth.ts
import { useState, useCallback } from 'react';
import { account, functions } from '../lib/appwrite';

interface UseWeb3AuthReturn {
  user: any | null;
  loading: boolean;
  error: string | null;
  login: (email: string) => Promise<void>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
}

export function useWeb3Auth(): UseWeb3AuthReturn {
  const [user, setUser] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const login = useCallback(async (email: string) => {
    setLoading(true);
    setError(null);

    try {
      // Validate email
      if (!email || !email.includes('@')) {
        throw new Error('Valid email is required');
      }

      // Check MetaMask
      if (!window.ethereum) {
        throw new Error('MetaMask not installed. Please install MetaMask browser extension.');
      }

      // Connect wallet
      const accounts = await window.ethereum.request({ 
        method: 'eth_requestAccounts' 
      });

      if (!accounts || accounts.length === 0) {
        throw new Error('No wallet account selected');
      }

      const address = accounts[0];

      // Generate authentication message
      const timestamp = Date.now();
      const message = `auth-${timestamp}`;
      const fullMessage = `Sign this message to authenticate: ${message}`;

      // Request signature
      const signature = await window.ethereum.request({
        method: 'personal_sign',
        params: [fullMessage, address]
      });

      // Call Appwrite Function
      const execution = await functions.createExecution(
        process.env.REACT_APP_FUNCTION_ID!,
        JSON.stringify({ email, address, signature, message }),
        false
      );

      // Parse response
      const response = JSON.parse(execution.responseBody);

      if (execution.responseStatusCode !== 200) {
        throw new Error(response.error || 'Authentication failed');
      }

      // Create Appwrite session
      await account.createSession({
        userId: response.userId,
        secret: response.secret
      });

      // Get user data
      const userData = await account.get();
      setUser(userData);

    } catch (err: any) {
      const errorMessage = err.message || 'Authentication failed';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await account.deleteSession('current');
      setUser(null);
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  }, []);

  return {
    user,
    loading,
    error,
    login,
    logout,
    isAuthenticated: !!user
  };
}
```

### Usage Example

```tsx
// components/Login.tsx
import { useState } from 'react';
import { useWeb3Auth } from '../hooks/useWeb3Auth';

export function Login() {
  const [email, setEmail] = useState('');
  const { login, loading, error } = useWeb3Auth();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await login(email);
      // Redirect or update UI
    } catch (err) {
      console.error('Login failed:', err);
    }
  };

  return (
    <form onSubmit={handleLogin}>
      <input
        type="email"
        value={email}
        onChange={e => setEmail(e.target.value)}
        placeholder="Enter your email"
        required
      />
      <button type="submit" disabled={loading}>
        {loading ? 'Connecting...' : 'Connect Wallet'}
      </button>
      {error && <div className="error">{error}</div>}
    </form>
  );
}
```

---

## 🎯 Complete Examples

### Example 1: Simple Login Component

```tsx
// components/SimpleLogin.tsx
import { useState } from 'react';
import { Client, Account, Functions } from 'appwrite';

export function SimpleLogin() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async () => {
    setLoading(true);
    setError('');

    try {
      // Initialize Appwrite
      const client = new Client()
        .setEndpoint(process.env.REACT_APP_APPWRITE_ENDPOINT!)
        .setProject(process.env.REACT_APP_APPWRITE_PROJECT!);

      const account = new Account(client);
      const functions = new Functions(client);

      // Check MetaMask
      if (!window.ethereum) {
        throw new Error('MetaMask not installed');
      }

      // Connect wallet and sign
      const accounts = await window.ethereum.request({ 
        method: 'eth_requestAccounts' 
      });
      const address = accounts[0];

      const timestamp = Date.now();
      const message = `auth-${timestamp}`;
      const fullMessage = `Sign this message to authenticate: ${message}`;

      const signature = await window.ethereum.request({
        method: 'personal_sign',
        params: [fullMessage, address]
      });

      // Authenticate with function
      const execution = await functions.createExecution(
        process.env.REACT_APP_FUNCTION_ID!,
        JSON.stringify({ email, address, signature, message }),
        false
      );

      const response = JSON.parse(execution.responseBody);

      if (execution.responseStatusCode !== 200) {
        throw new Error(response.error);
      }

      // Create session
      await account.createSession({
        userId: response.userId,
        secret: response.secret
      });

      // Success!
      alert('Logged in successfully!');

    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2>Web3 Login</h2>
      <input
        type="email"
        value={email}
        onChange={e => setEmail(e.target.value)}
        placeholder="your@email.com"
      />
      <button onClick={handleLogin} disabled={loading || !email}>
        {loading ? 'Authenticating...' : 'Connect Wallet'}
      </button>
      {error && <p style={{ color: 'red' }}>{error}</p>}
    </div>
  );
}
```

### Example 2: Login with Loading States

```tsx
// components/LoginWithStates.tsx
import { useState } from 'react';
import { useWeb3Auth } from '../hooks/useWeb3Auth';

type LoadingState = 'idle' | 'connecting' | 'signing' | 'authenticating';

export function LoginWithStates() {
  const [email, setEmail] = useState('');
  const [loadingState, setLoadingState] = useState<LoadingState>('idle');
  const { login, error } = useWeb3Auth();

  const handleLogin = async () => {
    try {
      setLoadingState('connecting');
      await new Promise(resolve => setTimeout(resolve, 500)); // Visual feedback

      setLoadingState('signing');
      await login(email);

      setLoadingState('authenticating');
      // Login complete

      setLoadingState('idle');
    } catch (err) {
      setLoadingState('idle');
    }
  };

  const getButtonText = () => {
    switch (loadingState) {
      case 'connecting': return '🔗 Connecting to wallet...';
      case 'signing': return '✍️ Please sign the message...';
      case 'authenticating': return '🔐 Authenticating...';
      default: return '🔐 Connect & Sign';
    }
  };

  return (
    <div className="login-container">
      <h2>Web3 Authentication</h2>
      
      <input
        type="email"
        value={email}
        onChange={e => setEmail(e.target.value)}
        placeholder="Enter your email"
        disabled={loadingState !== 'idle'}
      />

      <button
        onClick={handleLogin}
        disabled={!email || loadingState !== 'idle'}
      >
        {getButtonText()}
      </button>

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      {loadingState !== 'idle' && (
        <div className="loading-indicator">
          <div className="spinner" />
        </div>
      )}
    </div>
  );
}
```

### Example 3: Dashboard with Auth Check

```tsx
// components/Dashboard.tsx
import { useEffect, useState } from 'react';
import { account } from '../lib/appwrite';
import { Login } from './Login';

export function Dashboard() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const userData = await account.get();
      setUser(userData);
    } catch (err) {
      // Not authenticated
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await account.deleteSession('current');
      setUser(null);
    } catch (err) {
      console.error('Logout failed:', err);
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!user) {
    return <Login />;
  }

  return (
    <div>
      <h1>Dashboard</h1>
      <p>Welcome, {user.email}!</p>
      <p>Wallet: {user.prefs?.walletEth}</p>
      <button onClick={handleLogout}>Logout</button>
    </div>
  );
}
```

---

## 🌐 Context API Integration

### Auth Context

```tsx
// contexts/AuthContext.tsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import { account, functions } from '../lib/appwrite';

interface AuthContextType {
  user: any | null;
  loading: boolean;
  login: (email: string) => Promise<void>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const userData = await account.get();
      setUser(userData);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string) => {
    // Check MetaMask
    if (!window.ethereum) {
      throw new Error('MetaMask not installed');
    }

    // Connect wallet
    const accounts = await window.ethereum.request({ 
      method: 'eth_requestAccounts' 
    });
    const address = accounts[0];

    // Generate and sign message
    const timestamp = Date.now();
    const message = `auth-${timestamp}`;
    const fullMessage = `Sign this message to authenticate: ${message}`;

    const signature = await window.ethereum.request({
      method: 'personal_sign',
      params: [fullMessage, address]
    });

    // Call function
    const execution = await functions.createExecution(
      process.env.REACT_APP_FUNCTION_ID!,
      JSON.stringify({ email, address, signature, message }),
      false
    );

    const response = JSON.parse(execution.responseBody);

    if (execution.responseStatusCode !== 200) {
      throw new Error(response.error);
    }

    // Create session
    await account.createSession({
      userId: response.userId,
      secret: response.secret
    });

    // Update user
    const userData = await account.get();
    setUser(userData);
  };

  const logout = async () => {
    await account.deleteSession('current');
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        logout,
        isAuthenticated: !!user
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
```

### Usage with Context

```tsx
// App.tsx
import { AuthProvider } from './contexts/AuthContext';
import { Dashboard } from './components/Dashboard';

function App() {
  return (
    <AuthProvider>
      <Dashboard />
    </AuthProvider>
  );
}
```

```tsx
// components/AnyComponent.tsx
import { useAuth } from '../contexts/AuthContext';

export function AnyComponent() {
  const { user, login, logout, isAuthenticated } = useAuth();

  return (
    <div>
      {isAuthenticated ? (
        <>
          <p>Logged in as: {user.email}</p>
          <button onClick={logout}>Logout</button>
        </>
      ) : (
        <button onClick={() => login('user@example.com')}>
          Login
        </button>
      )}
    </div>
  );
}
```

---

## ⚠️ Error Handling

### Comprehensive Error Handling

```typescript
// utils/errorHandler.ts
export function handleWeb3Error(error: any): string {
  // User rejected signature
  if (error.code === 4001 || error.message.includes('User rejected')) {
    return 'You rejected the signature request. Please try again.';
  }

  // MetaMask not installed
  if (error.message.includes('MetaMask not installed')) {
    return 'MetaMask is not installed. Please install MetaMask to continue.';
  }

  // Email bound to different wallet
  if (error.message.includes('different wallet')) {
    return 'This email is already registered with a different wallet address.';
  }

  // Passkey conflict
  if (error.message.includes('passkey')) {
    return 'This account uses passkey authentication. Please sign in with your passkey first.';
  }

  // Invalid signature
  if (error.message.includes('Invalid signature')) {
    return 'Signature verification failed. Please try again.';
  }

  // Network errors
  if (error.message.includes('network') || error.message.includes('timeout')) {
    return 'Network error. Please check your connection and try again.';
  }

  // Default
  return error.message || 'Authentication failed. Please try again.';
}
```

### Usage in Component

```tsx
import { handleWeb3Error } from '../utils/errorHandler';

const handleLogin = async () => {
  try {
    await login(email);
  } catch (error) {
    const friendlyMessage = handleWeb3Error(error);
    setError(friendlyMessage);
  }
};
```

---

## 📘 TypeScript Support

### Complete Type Definitions

```typescript
// types/appwrite.d.ts
import 'appwrite';

declare module 'appwrite' {
  interface UserPrefs {
    walletEth?: string;
    passkey_credentials?: any;
  }

  interface Models.User<Preferences extends Models.Preferences> {
    prefs: Preferences & UserPrefs;
  }
}
```

### Type-Safe Hook

```typescript
// hooks/useWeb3Auth.ts
import { Models } from 'appwrite';

interface Web3User extends Models.User<Models.Preferences> {
  prefs: {
    walletEth?: string;
  };
}

export function useWeb3Auth() {
  const [user, setUser] = useState<Web3User | null>(null);
  
  // ... rest of the hook
  
  return {
    user,
    // ... other returns
  } as const;
}
```

---

## ✅ Best Practices

### 1. Environment Variable Validation

```typescript
// lib/config.ts
const requiredEnvVars = [
  'REACT_APP_APPWRITE_ENDPOINT',
  'REACT_APP_APPWRITE_PROJECT',
  'REACT_APP_FUNCTION_ID'
] as const;

export function validateConfig() {
  const missing = requiredEnvVars.filter(
    varName => !process.env[varName]
  );

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}`
    );
  }
}

// Call at app startup
validateConfig();
```

### 2. Wallet Change Detection

```typescript
// hooks/useWalletListener.ts
import { useEffect } from 'react';

export function useWalletListener(onAccountChange: (account: string) => void) {
  useEffect(() => {
    if (!window.ethereum) return;

    const handleAccountsChanged = (accounts: string[]) => {
      if (accounts.length > 0) {
        onAccountChange(accounts[0]);
      }
    };

    window.ethereum.on('accountsChanged', handleAccountsChanged);

    return () => {
      window.ethereum?.removeListener('accountsChanged', handleAccountsChanged);
    };
  }, [onAccountChange]);
}
```

### 3. Loading States

```typescript
type AuthState = 
  | { status: 'idle' }
  | { status: 'connecting' }
  | { status: 'signing' }
  | { status: 'authenticating' }
  | { status: 'success'; user: any }
  | { status: 'error'; error: string };

const [authState, setAuthState] = useState<AuthState>({ status: 'idle' });
```

### 4. Retry Logic

```typescript
async function authenticateWithRetry(email: string, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await authenticateWithWallet(email);
    } catch (error: any) {
      if (i === maxRetries - 1) throw error;
      if (error.message.includes('User rejected')) throw error;
      
      // Wait before retry
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
    }
  }
}
```

---

## 🔧 Troubleshooting

### Common Issues

#### 1. "MetaMask not detected"

```typescript
// Check if MetaMask is installed
if (typeof window.ethereum === 'undefined') {
  window.open('https://metamask.io/download/', '_blank');
  throw new Error('Please install MetaMask');
}
```

#### 2. "User rejected the request"

```typescript
// This is user action, just show a friendly message
setError('Signature was cancelled. Please try again when ready.');
```

#### 3. "Function execution failed"

```typescript
// Check function ID and deployment
console.log('Function ID:', process.env.REACT_APP_FUNCTION_ID);
// Verify in Appwrite Console that function is deployed and active
```

#### 4. "Network error"

```typescript
// Add retry logic and better error messages
try {
  await authenticateWithWallet(email);
} catch (error) {
  if (error.message.includes('network')) {
    setError('Network error. Please check your internet connection.');
  }
}
```

---

## 🎨 Styling Examples

### Material-UI Example

```tsx
import { Button, TextField, CircularProgress, Alert } from '@mui/material';
import { useWeb3Auth } from '../hooks/useWeb3Auth';

export function MaterialLogin() {
  const [email, setEmail] = useState('');
  const { login, loading, error } = useWeb3Auth();

  return (
    <Box sx={{ maxWidth: 400, mx: 'auto', mt: 4 }}>
      <Typography variant="h4" gutterBottom>
        Web3 Login
      </Typography>
      
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <TextField
        fullWidth
        type="email"
        label="Email"
        value={email}
        onChange={e => setEmail(e.target.value)}
        disabled={loading}
        sx={{ mb: 2 }}
      />

      <Button
        fullWidth
        variant="contained"
        onClick={() => login(email)}
        disabled={loading || !email}
        startIcon={loading && <CircularProgress size={20} />}
      >
        {loading ? 'Authenticating...' : 'Connect Wallet'}
      </Button>
    </Box>
  );
}
```

---

## 📚 Additional Resources

- [Appwrite Functions Documentation](https://appwrite.io/docs/products/functions)
- [MetaMask Documentation](https://docs.metamask.io/)
- [Web3 Best Practices](https://ethereum.org/en/developers/docs/apis/javascript/)

---

**Status**: ✅ Production Ready  
**Last Updated**: October 2, 2024  
**Function Version**: 1.0.0
