# 🚀 Web3 Authentication for Next.js - Complete Guide

A comprehensive guide for integrating Web3 wallet authentication (MetaMask, WalletConnect) into Next.js applications using the Appwrite Function.

---

## 📋 Table of Contents

1. [Quick Start](#quick-start)
2. [Setup & Installation](#setup--installation)
3. [App Router (Next.js 13+)](#app-router-nextjs-13)
4. [Pages Router (Next.js 12 and below)](#pages-router-nextjs-12-and-below)
5. [Server Components & Server Actions](#server-components--server-actions)
6. [API Routes Integration](#api-routes-integration)
7. [Middleware & Route Protection](#middleware--route-protection)
8. [State Management](#state-management)
9. [Advanced Patterns](#advanced-patterns)
10. [TypeScript Support](#typescript-support)
11. [Best Practices](#best-practices)
12. [Troubleshooting](#troubleshooting)

---

## 🚀 Quick Start

### 30-Second Integration

```tsx
// app/login/page.tsx (App Router)
'use client';

import { Client, Account, Functions } from 'appwrite';
import { useState } from 'react';

export default function LoginPage() {
  const [email, setEmail] = useState('');

  const handleLogin = async () => {
    // 1. Initialize Appwrite
    const client = new Client()
      .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
      .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT!);
    
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
      process.env.NEXT_PUBLIC_FUNCTION_ID!,
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

Create `.env.local` in your Next.js project root:

```env
# Appwrite Configuration
NEXT_PUBLIC_APPWRITE_ENDPOINT=https://cloud.appwrite.io/v1
NEXT_PUBLIC_APPWRITE_PROJECT=your-project-id
NEXT_PUBLIC_FUNCTION_ID=your-web3-auth-function-id

# Optional: For server-side operations
APPWRITE_API_KEY=your-api-key-with-users-permissions
```

> **Note**: Use `NEXT_PUBLIC_` prefix for client-side variables. Never expose your API key on the client side!

### 3. TypeScript Configuration (Optional)

```typescript
// types/web3.d.ts
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
      on?: (event: string, handler: (...args: any[]) => void) => void;
      removeListener?: (event: string, handler: (...args: any[]) => void) => void;
    };
  }
}

export {};
```

### 4. Appwrite Client Configuration

Create a shared Appwrite client:

```typescript
// lib/appwrite.ts
import { Client, Account, Functions } from 'appwrite';

const client = new Client()
  .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
  .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT!);

export const account = new Account(client);
export const functions = new Functions(client);
export { client };
```

---

## 🎯 App Router (Next.js 13+)

### Client Component Authentication

```tsx
// app/components/WalletLogin.tsx
'use client';

import { useState } from 'react';
import { account, functions } from '@/lib/appwrite';
import { useRouter } from 'next/navigation';

export default function WalletLogin() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Check MetaMask
      if (!window.ethereum) {
        throw new Error('MetaMask not installed. Please install MetaMask.');
      }

      // Connect wallet
      const accounts = await window.ethereum.request({ 
        method: 'eth_requestAccounts' 
      });
      const address = accounts[0];

      // Generate message
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
        process.env.NEXT_PUBLIC_FUNCTION_ID!,
        JSON.stringify({ email, address, signature, message }),
        false
      );

      const response = JSON.parse(execution.responseBody);

      if (execution.responseStatusCode !== 200) {
        throw new Error(response.error || 'Authentication failed');
      }

      // Create session
      await account.createSession({
        userId: response.userId,
        secret: response.secret
      });

      // Redirect to dashboard
      router.push('/dashboard');
      router.refresh(); // Refresh server components

    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleLogin} className="space-y-4">
      <div>
        <label htmlFor="email" className="block text-sm font-medium">
          Email Address
        </label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
          placeholder="your@email.com"
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? 'Connecting...' : 'Connect Wallet & Sign In'}
      </button>

      {error && (
        <div className="text-red-600 text-sm mt-2">
          {error}
        </div>
      )}
    </form>
  );
}
```

### Login Page

```tsx
// app/login/page.tsx
import WalletLogin from '@/app/components/WalletLogin';

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-lg shadow-md">
        <div>
          <h2 className="text-center text-3xl font-extrabold text-gray-900">
            Sign in with Web3
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Connect your MetaMask wallet to continue
          </p>
        </div>
        <WalletLogin />
      </div>
    </div>
  );
}
```

### Protected Dashboard with Server Component

```tsx
// app/dashboard/page.tsx
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { Client, Account } from 'node-appwrite';
import LogoutButton from '@/app/components/LogoutButton';

async function getUser() {
  try {
    const cookieStore = cookies();
    const session = cookieStore.get('a_session_' + process.env.NEXT_PUBLIC_APPWRITE_PROJECT);

    if (!session) {
      return null;
    }

    // Create server-side client with session
    const client = new Client()
      .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
      .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT!)
      .setSession(session.value);

    const account = new Account(client);
    return await account.get();
  } catch {
    return null;
  }
}

export default async function DashboardPage() {
  const user = await getUser();

  if (!user) {
    redirect('/login');
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-md p-8">
          <h1 className="text-3xl font-bold mb-4">Dashboard</h1>
          
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-600">Email</label>
              <p className="text-lg">{user.email}</p>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-600">User ID</label>
              <p className="text-lg font-mono text-sm">{user.$id}</p>
            </div>

            {user.prefs?.walletEth && (
              <div>
                <label className="text-sm font-medium text-gray-600">Wallet Address</label>
                <p className="text-lg font-mono text-sm">{user.prefs.walletEth}</p>
              </div>
            )}

            <div className="pt-4">
              <LogoutButton />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
```

### Logout Component

```tsx
// app/components/LogoutButton.tsx
'use client';

import { account } from '@/lib/appwrite';
import { useRouter } from 'next/navigation';

export default function LogoutButton() {
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await account.deleteSession('current');
      router.push('/login');
      router.refresh();
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  return (
    <button
      onClick={handleLogout}
      className="bg-red-600 text-white py-2 px-4 rounded-md hover:bg-red-700"
    >
      Logout
    </button>
  );
}
```

### Custom Hook for Authentication

```tsx
// hooks/useWeb3Auth.ts
'use client';

import { useState, useCallback } from 'react';
import { account, functions } from '@/lib/appwrite';

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
      if (!email || !email.includes('@')) {
        throw new Error('Valid email is required');
      }

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
        process.env.NEXT_PUBLIC_FUNCTION_ID!,
        JSON.stringify({ email, address, signature, message }),
        false
      );

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

---

## 📄 Pages Router (Next.js 12 and below)

### Login Page

```tsx
// pages/login.tsx
import { useState } from 'react';
import { useRouter } from 'next/router';
import { account, functions } from '@/lib/appwrite';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (!window.ethereum) {
        throw new Error('MetaMask not installed');
      }

      // Connect wallet
      const accounts = await window.ethereum.request({ 
        method: 'eth_requestAccounts' 
      });
      const address = accounts[0];

      // Sign message
      const timestamp = Date.now();
      const message = `auth-${timestamp}`;
      const fullMessage = `Sign this message to authenticate: ${message}`;

      const signature = await window.ethereum.request({
        method: 'personal_sign',
        params: [fullMessage, address]
      });

      // Call function
      const execution = await functions.createExecution(
        process.env.NEXT_PUBLIC_FUNCTION_ID!,
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

      router.push('/dashboard');

    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="max-w-md w-full">
        <h1 className="text-3xl font-bold mb-8 text-center">Sign in with Web3</h1>
        
        <form onSubmit={handleLogin} className="space-y-4">
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="your@email.com"
            required
            className="w-full px-4 py-2 border rounded-md"
          />

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md"
          >
            {loading ? 'Connecting...' : 'Connect Wallet'}
          </button>

          {error && <p className="text-red-600 text-sm">{error}</p>}
        </form>
      </div>
    </div>
  );
}
```

### Protected Dashboard

```tsx
// pages/dashboard.tsx
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { account } from '@/lib/appwrite';

export default function DashboardPage() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const userData = await account.get();
      setUser(userData);
    } catch {
      router.push('/login');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await account.deleteSession('current');
      router.push('/login');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-4">Dashboard</h1>
        
        <div className="bg-white rounded-lg shadow p-6 space-y-4">
          <div>
            <label className="font-medium">Email:</label>
            <p>{user.email}</p>
          </div>

          {user.prefs?.walletEth && (
            <div>
              <label className="font-medium">Wallet:</label>
              <p className="font-mono text-sm">{user.prefs.walletEth}</p>
            </div>
          )}

          <button
            onClick={handleLogout}
            className="bg-red-600 text-white py-2 px-4 rounded-md"
          >
            Logout
          </button>
        </div>
      </div>
    </div>
  );
}
```

### HOC for Route Protection

```tsx
// lib/withAuth.tsx
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { account } from './appwrite';

export function withAuth<P extends object>(
  Component: React.ComponentType<P>
) {
  return function AuthenticatedComponent(props: P) {
    const [authenticated, setAuthenticated] = useState(false);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
      checkAuth();
    }, []);

    const checkAuth = async () => {
      try {
        await account.get();
        setAuthenticated(true);
      } catch {
        router.push('/login');
      } finally {
        setLoading(false);
      }
    };

    if (loading) {
      return <div>Loading...</div>;
    }

    if (!authenticated) {
      return null;
    }

    return <Component {...props} />;
  };
}

// Usage
// export default withAuth(DashboardPage);
```

---

## 🔐 Server Components & Server Actions

### Server Action for Authentication Check

```tsx
// app/actions/auth.ts
'use server';

import { cookies } from 'next/headers';
import { Client, Account } from 'node-appwrite';

export async function getServerUser() {
  try {
    const cookieStore = cookies();
    const session = cookieStore.get('a_session_' + process.env.NEXT_PUBLIC_APPWRITE_PROJECT);

    if (!session) {
      return null;
    }

    const client = new Client()
      .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
      .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT!)
      .setSession(session.value);

    const account = new Account(client);
    return await account.get();
  } catch {
    return null;
  }
}

export async function serverLogout() {
  try {
    const cookieStore = cookies();
    const session = cookieStore.get('a_session_' + process.env.NEXT_PUBLIC_APPWRITE_PROJECT);

    if (session) {
      const client = new Client()
        .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
        .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT!)
        .setSession(session.value);

      const account = new Account(client);
      await account.deleteSession('current');
    }

    return { success: true };
  } catch (error) {
    return { success: false, error: 'Logout failed' };
  }
}
```

### Using Server Actions in Components

```tsx
// app/components/UserProfile.tsx
import { getServerUser } from '@/app/actions/auth';

export default async function UserProfile() {
  const user = await getServerUser();

  if (!user) {
    return <div>Please login</div>;
  }

  return (
    <div className="p-4 border rounded-lg">
      <h2 className="text-xl font-bold mb-2">Profile</h2>
      <p><strong>Email:</strong> {user.email}</p>
      <p><strong>ID:</strong> {user.$id}</p>
      {user.prefs?.walletEth && (
        <p><strong>Wallet:</strong> {user.prefs.walletEth}</p>
      )}
    </div>
  );
}
```

---

## 🛣️ API Routes Integration

### Authentication API Route (for custom flows)

```typescript
// pages/api/auth/wallet.ts (Pages Router)
// or app/api/auth/wallet/route.ts (App Router)

import { NextRequest, NextResponse } from 'next/server';
import { Client, Functions } from 'node-appwrite';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, address, signature, message } = body;

    if (!email || !address || !signature || !message) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Call Appwrite Function from server-side
    const client = new Client()
      .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
      .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT!);

    const functions = new Functions(client);

    const execution = await functions.createExecution(
      process.env.NEXT_PUBLIC_FUNCTION_ID!,
      JSON.stringify({ email, address, signature, message }),
      false
    );

    const response = JSON.parse(execution.responseBody);

    if (execution.responseStatusCode !== 200) {
      return NextResponse.json(
        { error: response.error || 'Authentication failed' },
        { status: execution.responseStatusCode }
      );
    }

    return NextResponse.json(response);

  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
```

### User Info API Route

```typescript
// app/api/user/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { Client, Account } from 'node-appwrite';

export async function GET(request: NextRequest) {
  try {
    const cookieStore = cookies();
    const session = cookieStore.get('a_session_' + process.env.NEXT_PUBLIC_APPWRITE_PROJECT);

    if (!session) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const client = new Client()
      .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
      .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT!)
      .setSession(session.value);

    const account = new Account(client);
    const user = await account.get();

    return NextResponse.json(user);

  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to get user' },
      { status: 500 }
    );
  }
}
```

---

## 🛡️ Middleware & Route Protection

### Authentication Middleware

```typescript
// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const session = request.cookies.get('a_session_' + process.env.NEXT_PUBLIC_APPWRITE_PROJECT);

  // Protected routes
  const protectedRoutes = ['/dashboard', '/profile', '/settings'];
  const isProtectedRoute = protectedRoutes.some(route => 
    request.nextUrl.pathname.startsWith(route)
  );

  // Redirect to login if not authenticated
  if (isProtectedRoute && !session) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Redirect to dashboard if authenticated and trying to access login
  if (request.nextUrl.pathname === '/login' && session) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/profile/:path*', '/settings/:path*', '/login'],
};
```

### Advanced Middleware with User Validation

```typescript
// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { Client, Account } from 'node-appwrite';

async function validateSession(sessionToken: string) {
  try {
    const client = new Client()
      .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
      .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT!)
      .setSession(sessionToken);

    const account = new Account(client);
    await account.get();
    return true;
  } catch {
    return false;
  }
}

export async function middleware(request: NextRequest) {
  const session = request.cookies.get('a_session_' + process.env.NEXT_PUBLIC_APPWRITE_PROJECT);

  const protectedRoutes = ['/dashboard', '/profile'];
  const isProtectedRoute = protectedRoutes.some(route => 
    request.nextUrl.pathname.startsWith(route)
  );

  if (isProtectedRoute) {
    if (!session) {
      return NextResponse.redirect(new URL('/login', request.url));
    }

    // Validate session server-side
    const isValid = await validateSession(session.value);
    if (!isValid) {
      const response = NextResponse.redirect(new URL('/login', request.url));
      // Clear invalid session
      response.cookies.delete('a_session_' + process.env.NEXT_PUBLIC_APPWRITE_PROJECT);
      return response;
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/profile/:path*', '/login'],
};
```

---

## 🔄 State Management

### Context API Pattern

```tsx
// contexts/AuthContext.tsx
'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { account, functions } from '@/lib/appwrite';

interface AuthContextType {
  user: any | null;
  loading: boolean;
  login: (email: string) => Promise<void>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
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
    if (!window.ethereum) {
      throw new Error('MetaMask not installed');
    }

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

    const execution = await functions.createExecution(
      process.env.NEXT_PUBLIC_FUNCTION_ID!,
      JSON.stringify({ email, address, signature, message }),
      false
    );

    const response = JSON.parse(execution.responseBody);

    if (execution.responseStatusCode !== 200) {
      throw new Error(response.error);
    }

    await account.createSession({
      userId: response.userId,
      secret: response.secret
    });

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

### Root Layout with Auth Provider

```tsx
// app/layout.tsx
import { AuthProvider } from '@/contexts/AuthContext';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
```

### Using Auth Context

```tsx
// app/components/Header.tsx
'use client';

import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';

export default function Header() {
  const { user, isAuthenticated, logout } = useAuth();

  return (
    <header className="bg-white shadow">
      <nav className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
        <Link href="/" className="text-xl font-bold">
          My App
        </Link>

        <div className="flex items-center space-x-4">
          {isAuthenticated ? (
            <>
              <span className="text-gray-700">{user.email}</span>
              <button
                onClick={logout}
                className="bg-red-600 text-white px-4 py-2 rounded-md"
              >
                Logout
              </button>
            </>
          ) : (
            <Link
              href="/login"
              className="bg-blue-600 text-white px-4 py-2 rounded-md"
            >
              Login
            </Link>
          )}
        </div>
      </nav>
    </header>
  );
}
```

---

## 🎨 Advanced Patterns

### Loading States with Suspense

```tsx
// app/dashboard/page.tsx
import { Suspense } from 'react';
import { getServerUser } from '@/app/actions/auth';
import UserProfile from '@/app/components/UserProfile';

function LoadingSkeleton() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="h-4 bg-gray-200 rounded w-3/4"></div>
      <div className="h-4 bg-gray-200 rounded w-1/2"></div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <div className="container mx-auto p-8">
      <h1 className="text-3xl font-bold mb-8">Dashboard</h1>
      
      <Suspense fallback={<LoadingSkeleton />}>
        <UserProfile />
      </Suspense>
    </div>
  );
}
```

### Multi-Step Authentication Flow

```tsx
// app/components/MultiStepAuth.tsx
'use client';

import { useState } from 'react';
import { account, functions } from '@/lib/appwrite';

type Step = 'email' | 'connect' | 'sign' | 'complete';

export default function MultiStepAuth() {
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [error, setError] = useState('');

  const handleEmailSubmit = () => {
    if (email && email.includes('@')) {
      setStep('connect');
    }
  };

  const handleConnect = async () => {
    try {
      if (!window.ethereum) {
        throw new Error('MetaMask not installed');
      }

      const accounts = await window.ethereum.request({ 
        method: 'eth_requestAccounts' 
      });
      setAddress(accounts[0]);
      setStep('sign');
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleSign = async () => {
    try {
      const timestamp = Date.now();
      const message = `auth-${timestamp}`;
      const fullMessage = `Sign this message to authenticate: ${message}`;

      const signature = await window.ethereum.request({
        method: 'personal_sign',
        params: [fullMessage, address]
      });

      const execution = await functions.createExecution(
        process.env.NEXT_PUBLIC_FUNCTION_ID!,
        JSON.stringify({ email, address, signature, message }),
        false
      );

      const response = JSON.parse(execution.responseBody);

      if (execution.responseStatusCode !== 200) {
        throw new Error(response.error);
      }

      await account.createSession({
        userId: response.userId,
        secret: response.secret
      });

      setStep('complete');
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="max-w-md mx-auto p-8 bg-white rounded-lg shadow-md">
      {/* Progress bar */}
      <div className="mb-8">
        <div className="flex justify-between mb-2">
          <span className={step === 'email' ? 'font-bold' : ''}>Email</span>
          <span className={step === 'connect' ? 'font-bold' : ''}>Connect</span>
          <span className={step === 'sign' ? 'font-bold' : ''}>Sign</span>
          <span className={step === 'complete' ? 'font-bold' : ''}>Done</span>
        </div>
        <div className="h-2 bg-gray-200 rounded-full">
          <div 
            className="h-2 bg-blue-600 rounded-full transition-all"
            style={{ 
              width: step === 'email' ? '25%' : 
                     step === 'connect' ? '50%' : 
                     step === 'sign' ? '75%' : '100%' 
            }}
          />
        </div>
      </div>

      {/* Step content */}
      {step === 'email' && (
        <div>
          <h2 className="text-2xl font-bold mb-4">Enter your email</h2>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="your@email.com"
            className="w-full px-4 py-2 border rounded-md mb-4"
          />
          <button
            onClick={handleEmailSubmit}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md"
          >
            Continue
          </button>
        </div>
      )}

      {step === 'connect' && (
        <div>
          <h2 className="text-2xl font-bold mb-4">Connect wallet</h2>
          <p className="mb-4 text-gray-600">
            Click below to connect your MetaMask wallet
          </p>
          <button
            onClick={handleConnect}
            className="w-full bg-orange-600 text-white py-2 px-4 rounded-md"
          >
            Connect MetaMask
          </button>
        </div>
      )}

      {step === 'sign' && (
        <div>
          <h2 className="text-2xl font-bold mb-4">Sign message</h2>
          <p className="mb-4 text-gray-600">
            Please sign the message in your wallet to prove ownership
          </p>
          <button
            onClick={handleSign}
            className="w-full bg-green-600 text-white py-2 px-4 rounded-md"
          >
            Sign & Authenticate
          </button>
        </div>
      )}

      {step === 'complete' && (
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4 text-green-600">
            ✓ Success!
          </h2>
          <p className="mb-4">You are now authenticated</p>
          <a
            href="/dashboard"
            className="inline-block bg-blue-600 text-white py-2 px-4 rounded-md"
          >
            Go to Dashboard
          </a>
        </div>
      )}

      {error && (
        <div className="mt-4 p-3 bg-red-100 text-red-700 rounded-md">
          {error}
        </div>
      )}
    </div>
  );
}
```

### Wallet Change Detection

```tsx
// hooks/useWalletListener.ts
'use client';

import { useEffect } from 'react';
import { account } from '@/lib/appwrite';

export function useWalletListener() {
  useEffect(() => {
    if (!window.ethereum) return;

    const handleAccountsChanged = async (accounts: string[]) => {
      if (accounts.length === 0) {
        // User disconnected wallet
        console.log('Wallet disconnected');
        try {
          await account.deleteSession('current');
          window.location.href = '/login';
        } catch (error) {
          console.error('Failed to logout:', error);
        }
      } else {
        // User switched accounts
        console.log('Account switched to:', accounts[0]);
        // Optionally show warning or logout
      }
    };

    const handleChainChanged = (chainId: string) => {
      console.log('Chain changed to:', chainId);
      // Optionally reload or show warning
    };

    window.ethereum.on?.('accountsChanged', handleAccountsChanged);
    window.ethereum.on?.('chainChanged', handleChainChanged);

    return () => {
      window.ethereum.removeListener?.('accountsChanged', handleAccountsChanged);
      window.ethereum.removeListener?.('chainChanged', handleChainChanged);
    };
  }, []);
}
```

### Automatic Session Refresh

```tsx
// hooks/useSessionRefresh.ts
'use client';

import { useEffect } from 'react';
import { account } from '@/lib/appwrite';

export function useSessionRefresh(interval = 5 * 60 * 1000) {
  useEffect(() => {
    const refreshSession = async () => {
      try {
        // Check if session is still valid
        await account.get();
      } catch (error) {
        // Session expired, redirect to login
        window.location.href = '/login';
      }
    };

    // Check immediately
    refreshSession();

    // Check periodically
    const timer = setInterval(refreshSession, interval);

    return () => clearInterval(timer);
  }, [interval]);
}
```

---

## 📘 TypeScript Support

### Complete Type Definitions

```typescript
// types/appwrite.d.ts
import 'appwrite';

declare module 'appwrite' {
  namespace Models {
    interface Preferences {
      walletEth?: string;
      passkey_credentials?: any;
      [key: string]: any;
    }

    interface User<Preferences extends Models.Preferences> {
      $id: string;
      $createdAt: string;
      $updatedAt: string;
      name: string;
      password?: string;
      hash?: string;
      hashOptions?: object;
      registration: string;
      status: boolean;
      labels: string[];
      passwordUpdate: string;
      email: string;
      phone: string;
      emailVerification: boolean;
      phoneVerification: boolean;
      mfa: boolean;
      prefs: Preferences;
      targets: Models.Target[];
      accessedAt: string;
    }
  }
}

export interface Web3User extends Models.User<Models.Preferences> {
  prefs: {
    walletEth?: string;
    passkey_credentials?: any;
  };
}

export {};
```

### Type-Safe Hook

```typescript
// hooks/useTypedWeb3Auth.ts
import { useState, useCallback } from 'react';
import { account, functions } from '@/lib/appwrite';
import type { Web3User } from '@/types/appwrite';

interface AuthError {
  code: string;
  message: string;
}

interface UseWeb3AuthReturn {
  user: Web3User | null;
  loading: boolean;
  error: AuthError | null;
  login: (email: string) => Promise<Web3User>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
}

export function useTypedWeb3Auth(): UseWeb3AuthReturn {
  const [user, setUser] = useState<Web3User | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<AuthError | null>(null);

  const login = useCallback(async (email: string): Promise<Web3User> => {
    setLoading(true);
    setError(null);

    try {
      // ... authentication logic

      const userData = await account.get() as Web3User;
      setUser(userData);
      return userData;

    } catch (err: any) {
      const authError: AuthError = {
        code: err.code || 'UNKNOWN',
        message: err.message || 'Authentication failed'
      };
      setError(authError);
      throw authError;
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await account.deleteSession('current');
      setUser(null);
    } catch (err: any) {
      const authError: AuthError = {
        code: err.code || 'UNKNOWN',
        message: err.message || 'Logout failed'
      };
      setError(authError);
      throw authError;
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

---

## ✅ Best Practices

### 1. Environment Variable Validation

```typescript
// lib/config.ts
function validateEnv() {
  const required = [
    'NEXT_PUBLIC_APPWRITE_ENDPOINT',
    'NEXT_PUBLIC_APPWRITE_PROJECT',
    'NEXT_PUBLIC_FUNCTION_ID'
  ];

  const missing = required.filter(key => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}\n` +
      `Please check your .env.local file`
    );
  }
}

// Call at app startup
if (typeof window === 'undefined') {
  validateEnv();
}

export const config = {
  appwrite: {
    endpoint: process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!,
    project: process.env.NEXT_PUBLIC_APPWRITE_PROJECT!,
    functionId: process.env.NEXT_PUBLIC_FUNCTION_ID!,
  }
};
```

### 2. Error Handling Utility

```typescript
// lib/errorHandler.ts
export class Web3AuthError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode?: number
  ) {
    super(message);
    this.name = 'Web3AuthError';
  }
}

export function handleWeb3Error(error: any): Web3AuthError {
  // MetaMask errors
  if (error.code === 4001) {
    return new Web3AuthError(
      'You rejected the signature request',
      'USER_REJECTED',
      400
    );
  }

  // Appwrite errors
  if (error.code === 401) {
    return new Web3AuthError(
      'Invalid signature',
      'INVALID_SIGNATURE',
      401
    );
  }

  if (error.message?.includes('different wallet')) {
    return new Web3AuthError(
      'This email is already registered with a different wallet',
      'WALLET_MISMATCH',
      403
    );
  }

  if (error.message?.includes('passkey')) {
    return new Web3AuthError(
      'Please sign in with your passkey first',
      'PASSKEY_REQUIRED',
      403
    );
  }

  // Default
  return new Web3AuthError(
    error.message || 'Authentication failed',
    'UNKNOWN_ERROR',
    500
  );
}
```

### 3. Secure Session Management

```typescript
// lib/session.ts
import { account } from './appwrite';

export async function getSession() {
  try {
    return await account.getSession('current');
  } catch {
    return null;
  }
}

export async function validateSession(): Promise<boolean> {
  try {
    await account.get();
    return true;
  } catch {
    return false;
  }
}

export async function clearSession() {
  try {
    await account.deleteSession('current');
  } catch (error) {
    console.error('Failed to clear session:', error);
  }
}
```

### 4. MetaMask Detection

```typescript
// lib/metamask.ts
export function isMetaMaskInstalled(): boolean {
  return typeof window !== 'undefined' && typeof window.ethereum !== 'undefined';
}

export function getMetaMaskDownloadLink(): string {
  const userAgent = navigator.userAgent.toLowerCase();
  
  if (userAgent.includes('firefox')) {
    return 'https://addons.mozilla.org/en-US/firefox/addon/ether-metamask/';
  }
  
  if (userAgent.includes('chrome') || userAgent.includes('brave')) {
    return 'https://chrome.google.com/webstore/detail/metamask/nkbihfbeogaeaoehlefnkodbefgpgknn';
  }
  
  return 'https://metamask.io/download/';
}

export async function requestMetaMaskConnection() {
  if (!isMetaMaskInstalled()) {
    throw new Error('MetaMask is not installed');
  }

  try {
    const accounts = await window.ethereum.request({ 
      method: 'eth_requestAccounts' 
    });
    return accounts[0];
  } catch (error: any) {
    if (error.code === 4001) {
      throw new Error('User rejected the connection request');
    }
    throw error;
  }
}
```

### 5. Logging and Monitoring

```typescript
// lib/logger.ts
type LogLevel = 'info' | 'warn' | 'error';

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  data?: any;
}

class Logger {
  private isDevelopment = process.env.NODE_ENV === 'development';

  private log(level: LogLevel, message: string, data?: any) {
    const entry: LogEntry = {
      level,
      message,
      timestamp: new Date().toISOString(),
      data
    };

    if (this.isDevelopment) {
      console[level](entry);
    }

    // In production, send to monitoring service
    // this.sendToMonitoring(entry);
  }

  info(message: string, data?: any) {
    this.log('info', message, data);
  }

  warn(message: string, data?: any) {
    this.log('warn', message, data);
  }

  error(message: string, data?: any) {
    this.log('error', message, data);
  }
}

export const logger = new Logger();
```

---

## 🔧 Troubleshooting

### Common Issues

#### 1. "MetaMask not detected"

```typescript
// Solution: Check installation and provide download link
if (!window.ethereum) {
  const downloadLink = getMetaMaskDownloadLink();
  window.open(downloadLink, '_blank');
  throw new Error('Please install MetaMask to continue');
}
```

#### 2. "Function execution failed"

```typescript
// Verify environment variables
console.log('Function ID:', process.env.NEXT_PUBLIC_FUNCTION_ID);
console.log('Project ID:', process.env.NEXT_PUBLIC_APPWRITE_PROJECT);

// Check function deployment status in Appwrite Console
```

#### 3. "Session not persisting"

```typescript
// Ensure cookies are enabled and domain is correct
// Check Next.js config for cookie settings

// next.config.js
module.exports = {
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
        ],
      },
    ];
  },
};
```

#### 4. "CORS errors"

```typescript
// Ensure your domain is added to Appwrite project platforms
// Appwrite Console > Project > Settings > Platforms
// Add your Next.js domain (e.g., http://localhost:3000)
```

#### 5. "Wallet address mismatch"

```typescript
// Clear the existing user's wallet binding via Appwrite Console
// Or use a different email address for testing
```

### Debug Mode

```typescript
// lib/appwrite.ts
import { Client, Account, Functions } from 'appwrite';

const isDevelopment = process.env.NODE_ENV === 'development';

const client = new Client()
  .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
  .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT!);

// Enable debug mode in development
if (isDevelopment) {
  // Log all requests/responses
  const originalFetch = window.fetch;
  window.fetch = async (...args) => {
    console.log('Fetch request:', args);
    const response = await originalFetch(...args);
    console.log('Fetch response:', response);
    return response;
  };
}

export const account = new Account(client);
export const functions = new Functions(client);
export { client };
```

---

## 🎯 Production Checklist

- [ ] Environment variables configured in production
- [ ] Function deployed and active in Appwrite
- [ ] Domains added to Appwrite project platforms
- [ ] Error handling and logging implemented
- [ ] Session validation on protected routes
- [ ] MetaMask detection and user guidance
- [ ] Loading states for better UX
- [ ] TypeScript types properly defined
- [ ] Middleware configured for route protection
- [ ] HTTPS enabled (required for MetaMask)

---

## 📚 Additional Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [Appwrite Functions Documentation](https://appwrite.io/docs/products/functions)
- [MetaMask Documentation](https://docs.metamask.io/)
- [Ethers.js Documentation](https://docs.ethers.org/)

---

## 🆘 Support

- **Issues**: [GitHub Issues](https://github.com/your-repo/issues)
- **Documentation**: Check README.md and CLIENT_EXAMPLES.md
- **Community**: [Discord/Forum Link]

---

**Status**: ✅ Production Ready  
**Last Updated**: October 3, 2024  
**Next.js Compatibility**: 13.x, 14.x, 15.x  
**Function Version**: 1.0.0
