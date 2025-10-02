# 🔧 Fix: Function Entry Point Issue

## Problem
Function returns 500 error:
```
Could not load code file.
Error: Cannot find module '/usr/local/server/src/function/src/main.js'
```

## Root Cause
The function's **entry point configuration** in Appwrite Console is wrong. It's looking for `src/main.js` but should look for `dist/main.js`.

---

## ✅ Solution: Update Function Configuration in Appwrite Console

### Option 1: Via Appwrite Console (Easiest)

1. **Go to Appwrite Console**
   - Navigate to your project
   - Click "Functions" in sidebar
   - Find "Web3 Authentication" function

2. **Update Settings**
   - Click "Settings" tab
   - Find "Entry point" field
   - **Change from**: `src/main.js`
   - **Change to**: `dist/main.js`
   - Click "Update"

3. **Redeploy** (if needed)
   - Go to "Deployments" tab
   - Click "Create deployment"
   - Or use CLI: `appwrite deploy function`

---

### Option 2: Via Appwrite CLI

```bash
cd ignore1/web3

# Deploy with correct configuration
appwrite deploy function \
  --functionId web3-auth \
  --entrypoint dist/main.js

# Or redeploy completely
appwrite functions updateDeployment \
  --functionId YOUR_FUNCTION_ID \
  --deploymentId YOUR_DEPLOYMENT_ID \
  --entrypoint dist/main.js
```

---

### Option 3: Manual Deployment Check

**Check current configuration:**

1. Appwrite Console → Functions → Web3 Auth → Settings
2. Look for:
   - **Runtime**: Should be `node-18.0`
   - **Entry point**: Should be `dist/main.js` ✅ NOT `src/main.js`
   - **Build command**: Should be `npm install && npm run build`

**If wrong, update:**
- Click "Settings"
- Update "Entry point" to `dist/main.js`
- Save

---

## 📋 Correct Configuration

### File Structure in Deployment
```
web3-auth-function/
├── dist/                    ← Compiled code (what Appwrite runs)
│   ├── main.js             ← Entry point (THIS is what runs)
│   ├── auth-handler.js
│   ├── web3-utils.js
│   ├── appwrite-helpers.js
│   └── types.js
├── node_modules/
├── package.json
└── package-lock.json
```

### appwrite.json Configuration
```json
{
  "functions": [
    {
      "$id": "web3-auth",
      "name": "Web3 Authentication",
      "runtime": "node-18.0",
      "entrypoint": "dist/main.js",    ← IMPORTANT!
      "commands": "npm install && npm run build"
    }
  ]
}
```

---

## 🧪 Test After Fix

### 1. Check Entry Point in Console
Appwrite Console → Functions → Web3 Auth → Settings
- Entry point: `dist/main.js` ✅

### 2. Test with Health Check
```bash
curl -X POST \
  https://fra.cloud.appwrite.io/v1/functions/YOUR_FUNCTION_ID/executions \
  -H "X-Appwrite-Project: customtoken" \
  -H "Content-Type: application/json" \
  -d '{"body": "{\"path\":\"/ping\"}"}'
```

**Expected response:**
```json
{
  "status": "ok",
  "service": "Web3 Authentication",
  "timestamp": "2024-10-02T..."
}
```

### 3. Check Execution Logs
- Console → Functions → Web3 Auth → Executions
- Click on the execution
- Should show `200` status, NOT `500`

---

## 🚀 Quick Deploy Script

Save this as `deploy.sh`:

```bash
#!/bin/bash
cd "$(dirname "$0")"

echo "🔨 Building function..."
npm install
npm run build

echo "📦 Deploying to Appwrite..."
appwrite deploy function \
  --functionId web3-auth \
  --entrypoint dist/main.js

echo "✅ Done! Check Appwrite Console for deployment status"
```

Make executable and run:
```bash
chmod +x deploy.sh
./deploy.sh
```

---

## 🔍 Verify Deployment

### Check Function Logs
```bash
# List recent executions
appwrite functions listExecutions \
  --functionId web3-auth \
  --queries limit=5

# Get specific execution details
appwrite functions getExecution \
  --functionId web3-auth \
  --executionId EXECUTION_ID
```

### Test from Browser
1. Visit `/login-modular`
2. Click "Connect & Sign"
3. Check browser console:
   ```
   🚀 Calling Appwrite Function: YOUR_FUNCTION_ID
   📥 Function response: { userId, secret }
   ```
4. Check Appwrite Console for execution (should be 200, not 500)

---

## ❌ Common Mistakes

1. **Entry point is `src/main.js`** ← Wrong!
   - Should be `dist/main.js`

2. **No build command**
   - Must include `npm run build` in build commands

3. **Forgot to upload dist/**
   - Make sure `dist/` is not in `.gitignore` when deploying
   - Or build on Appwrite with build command

4. **Wrong runtime**
   - Must be `node-18.0` or higher
   - Check in Settings

---

## 📊 Deployment Checklist

Before deploying:
- [ ] Code compiles: `npm run build`
- [ ] `dist/main.js` exists
- [ ] `dist/main.js` exports default function
- [ ] `appwrite.json` has correct entrypoint
- [ ] Environment variables set in Console
- [ ] Function enabled in Console

After deploying:
- [ ] Entry point is `dist/main.js` in Console
- [ ] Test health check works
- [ ] Test authentication works
- [ ] Check execution logs (200 status)
- [ ] No 500 errors

---

## 🎯 Quick Fix Summary

**In Appwrite Console:**
1. Functions → Web3 Auth → Settings
2. Entry point: Change to `dist/main.js`
3. Save
4. Test: `/login-modular` → "Connect & Sign"
5. Check: Execution should succeed (200, not 500)

**That's it!** 🎉

---

## 📞 Still Having Issues?

### Check these in order:

1. **Entry point in Console**
   ```
   Functions → Settings → Entry point: dist/main.js
   ```

2. **Build succeeded**
   ```bash
   ls -la ignore1/web3/dist/main.js
   # Should exist and be ~8KB
   ```

3. **Deployment includes dist/**
   ```
   Check deployment artifacts in Console
   Should see dist/ folder
   ```

4. **Function is enabled**
   ```
   Functions → Settings → Enabled: YES
   ```

5. **Runtime is correct**
   ```
   Functions → Settings → Runtime: node-18.0
   ```

---

**Updated**: October 2, 2024  
**Status**: Entry point fix documented
