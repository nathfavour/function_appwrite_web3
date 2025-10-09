# 🔐 Web3 Wallet Authentication - Appwrite Function

A production-ready Appwrite Function that enables **Web3 wallet authentication** (MetaMask, WalletConnect, etc.) for any frontend framework. This function replicates the exact functionality of a Next.js API route, making wallet authentication accessible to frameworks without built-in API capabilities (Vue, Svelte, vanilla JS, etc.)...

## 🎯 Purpose

This function allows frontend-only applications to implement secure Web3 wallet authentication with Appwrite's user management system, without needing to set up backend infrastructure.

**What it does:**
- ✅ Verifies cryptographic signatures from Ethereum wallets
- ✅ Creates or finds Appwrite users based on email
- ✅ Binds wallet addresses to user accounts
- ✅ Generates custom tokens for session creation
- ✅ Prevents wallet switching and account hijacking
- ✅ Handles passkey authentication conflicts

## 🏗️ Architecture

This is a **TypeScript-based Appwrite Function** that mirrors the authentication logic from:
- **Source**: `/app/api/custom-token/route.ts` (Next.js API route)
- **Target**: Standalone Appwrite Function for universal use

### Why This Approach?

Next.js has built-in API routes, but many frameworks don't:
- ❌ **Vue, Svelte, SolidJS**: No backend API routes
- ❌ **Static site generators**: No server-side logic
- ❌ **JAMstack apps**: Need serverless functions

This Appwrite Function solves that problem by providing backend authentication logic as a service.

## 📦 Installation

### Prerequisites

- Node.js 18+ and npm
- Appwrite account and project
- Appwrite CLI (for deployment)

### 1. Install Dependencies

```bash
npm install
```

This installs:
- `ethers@^6.15.0` - Signature verification
- `node-appwrite@^19.1.0` - Appwrite SDK
- `typescript@^5.9.3` - TypeScript compiler

### 2. Build the Function

```bash
npm run build
```

This compiles TypeScript to JavaScript (ESM format) in the `dist/` directory.

### 3. Deploy to Appwrite

```bash
# Using Appwrite CLI
appwrite deploy function

# Or manually via Appwrite Console:
# 1. Create a new function
# 2. Set runtime: Node.js 18.0+
# 3. Set entrypoint: dist/main.js
# 4. Upload the function code
# 5. Set environment variables (see below)
```

## ⚙️ Configuration

### Environment Variables

The function automatically uses these Appwrite-provided variables:
- `APPWRITE_FUNCTION_API_ENDPOINT` - API endpoint (auto-set by Appwrite)
- `APPWRITE_FUNCTION_PROJECT_ID` - Project ID (auto-set by Appwrite)
- `APPWRITE_FUNCTION_API_KEY` - **Automatically generated API key** (auto-set by Appwrite)

**No manual API key configuration required!** Appwrite automatically provides a built-in API key with appropriate permissions for functions.

#### Legacy Support (Optional)

For backward compatibility with existing deployments, the function also supports:
- `APPWRITE_API_KEY` - Manual API key (legacy, optional)

If you have an existing deployment with `APPWRITE_API_KEY` set, it will continue to work. New deployments automatically use the built-in `APPWRITE_FUNCTION_API_KEY`.

### Function Execution Permissions

In your function settings, configure execution permissions:
- **Execute Access**: `Any` (allows unauthenticated users to call for login)
- Or configure specific roles as needed

## 📡 Usage with Appwrite SDK

### Method 1: Using Functions SDK (Recommended)

This is the recommended approach as it handles authentication and security automatically.

```typescript
import { Client, Functions } from 'appwrite';

// Initialize Appwrite client
const client = new Client()
  .setEndpoint('https://cloud.appwrite.io/v1')
  .setProject('your-project-id');

const functions = new Functions(client);

// Call the function
async function authenticateWithWallet(email, address, signature, message) {
  try {
    const execution = await functions.createExecution(
      'YOUR_FUNCTION_ID', // Your deployed function ID
      JSON.stringify({ email, address, signature, message }),
      false, // async = false for immediate response
      '/', // path (optional, defaults to /)
      'POST' // method
    );

    // Parse the response
    const response = JSON.parse(execution.responseBody);
    
    if (execution.responseStatusCode === 200) {
      return response; // { userId, secret }
    } else {
      throw new Error(response.error || 'Authentication failed');
    }
  } catch (error) {
    console.error('Function execution error:', error);
    throw error;
  }
}
```

### Method 2: Direct HTTP Call (Alternative)

If you need more control, you can call the function directly via HTTP:

```typescript
const response = await fetch(
  `https://cloud.appwrite.io/v1/functions/${functionId}/executions`,
  {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Appwrite-Project': 'your-project-id'
    },
    body: JSON.stringify({
      path: '/auth',
      method: 'POST',
      body: JSON.stringify({ email, address, signature, message })
    })
  }
);

const execution = await response.json();
const result = JSON.parse(execution.responseBody);
```

## 🚀 Complete Authentication Flow

Here's a complete example using the Appwrite Functions SDK:

```typescript
import { Client, Account, Functions } from 'appwrite';

// 1. Initialize Appwrite
const client = new Client()
  .setEndpoint('https://cloud.appwrite.io/v1')
  .setProject('your-project-id');

const account = new Account(client);
const functions = new Functions(client);

// 2. Connect wallet and authenticate
async function authenticateWithWallet(email: string) {
  try {
    // Check for MetaMask
    if (!window.ethereum) {
      throw new Error('MetaMask not installed');
    }

    // Request wallet connection
    const accounts = await window.ethereum.request({ 
      method: 'eth_requestAccounts' 
    });
    const address = accounts[0];

    // Generate authentication message
    const timestamp = Date.now();
    const message = `auth-${timestamp}`;
    const fullMessage = `Sign this message to authenticate: ${message}`;

    // Request signature from wallet
    const signature = await window.ethereum.request({
      method: 'personal_sign',
      params: [fullMessage, address]
    });

    // Call Appwrite Function
    const execution = await functions.createExecution(
      'YOUR_FUNCTION_ID',
      JSON.stringify({ email, address, signature, message }),
      false // Get immediate response
    );

    // Parse response
    const response = JSON.parse(execution.responseBody);
    
    if (execution.responseStatusCode !== 200) {
      throw new Error(response.error || 'Authentication failed');
    }

    // Create session with returned token
    await account.createSession({
      userId: response.userId,
      secret: response.secret
    });

    console.log('✅ Authenticated successfully!');
    return response;

  } catch (error) {
    console.error('Authentication error:', error);
    throw error;
  }
}
```

## 📡 API Endpoints

### POST / (or /auth or /authenticate)

Authenticate with Web3 wallet signature.

**Request Body:**
```json
{
  "email": "user@example.com",
  "address": "0xABC123...",
  "signature": "0x456DEF...",
  "message": "auth-1234567890"
}
```

**Success Response (200):**
```json
{
  "userId": "unique_user_id",
  "secret": "custom_token_secret"
}
```

**Error Responses:**
- **400** - Missing fields or invalid JSON
  ```json
  { "error": "Missing required fields" }
  ```
- **401** - Invalid signature
  ```json
  { "error": "Invalid signature" }
  ```
- **403** - Security validation failed
  ```json
  { "error": "Email already bound to a different wallet" }
  ```
- **500** - Server error
  ```json
  { "error": "Authentication failed" }
  ```

### GET /ping (or /health)

Health check endpoint.

**Response (200):**
```json
{
  "status": "ok",
  "service": "Web3 Authentication",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

## 🔒 Security Features

### 1. Cryptographic Signature Verification
- Uses `ethers.verifyMessage()` to recover address from signature
- Proves wallet ownership without exposing private keys
- Resistant to forgery and replay attacks

### 2. Wallet Binding Enforcement
- One wallet per email address (immutable)
- Prevents account hijacking via wallet switching
- Stored in user preferences: `{ walletEth: "0x..." }`

### 3. Passkey Conflict Detection
- Users with passkey auth must link wallets via passkey
- Prevents bypassing 2FA/passkey security

### 4. Server-Side Validation
- API key stored in function environment (never exposed)
- All verification happens server-side
- No client-side security dependencies

### 5. Message Format Validation
- Expected format: `Sign this message to authenticate: auth-{timestamp}`
- Timestamp provides uniqueness (basic replay protection)

## 🛠️ Development

### Local Development

```bash
# Install dependencies
npm install

# Watch mode (auto-recompile on changes)
npm run dev

# Type checking only (no build)
npm run test

# Format code
npm run format
```

### Project Structure

```
web3/
├── src/
│   ├── main.ts              # Entry point & routing
│   ├── auth-handler.ts      # Authentication logic
│   ├── web3-utils.ts        # Signature verification
│   ├── appwrite-helpers.ts  # User management
│   └── types.ts             # TypeScript definitions
├── dist/                    # Compiled output (gitignored)
├── package.json
├── tsconfig.json
└── README.md
```

## 🆚 Comparison: Next.js vs Appwrite Function

| Aspect | Next.js API Route | Appwrite Function |
|--------|-------------------|-------------------|
| **Framework** | Next.js only | Any framework |
| **Request** | `Request` object | Function context |
| **Response** | `NextResponse` | `res.json()` |
| **API Key** | `process.env.APPWRITE_API` | `APPWRITE_API_KEY` env var |
| **Calling** | `fetch('/api/custom-token')` | Appwrite Functions SDK |
| **Build** | Next.js bundler | TypeScript compiler |
| **Deploy** | Vercel/hosting | Appwrite Functions |
| **Security** | API key in server env | API key in function env |

**Core logic is 100% identical** - only the request/response handling differs.

## 📄 License

This project is part of the Appwrite Web3 integration and follows the same license as the main repository.

## 📚 Documentation

### Framework-Specific Guides

- **[USAGE_NEXT.md](./USAGE_NEXT.md)** - Complete Next.js integration guide (App Router, Pages Router, Server Components, Middleware)
- **[USAGE_REACT.md](./USAGE_REACT.md)** - React integration guide with hooks and context patterns
- **[CLIENT_EXAMPLES.md](./CLIENT_EXAMPLES.md)** - Examples for Vue, Svelte, Angular, and vanilla JavaScript

### General Documentation

- **[DEPLOYMENT.md](./DEPLOYMENT.md)** - Deployment instructions
- **[SDK_MIGRATION_GUIDE.md](./SDK_MIGRATION_GUIDE.md)** - Migration guide for SDK updates

## 📞 Support

- **Issues**: Open a GitHub issue
- **Questions**: Use GitHub Discussions
- **Security**: Report privately via email

---

**Made with ❤️ for the Web3 community**
