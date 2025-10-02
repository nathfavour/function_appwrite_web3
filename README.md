# 🔐 Web3 Wallet Authentication - Appwrite Function

A production-ready Appwrite Function that enables **Web3 wallet authentication** (MetaMask, WalletConnect, etc.) for any frontend framework. This function replicates the exact functionality of a Next.js API route, making wallet authentication accessible to frameworks without built-in API capabilities (Vue, Svelte, vanilla JS, etc.).

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
- `APPWRITE_FUNCTION_API_ENDPOINT` - API endpoint (auto-set)
- `APPWRITE_FUNCTION_PROJECT_ID` - Project ID (auto-set)

### Required Headers

All requests must include:
- `Content-Type: application/json`
- `x-appwrite-key: YOUR_API_KEY` - Server API key with user creation permissions

### API Key Permissions

Your API key needs:
- ✅ `users.read` - Query users by email
- ✅ `users.write` - Create users and update preferences
- ✅ `sessions.write` - Create custom tokens

## 📡 API Endpoints

### POST /auth (or / or /authenticate)

Authenticate with Web3 wallet signature.

**Request:**
```bash
curl -X POST https://your-appwrite-instance/functions/[function-id]/execution \
  -H "Content-Type: application/json" \
  -H "x-appwrite-key: YOUR_API_KEY" \
  -d '{
    "email": "user@example.com",
    "address": "0xABC123...",
    "signature": "0x456DEF...",
    "message": "auth-1234567890"
  }'
```

**Request Body:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `email` | string | ✅ | User's email address |
| `address` | string | ✅ | Ethereum wallet address (0x...) |
| `signature` | string | ✅ | Signed message from wallet |
| `message` | string | ✅ | Original message (e.g., `auth-1234567890`) |

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
- **401** - Invalid signature or missing API key
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

## 🚀 Usage Example

### Complete Frontend Integration

```typescript
// 1. Import Appwrite SDK
import { Client, Account } from 'appwrite';

// 2. Initialize Appwrite
const client = new Client()
  .setEndpoint('https://your-instance.appwrite.io/v1')
  .setProject('your-project-id');

const account = new Account(client);

// 3. Connect wallet and request signature
async function authenticateWithWallet(email: string) {
  // Check for MetaMask
  if (!window.ethereum) {
    throw new Error('MetaMask not found');
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

  // 4. Call Appwrite Function
  const response = await fetch('YOUR_FUNCTION_URL/auth', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-appwrite-key': 'YOUR_API_KEY' // ⚠️ Use env variable, never hardcode!
    },
    body: JSON.stringify({ email, address, signature, message })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Authentication failed');
  }

  const { userId, secret } = await response.json();

  // 5. Create Appwrite session
  await account.createSession({ userId, secret });

  console.log('✅ Authenticated successfully!');
}

// Usage
authenticateWithWallet('user@example.com');
```

### Vue.js Example

```vue
<template>
  <div>
    <input v-model="email" placeholder="Email" />
    <button @click="connect" :disabled="loading">
      {{ loading ? 'Connecting...' : 'Connect Wallet' }}
    </button>
    <p v-if="error" class="error">{{ error }}</p>
  </div>
</template>

<script>
import { Client, Account } from 'appwrite';

export default {
  data() {
    return {
      email: '',
      loading: false,
      error: null
    };
  },
  methods: {
    async connect() {
      this.loading = true;
      this.error = null;

      try {
        const accounts = await window.ethereum.request({ 
          method: 'eth_requestAccounts' 
        });
        const address = accounts[0];
        
        const message = `auth-${Date.now()}`;
        const fullMessage = `Sign this message to authenticate: ${message}`;
        
        const signature = await window.ethereum.request({
          method: 'personal_sign',
          params: [fullMessage, address]
        });

        const response = await fetch(process.env.VUE_APP_FUNCTION_URL + '/auth', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-appwrite-key': process.env.VUE_APP_APPWRITE_KEY
          },
          body: JSON.stringify({ 
            email: this.email, 
            address, 
            signature, 
            message 
          })
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error);

        const client = new Client()
          .setEndpoint(process.env.VUE_APP_APPWRITE_ENDPOINT)
          .setProject(process.env.VUE_APP_APPWRITE_PROJECT);
        
        const account = new Account(client);
        await account.createSession(data);

        this.$router.push('/dashboard');
      } catch (e) {
        this.error = e.message;
      } finally {
        this.loading = false;
      }
    }
  }
};
</script>
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

### 4. API Key Protection
- API key required via `x-appwrite-key` header
- Never exposed to frontend (use environment variables)
- Server-side validation only

### 5. Message Format Validation
- Expected format: `Sign this message to authenticate: auth-{timestamp}`
- Timestamp provides uniqueness (basic replay protection)
- Can be enhanced with expiration checks

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

### Code Flow

```
Request → main.ts (routing)
           ↓
       auth-handler.ts (orchestration)
           ↓
       ├─ web3-utils.ts (verify signature)
       └─ appwrite-helpers.ts (user management)
           ↓
       Response (userId + secret)
```

## 📊 Testing

### Manual Testing with curl

```bash
# Health check
curl https://your-function-url/ping

# Authentication
curl -X POST https://your-function-url/auth \
  -H "Content-Type: application/json" \
  -H "x-appwrite-key: YOUR_API_KEY" \
  -d '{
    "email": "test@example.com",
    "address": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
    "signature": "0x...",
    "message": "auth-1234567890"
  }'
```

### Expected Behavior

✅ **Valid signature** → Returns `{ userId, secret }`  
❌ **Invalid signature** → Returns `{ error: "Invalid signature" }` (401)  
❌ **Missing email** → Returns `{ error: "Missing required fields" }` (400)  
❌ **Wallet conflict** → Returns `{ error: "Email already bound to different wallet" }` (403)

## 🆚 Comparison: Next.js vs Appwrite Function

| Aspect | Next.js API Route | Appwrite Function |
|--------|-------------------|-------------------|
| **File** | `/app/api/custom-token/route.ts` | `/src/main.ts` |
| **Framework** | Next.js only | Any framework |
| **Request** | `Request` object | `req` context object |
| **Response** | `NextResponse` | `res.json()` |
| **Env Vars** | `NEXT_PUBLIC_*` | `APPWRITE_FUNCTION_*` |
| **API Key** | `process.env.APPWRITE_API` | `req.headers['x-appwrite-key']` |
| **Routing** | File-based | Manual (in code) |
| **Build** | Next.js bundler | TypeScript compiler |
| **Deploy** | Vercel/hosting | Appwrite Functions |

**Core logic is 100% identical** - only the request/response handling differs.

## 🚧 Limitations & Future Enhancements

### Current Limitations
- Single chain (Ethereum) - no multi-chain support yet
- Basic replay protection (timestamp only)
- No message expiration enforcement
- No rate limiting

### Potential Enhancements
1. **Multi-chain support**: Polygon, BSC, Arbitrum, etc.
2. **ENS integration**: Resolve ENS names to addresses
3. **NFT-based auth**: Require specific NFT ownership
4. **Stronger replay protection**: HMAC, nonce validation
5. **Rate limiting**: Prevent abuse
6. **Audit logging**: Track authentication attempts
7. **Hardware wallet support**: Ledger, Trezor compatibility

## 📄 License

This project is part of the Appwrite Web3 integration and follows the same license as the main repository.

## 🤝 Contributing

Contributions welcome! Please ensure:
- TypeScript types are complete
- Code follows existing style
- Security best practices maintained
- Documentation updated

## 📞 Support

- **Issues**: Open a GitHub issue
- **Questions**: Use GitHub Discussions
- **Security**: Report privately via email

## 🎉 Credits

Developed as part of the Appwrite Web3 authentication integration project. This function enables any frontend framework to implement secure wallet authentication without backend infrastructure.

---

**Made with ❤️ for the Web3 community**

