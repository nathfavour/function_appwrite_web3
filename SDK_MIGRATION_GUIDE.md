# 🔄 SDK Migration Guide - Updated to Use Appwrite Functions SDK

**Date**: October 2, 2024  
**Update**: Changed from HTTP API calls to Appwrite Functions SDK

---

## 🎯 What Changed

We've updated the function to use **Appwrite's Functions SDK** instead of direct HTTP calls with manual API key passing. This provides better security and cleaner code.

### Before (HTTP API with Manual API Key)
```typescript
// ❌ Old approach - API key exposed to client
const response = await fetch('FUNCTION_URL/auth', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-appwrite-key': 'YOUR_API_KEY' // ⚠️ Exposed to client
  },
  body: JSON.stringify({ email, address, signature, message })
});
```

### After (Appwrite Functions SDK)
```typescript
// ✅ New approach - No API key exposure
import { Client, Functions } from 'appwrite';

const client = new Client()
  .setEndpoint('YOUR_ENDPOINT')
  .setProject('YOUR_PROJECT');

const functions = new Functions(client);

const execution = await functions.createExecution(
  'YOUR_FUNCTION_ID',
  JSON.stringify({ email, address, signature, message }),
  false // Get immediate response
);

const response = JSON.parse(execution.responseBody);
```

---

## 🔐 Security Improvements

### 1. API Key Not Exposed to Client
- **Before**: API key passed via `x-appwrite-key` header from client
- **After**: API key stored in function's environment variables
- **Benefit**: No way for clients to access or leak the API key

### 2. Leverages Appwrite's Built-in Security
- Uses Appwrite's session management
- Automatic request validation
- Built-in rate limiting

### 3. Simpler Client Code
- No need to manage API keys on client
- No environment variable for API key
- Cleaner and safer code

---

## 📝 Migration Steps

### Step 1: Update Function Environment Variables

In your Appwrite function settings, add:
```
APPWRITE_API_KEY=your-api-key-here
```

This moves the API key from client environment to server environment.

### Step 2: Update Client Code

**Old client code** (remove this):
```typescript
const response = await fetch(FUNCTION_URL, {
  headers: {
    'x-appwrite-key': process.env.API_KEY // Remove this
  }
});
```

**New client code** (use this):
```typescript
import { Functions } from 'appwrite';

const functions = new Functions(client);
const execution = await functions.createExecution(
  FUNCTION_ID,
  JSON.stringify(payload),
  false
);
const response = JSON.parse(execution.responseBody);
```

### Step 3: Remove API Key from Client Environment

Delete from your `.env`:
```env
# Remove these lines:
NEXT_PUBLIC_API_KEY=...
VITE_API_KEY=...
```

Keep only:
```env
NEXT_PUBLIC_APPWRITE_ENDPOINT=https://cloud.appwrite.io/v1
NEXT_PUBLIC_APPWRITE_PROJECT=your-project-id
NEXT_PUBLIC_FUNCTION_ID=your-function-id
```

### Step 4: Update Function Code

The function now reads API key from environment:
```typescript
// Old: const apiKey = req.headers['x-appwrite-key'];
// New: const apiKey = process.env.APPWRITE_API_KEY;
```

---

## 🔄 Code Changes Summary

### Function Changes

**File**: `src/auth-handler.ts`

```diff
- // API key is passed via request header for security
- const apiKey = req.headers['x-appwrite-key'];
- if (!apiKey) {
-   logError('API key missing from request headers');
-   return res.json({ error: 'API key required' }, 401);
- }
+ // Use the API key from environment (automatically provided by Appwrite)
+ const apiKey = process.env.APPWRITE_API_KEY;
+ if (!apiKey) {
+   logError('Function API key not configured in environment');
+   return res.json({ error: 'Server configuration error' }, 500);
+ }
```

### Client Changes

**Vanilla JavaScript**:
```diff
- const response = await fetch(FUNCTION_URL, {
-   method: 'POST',
-   headers: {
-     'Content-Type': 'application/json',
-     'x-appwrite-key': API_KEY
-   },
-   body: JSON.stringify(payload)
- });
+ const execution = await functions.createExecution(
+   FUNCTION_ID,
+   JSON.stringify(payload),
+   false
+ );
+ const response = JSON.parse(execution.responseBody);
```

---

## 📚 Updated Documentation

All documentation files have been updated:

1. **README.md** - Now shows SDK-based usage
2. **CLIENT_EXAMPLES.md** - All 5 framework examples use SDK
3. **DEPLOYMENT.md** - Explains environment variable setup
4. **This file** - Migration guide

---

## ✅ Benefits

| Aspect | Before | After |
|--------|--------|-------|
| **Security** | API key in client env | API key in function env |
| **Code Complexity** | Manual HTTP + headers | Simple SDK call |
| **Error Handling** | Manual parsing | Built-in SDK handling |
| **Type Safety** | Manual types | SDK types included |
| **Rate Limiting** | Manual implementation | Built-in Appwrite |
| **Session Management** | Manual | Automatic |

---

## 🧪 Testing Checklist

After migration, test these scenarios:

- [ ] New user registration works
- [ ] Existing user login works
- [ ] Invalid signature rejected
- [ ] Wallet conflict detected
- [ ] Passkey conflict detected
- [ ] Error messages clear
- [ ] Session created successfully
- [ ] No API key visible in client code
- [ ] Function logs show proper execution
- [ ] Health check endpoint works

---

## 🚨 Breaking Changes

### For Existing Deployments

1. **Function must be redeployed** with new environment variable
2. **Client code must be updated** to use SDK
3. **API key must be moved** from client env to function env

### Backward Compatibility

⚠️ **Not backward compatible** - clients using the old HTTP approach will get 500 errors until they migrate.

### Migration Timeline

1. Deploy updated function
2. Set `APPWRITE_API_KEY` environment variable
3. Update client applications
4. Test thoroughly
5. Remove old API keys from client environments

---

## 📞 Support

If you encounter issues during migration:

1. Check function execution logs in Appwrite Console
2. Verify `APPWRITE_API_KEY` is set correctly
3. Ensure function ID is correct in client code
4. Test with the health check endpoint first: `/ping`

---

## 📖 Reference

- [Appwrite Functions Documentation](https://appwrite.io/docs/products/functions)
- [Functions SDK Execution](https://appwrite.io/docs/products/functions/execute)
- [Environment Variables](https://appwrite.io/docs/products/functions/develop#environment-variables)

---

**Updated**: October 2, 2024  
**Status**: ✅ Migration Complete
