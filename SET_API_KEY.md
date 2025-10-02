# 🔑 Set Function API Key - Quick Guide

## Problem
Function returns 500 error:
```
Function API key not configured in environment
```

## Solution
Add the `APPWRITE_API_KEY` environment variable to your function in Appwrite Console.

---

## ✅ Step-by-Step Fix

### 1. Get Your API Key

**Option A: Use Existing Key from .env**
```bash
# From project root
cat .env | grep APPWRITE_API
# Copy the value (without APPWRITE_API=)
```

**Option B: Create New Key in Appwrite Console**
1. Go to Appwrite Console
2. Click "Settings" (gear icon) → "API Keys"
3. Click "Create API Key"
4. Name: `Web3 Function Key`
5. Scopes needed:
   - ✅ `users.read`
   - ✅ `users.write`
   - ✅ `sessions.write`
6. Click "Create"
7. Copy the API key (starts with `standard_...`)

---

### 2. Add to Function Environment Variables

1. **Go to Appwrite Console**
2. Navigate to: **Functions** → **Web3 Authentication**
3. Click **"Settings"** tab
4. Scroll to **"Environment Variables"** section
5. Click **"Add Variable"**
6. Enter:
   - **Key**: `APPWRITE_API_KEY`
   - **Value**: Your API key (e.g., `standard_abc123...`)
7. Click **"Add"** or **"Save"**

---

### 3. Test the Function

1. Visit `/login-modular` in your Next.js app
2. Click "Connect & Sign"
3. Check browser console - should work now!
4. Check Appwrite Console → Functions → Executions
   - Should show **200** status (success!) ✅
   - NOT 500 anymore

---

## 🎯 Visual Guide

### In Appwrite Console:

```
Functions → Web3 Authentication → Settings

┌─────────────────────────────────────────────┐
│ Environment Variables                       │
├─────────────────────────────────────────────┤
│                                             │
│ [+] Add Variable                            │
│                                             │
│ Key:   APPWRITE_API_KEY                     │
│ Value: standard_abc123def456...             │
│                                             │
│ [Add] [Cancel]                              │
│                                             │
└─────────────────────────────────────────────┘
```

---

## 🔍 Verify It's Set

After adding the variable, you should see it listed:

```
Environment Variables (1)
┌──────────────────────┬─────────────────────────┐
│ Key                  │ Value                   │
├──────────────────────┼─────────────────────────┤
│ APPWRITE_API_KEY     │ standard_abc123...      │
└──────────────────────┴─────────────────────────┘
```

---

## 🧪 Test It Works

### Test 1: Health Check
```bash
curl -X POST \
  https://fra.cloud.appwrite.io/v1/functions/YOUR_FUNCTION_ID/executions \
  -H "X-Appwrite-Project: customtoken" \
  -H "Content-Type: application/json" \
  -d '{"body": "{\"path\":\"/ping\"}"}'
```

Should return:
```json
{
  "status": "ok",
  "service": "Web3 Authentication",
  "timestamp": "..."
}
```

### Test 2: Authentication
1. Go to `/login-modular`
2. Enter email
3. Click "Connect & Sign"
4. Sign with MetaMask
5. Should successfully log in! ✅

### Test 3: Check Execution Logs
- Console → Functions → Web3 Auth → Executions
- Click the latest execution
- Status should be **200**
- Response should have `userId` and `secret`

---

## ❌ Common Issues

### Issue: "API key is required"
**Cause**: Variable name is wrong  
**Fix**: Make sure it's exactly `APPWRITE_API_KEY` (all caps, with underscore)

### Issue: "Insufficient permissions"
**Cause**: API key doesn't have required scopes  
**Fix**: Edit API key in Console, add:
- `users.read`
- `users.write`
- `sessions.write`

### Issue: Still getting 500 error
**Cause**: Function needs to be redeployed or restarted  
**Fix**: 
1. Update the environment variable
2. Go to Deployments tab
3. Click "Redeploy" on latest deployment
4. Or just wait 1-2 minutes for auto-restart

---

## 🎓 Why This Is Needed

The function needs an API key to:
1. **Query users** by email - Check if user exists
2. **Create users** - Register new users
3. **Update preferences** - Store wallet address
4. **Create tokens** - Generate session tokens

Without the API key, the function can't access Appwrite's User API.

---

## 🔐 Security Note

**Good**: API key is in the function's environment (server-side only)  
**Bad**: Would be passing API key from client (exposed in browser)

This setup is secure because:
- ✅ API key stored server-side in Appwrite
- ✅ Never sent to browser
- ✅ Function executes with proper credentials
- ✅ Client only sends wallet signature

---

## 📋 Quick Checklist

Before testing:
- [ ] API key created in Appwrite Console
- [ ] API key has required scopes (users.read, users.write, sessions.write)
- [ ] Environment variable added to function: `APPWRITE_API_KEY`
- [ ] Variable value is the full API key (starts with `standard_`)
- [ ] Function has been redeployed or auto-restarted

After testing:
- [ ] Health check returns 200
- [ ] Authentication works from browser
- [ ] Execution logs show 200 status
- [ ] No more "API key not configured" error

---

## 🎯 Expected Result

### Before (with error):
```
❌ Function execution failed
Status: 500
Error: Function API key not configured in environment
```

### After (working):
```
✅ Function execution succeeded
Status: 200
Response: { userId: "...", secret: "..." }
```

---

## 🚀 One-Line Summary

**Go to Appwrite Console → Functions → Web3 Auth → Settings → Environment Variables → Add: `APPWRITE_API_KEY` = your-api-key**

That's it! 🎉

---

**Updated**: October 2, 2024  
**Status**: API key setup documented
