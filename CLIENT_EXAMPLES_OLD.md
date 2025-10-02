# 🔌 Client Integration Examples

Complete examples for integrating the Web3 Authentication Function into your frontend application.

## Table of Contents

1. [Vanilla JavaScript](#vanilla-javascript)
2. [React / Next.js](#react--nextjs)
3. [Vue.js](#vuejs)
4. [Svelte](#svelte)
5. [Angular](#angular)
6. [Helper Functions](#helper-functions)

---

## Vanilla JavaScript

### Complete Implementation

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Web3 Auth Example</title>
  <script src="https://cdn.jsdelivr.net/npm/appwrite@14"></script>
</head>
<body>
  <div id="app">
    <div id="login">
      <h1>Web3 Authentication</h1>
      <input type="email" id="email" placeholder="Email address" />
      <button onclick="connectWallet()">Connect Wallet</button>
      <p id="error" style="color: red;"></p>
    </div>
    <div id="dashboard" style="display: none;">
      <h1>Dashboard</h1>
      <p>Welcome, <span id="userEmail"></span>!</p>
      <button onclick="logout()">Logout</button>
    </div>
  </div>

  <script>
    // Configuration
    const APPWRITE_ENDPOINT = 'https://cloud.appwrite.io/v1';
    const APPWRITE_PROJECT = 'your-project-id';
    const FUNCTION_URL = 'https://cloud.appwrite.io/v1/functions/web3-auth/executions';
    const API_KEY = 'your-api-key'; // ⚠️ Use environment variable in production

    // Initialize Appwrite
    const client = new Appwrite.Client()
      .setEndpoint(APPWRITE_ENDPOINT)
      .setProject(APPWRITE_PROJECT);

    const account = new Appwrite.Account(client);

    // Check authentication on load
    window.addEventListener('load', async () => {
      try {
        const user = await account.get();
        showDashboard(user);
      } catch (error) {
        // Not authenticated
      }
    });

    // Connect wallet and authenticate
    async function connectWallet() {
      const errorEl = document.getElementById('error');
      errorEl.textContent = '';

      try {
        // Get email
        const email = document.getElementById('email').value;
        if (!email) {
          throw new Error('Email is required');
        }

        // Check for MetaMask
        if (!window.ethereum) {
          throw new Error('MetaMask not installed. Please install MetaMask.');
        }

        // Request wallet connection
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
        const response = await fetch(FUNCTION_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Appwrite-Project': APPWRITE_PROJECT,
            'x-appwrite-key': API_KEY
          },
          body: JSON.stringify({
            path: '/auth',
            method: 'POST',
            body: { email, address, signature, message }
          })
        });

        const data = await response.json();
        
        if (!response.ok) {
          throw new Error(data.error || 'Authentication failed');
        }

        // Extract userId and secret from response
        const { userId, secret } = data.response 
          ? JSON.parse(data.response) 
          : data;

        // Create Appwrite session
        await account.createSession({ userId, secret });

        // Refresh user info
        const user = await account.get();
        showDashboard(user);

      } catch (error) {
        errorEl.textContent = error.message;
        console.error('Authentication error:', error);
      }
    }

    // Show dashboard
    function showDashboard(user) {
      document.getElementById('login').style.display = 'none';
      document.getElementById('dashboard').style.display = 'block';
      document.getElementById('userEmail').textContent = user.email || user.name;
    }

    // Logout
    async function logout() {
      try {
        await account.deleteSession('current');
        location.reload();
      } catch (error) {
        console.error('Logout error:', error);
      }
    }
  </script>
</body>
</html>
```

---

## React / Next.js

### Hook: useWeb3Auth.ts

```typescript
import { useState, useCallback } from 'react';
import { Client, Account } from 'appwrite';

interface UseWeb3AuthReturn {
  loading: boolean;
  error: string | null;
  user: any | null;
  connectWallet: (email: string) => Promise<void>;
  logout: () => Promise<void>;
}

export function useWeb3Auth(): UseWeb3AuthReturn {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<any | null>(null);

  const client = new Client()
    .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
    .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT!);

  const account = new Account(client);

  const connectWallet = useCallback(async (email: string) => {
    setLoading(true);
    setError(null);

    try {
      if (!window.ethereum) {
        throw new Error('MetaMask not installed');
      }

      // Request wallet
      const accounts = await window.ethereum.request({ 
        method: 'eth_requestAccounts' 
      }) as string[];
      const address = accounts[0];

      // Generate message
      const timestamp = Date.now();
      const message = `auth-${timestamp}`;
      const fullMessage = `Sign this message to authenticate: ${message}`;

      // Sign message
      const signature = await window.ethereum.request({
        method: 'personal_sign',
        params: [fullMessage, address]
      }) as string;

      // Call function
      const response = await fetch(process.env.NEXT_PUBLIC_FUNCTION_URL! + '/auth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-appwrite-key': process.env.NEXT_PUBLIC_API_KEY!
        },
        body: JSON.stringify({ email, address, signature, message })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error);

      // Create session
      await account.createSession(data);

      // Get user
      const currentUser = await account.get();
      setUser(currentUser);

    } catch (err: any) {
      setError(err.message);
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
    }
  }, []);

  return { loading, error, user, connectWallet, logout };
}
```

### Component: LoginPage.tsx

```typescript
'use client';

import { useState } from 'react';
import { useWeb3Auth } from '@/hooks/useWeb3Auth';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const { loading, error, connectWallet } = useWeb3Auth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await connectWallet(email);
  };

  return (
    <div className="login-page">
      <form onSubmit={handleSubmit}>
        <h1>Web3 Authentication</h1>
        
        {error && <div className="error">{error}</div>}
        
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email address"
          required
          disabled={loading}
        />
        
        <button type="submit" disabled={loading || !email}>
          {loading ? 'Connecting...' : 'Connect Wallet'}
        </button>
      </form>
    </div>
  );
}
```

---

## Vue.js

### Composable: useWeb3Auth.ts

```typescript
import { ref, Ref } from 'vue';
import { Client, Account } from 'appwrite';

interface Web3Auth {
  loading: Ref<boolean>;
  error: Ref<string | null>;
  user: Ref<any | null>;
  connectWallet: (email: string) => Promise<void>;
  logout: () => Promise<void>;
}

export function useWeb3Auth(): Web3Auth {
  const loading = ref(false);
  const error = ref<string | null>(null);
  const user = ref<any | null>(null);

  const client = new Client()
    .setEndpoint(import.meta.env.VITE_APPWRITE_ENDPOINT)
    .setProject(import.meta.env.VITE_APPWRITE_PROJECT);

  const account = new Account(client);

  const connectWallet = async (email: string) => {
    loading.value = true;
    error.value = null;

    try {
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

      const response = await fetch(import.meta.env.VITE_FUNCTION_URL + '/auth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-appwrite-key': import.meta.env.VITE_API_KEY
        },
        body: JSON.stringify({ email, address, signature, message })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error);

      await account.createSession(data);
      user.value = await account.get();

    } catch (err: any) {
      error.value = err.message;
    } finally {
      loading.value = false;
    }
  };

  const logout = async () => {
    try {
      await account.deleteSession('current');
      user.value = null;
    } catch (err: any) {
      error.value = err.message;
    }
  };

  return { loading, error, user, connectWallet, logout };
}
```

### Component: LoginPage.vue

```vue
<template>
  <div class="login-page">
    <form @submit.prevent="handleSubmit">
      <h1>Web3 Authentication</h1>
      
      <div v-if="error" class="error">{{ error }}</div>
      
      <input
        v-model="email"
        type="email"
        placeholder="Email address"
        required
        :disabled="loading"
      />
      
      <button type="submit" :disabled="loading || !email">
        {{ loading ? 'Connecting...' : 'Connect Wallet' }}
      </button>
    </form>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useWeb3Auth } from '@/composables/useWeb3Auth';

const email = ref('');
const { loading, error, connectWallet } = useWeb3Auth();

const handleSubmit = async () => {
  await connectWallet(email.value);
};
</script>
```

---

## Svelte

### Store: web3Auth.ts

```typescript
import { writable } from 'svelte/store';
import { Client, Account } from 'appwrite';

interface AuthState {
  loading: boolean;
  error: string | null;
  user: any | null;
}

function createWeb3Auth() {
  const { subscribe, set, update } = writable<AuthState>({
    loading: false,
    error: null,
    user: null
  });

  const client = new Client()
    .setEndpoint(import.meta.env.VITE_APPWRITE_ENDPOINT)
    .setProject(import.meta.env.VITE_APPWRITE_PROJECT);

  const account = new Account(client);

  return {
    subscribe,
    connectWallet: async (email: string) => {
      update(state => ({ ...state, loading: true, error: null }));

      try {
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

        const response = await fetch(import.meta.env.VITE_FUNCTION_URL + '/auth', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-appwrite-key': import.meta.env.VITE_API_KEY
          },
          body: JSON.stringify({ email, address, signature, message })
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error);

        await account.createSession(data);
        const user = await account.get();

        update(state => ({ ...state, user, loading: false }));

      } catch (err: any) {
        update(state => ({ ...state, error: err.message, loading: false }));
      }
    },
    logout: async () => {
      try {
        await account.deleteSession('current');
        set({ loading: false, error: null, user: null });
      } catch (err: any) {
        update(state => ({ ...state, error: err.message }));
      }
    }
  };
}

export const web3Auth = createWeb3Auth();
```

### Component: Login.svelte

```svelte
<script lang="ts">
  import { web3Auth } from '$lib/stores/web3Auth';
  
  let email = '';
  
  async function handleSubmit() {
    await web3Auth.connectWallet(email);
  }
</script>

<div class="login-page">
  <form on:submit|preventDefault={handleSubmit}>
    <h1>Web3 Authentication</h1>
    
    {#if $web3Auth.error}
      <div class="error">{$web3Auth.error}</div>
    {/if}
    
    <input
      bind:value={email}
      type="email"
      placeholder="Email address"
      required
      disabled={$web3Auth.loading}
    />
    
    <button type="submit" disabled={$web3Auth.loading || !email}>
      {$web3Auth.loading ? 'Connecting...' : 'Connect Wallet'}
    </button>
  </form>
</div>
```

---

## Angular

### Service: web3-auth.service.ts

```typescript
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { Client, Account } from 'appwrite';
import { environment } from '../environments/environment';

interface AuthState {
  loading: boolean;
  error: string | null;
  user: any | null;
}

@Injectable({
  providedIn: 'root'
})
export class Web3AuthService {
  private authState = new BehaviorSubject<AuthState>({
    loading: false,
    error: null,
    user: null
  });

  public authState$: Observable<AuthState> = this.authState.asObservable();

  private client: Client;
  private account: Account;

  constructor() {
    this.client = new Client()
      .setEndpoint(environment.appwriteEndpoint)
      .setProject(environment.appwriteProject);

    this.account = new Account(this.client);
  }

  async connectWallet(email: string): Promise<void> {
    this.authState.next({ ...this.authState.value, loading: true, error: null });

    try {
      if (!(window as any).ethereum) {
        throw new Error('MetaMask not installed');
      }

      const accounts = await (window as any).ethereum.request({ 
        method: 'eth_requestAccounts' 
      });
      const address = accounts[0];

      const timestamp = Date.now();
      const message = `auth-${timestamp}`;
      const fullMessage = `Sign this message to authenticate: ${message}`;

      const signature = await (window as any).ethereum.request({
        method: 'personal_sign',
        params: [fullMessage, address]
      });

      const response = await fetch(environment.functionUrl + '/auth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-appwrite-key': environment.apiKey
        },
        body: JSON.stringify({ email, address, signature, message })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error);

      await this.account.createSession(data);
      const user = await this.account.get();

      this.authState.next({ loading: false, error: null, user });

    } catch (error: any) {
      this.authState.next({ 
        ...this.authState.value, 
        loading: false, 
        error: error.message 
      });
    }
  }

  async logout(): Promise<void> {
    try {
      await this.account.deleteSession('current');
      this.authState.next({ loading: false, error: null, user: null });
    } catch (error: any) {
      this.authState.next({ 
        ...this.authState.value, 
        error: error.message 
      });
    }
  }
}
```

---

## Helper Functions

### TypeScript Types

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

export interface Web3AuthError {
  error: string;
}

declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: any[] }) => Promise<any>;
      on: (event: string, callback: (...args: any[]) => void) => void;
      removeListener: (event: string, callback: (...args: any[]) => void) => void;
    };
  }
}
```

### Utility Functions

```typescript
// utils/web3.ts
export async function checkMetaMaskInstalled(): Promise<boolean> {
  return typeof window.ethereum !== 'undefined';
}

export async function requestWalletConnection(): Promise<string> {
  if (!window.ethereum) {
    throw new Error('MetaMask not installed');
  }

  const accounts = await window.ethereum.request({ 
    method: 'eth_requestAccounts' 
  });

  if (!accounts || accounts.length === 0) {
    throw new Error('No wallet account selected');
  }

  return accounts[0];
}

export function generateAuthMessage(): { message: string; fullMessage: string } {
  const timestamp = Date.now();
  const message = `auth-${timestamp}`;
  const fullMessage = `Sign this message to authenticate: ${message}`;
  return { message, fullMessage };
}

export async function signMessage(message: string, address: string): Promise<string> {
  if (!window.ethereum) {
    throw new Error('MetaMask not installed');
  }

  return await window.ethereum.request({
    method: 'personal_sign',
    params: [message, address]
  });
}
```

---

## Environment Variables

Create a `.env` file:

```env
# Appwrite Configuration
VITE_APPWRITE_ENDPOINT=https://cloud.appwrite.io/v1
VITE_APPWRITE_PROJECT=your-project-id

# Function Configuration
VITE_FUNCTION_URL=https://cloud.appwrite.io/v1/functions/web3-auth/executions
VITE_API_KEY=your-api-key

# For Next.js, use NEXT_PUBLIC_ prefix
# For Create React App, use REACT_APP_ prefix
```

---

## Best Practices

1. **Never hardcode API keys** - Use environment variables
2. **Validate email format** - Before sending to function
3. **Handle wallet not installed** - Provide MetaMask install link
4. **Show loading states** - Signing can take time
5. **Error handling** - Display user-friendly messages
6. **Wallet switching** - Handle account changes
7. **Network validation** - Check correct blockchain network

---

## Troubleshooting

**Problem**: User rejects signature
- Show clear message: "You must sign the message to authenticate"

**Problem**: Network error
- Check function URL is correct
- Verify API key has permissions

**Problem**: Session not persisting
- Check cookies are enabled
- Verify Appwrite endpoint matches

---

Happy coding! 🚀
