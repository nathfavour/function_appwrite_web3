# 🚀 Deployment Guide: Web3 Authentication Function

This guide walks you through deploying the Web3 authentication function to Appwrite.

## Prerequisites

- ✅ Appwrite Cloud account or self-hosted Appwrite instance
- ✅ Appwrite CLI installed (`npm install -g appwrite-cli`)
- ✅ Node.js 18+ installed locally
- ✅ Project with an API key that has user management permissions

## Method 1: Appwrite CLI (Recommended)

### Step 1: Login to Appwrite

```bash
appwrite login
```

Follow the prompts to authenticate with your Appwrite instance.

### Step 2: Initialize Project (if not already done)

```bash
appwrite init project
```

Select your project or create a new one.

### Step 3: Create Function Configuration

Create an `appwrite.json` file in the project root (if not exists):

```json
{
  "projectId": "YOUR_PROJECT_ID",
  "projectName": "Your Project Name",
  "functions": [
    {
      "$id": "web3-auth",
      "name": "Web3 Authentication",
      "runtime": "node-18.0",
      "execute": ["any"],
      "events": [],
      "schedule": "",
      "timeout": 15,
      "enabled": true,
      "logging": true,
      "entrypoint": "dist/main.js",
      "commands": "npm install && npm run build",
      "path": "ignore1/web3",
      "variables": {}
    }
  ]
}
```

### Step 4: Build Locally

```bash
cd ignore1/web3
npm install
npm run build
```

### Step 5: Deploy

```bash
# From project root
appwrite deploy function

# Or deploy specific function
appwrite deploy function --functionId web3-auth
```

### Step 6: Verify Deployment

```bash
# Test health endpoint
curl https://YOUR_APPWRITE_ENDPOINT/v1/functions/web3-auth/executions \
  -X POST \
  -H "X-Appwrite-Project: YOUR_PROJECT_ID" \
  -H "Content-Type: application/json" \
  -d '{"path": "/ping"}'
```

## Method 2: Manual Deployment (Appwrite Console)

### Step 1: Build the Function

```bash
cd ignore1/web3
npm install
npm run build
```

### Step 2: Create ZIP Archive

```bash
# Create deployment package
zip -r web3-auth.zip dist/ node_modules/ package.json package-lock.json
```

### Step 3: Upload via Console

1. Go to Appwrite Console → Functions
2. Click "Create Function"
3. Configure:
   - **Name**: Web3 Authentication
   - **Runtime**: Node.js 18.0
   - **Entrypoint**: `dist/main.js`
   - **Build Commands**: `npm install`
   - **Execute Access**: Anyone (or configure as needed)
   - **Timeout**: 15 seconds
4. Upload `web3-auth.zip`
5. Click "Deploy"

### Step 4: Enable Function

- Go to Settings tab
- Enable the function
- Enable logging (for debugging)

## Method 3: Git Integration (Advanced)

### Step 1: Connect GitHub Repository

1. In Appwrite Console → Functions
2. Create new function
3. Select "Connect Git Repository"
4. Authorize GitHub
5. Select repository and branch

### Step 2: Configure Build

- **Root Directory**: `ignore1/web3`
- **Build Command**: `npm install && npm run build`
- **Entrypoint**: `dist/main.js`

### Step 3: Auto-Deploy

- Push to connected branch
- Function automatically rebuilds and deploys

## Configuration

### Function Settings

| Setting | Value | Description |
|---------|-------|-------------|
| **Runtime** | Node.js 18.0 | Requires Node 18+ for ESM support |
| **Entrypoint** | `dist/main.js` | Compiled JavaScript entry point |
| **Build Commands** | `npm install && npm run build` | Install deps and compile TypeScript |
| **Timeout** | 15 seconds | Enough for signature verification |
| **Execute Access** | Anyone | Or restrict as needed |
| **Logging** | Enabled | For debugging |

### Environment Variables

Appwrite automatically provides these:
- `APPWRITE_FUNCTION_API_ENDPOINT` - Auto-set by Appwrite
- `APPWRITE_FUNCTION_PROJECT_ID` - Auto-set by Appwrite

**You must configure**:
- `APPWRITE_API_KEY` - Your API key (set in function settings)

### API Key Configuration

1. Create an API key in Appwrite Console with these scopes:
   - `users.read` - Query users
   - `users.write` - Create users and update preferences
   - `sessions.write` - Create tokens

2. Add it to your function's environment variables:
   - Key: `APPWRITE_API_KEY`
   - Value: `your-api-key-here`
   - This keeps the key secure server-side only

**Security**: The API key is stored in the function environment, never exposed to clients.

## Testing

### Test Health Endpoint

```bash
curl -X POST \
  https://YOUR_ENDPOINT/v1/functions/web3-auth/executions \
  -H "X-Appwrite-Project: YOUR_PROJECT_ID" \
  -H "Content-Type: application/json" \
  -d '{
    "path": "/ping"
  }'
```

Expected response:
```json
{
  "status": "ok",
  "service": "Web3 Authentication",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### Test Authentication (requires valid signature)

Using curl with Appwrite Functions API:

```bash
curl -X POST \
  https://YOUR_ENDPOINT/v1/functions/web3-auth/executions \
  -H "X-Appwrite-Project: YOUR_PROJECT_ID" \
  -H "Content-Type: application/json" \
  -d '{
    "body": "{\"email\":\"test@example.com\",\"address\":\"0x742d35Cc...\",\"signature\":\"0x...\",\"message\":\"auth-1234567890\"}",
    "async": false
  }'
```

Or using the Appwrite SDK (recommended):

```javascript
import { Client, Functions } from 'appwrite';

const client = new Client()
  .setEndpoint('YOUR_ENDPOINT')
  .setProject('YOUR_PROJECT_ID');

const functions = new Functions(client);

const execution = await functions.createExecution(
  'web3-auth',
  JSON.stringify({ email, address, signature, message }),
  false
);

console.log(JSON.parse(execution.responseBody));
```

## Monitoring

### View Logs

1. Appwrite Console → Functions → web3-auth
2. Click "Executions" tab
3. View recent execution logs

### Common Issues

**Issue**: Function timeout
- **Solution**: Increase timeout in settings (max 900s)

**Issue**: Module not found
- **Solution**: Ensure `npm install` runs in build commands

**Issue**: Invalid signature errors
- **Solution**: Verify message format matches exactly:
  ```
  Sign this message to authenticate: auth-{timestamp}
  ```

**Issue**: User creation fails
- **Solution**: Check API key has `users.write` permission

## Security Checklist

Before going to production:

- [ ] API key stored securely (environment variables)
- [ ] API key has minimal required permissions
- [ ] Function execute access properly configured
- [ ] Rate limiting configured (if using Appwrite Cloud)
- [ ] Logging enabled for security monitoring
- [ ] CORS configured if calling from web apps
- [ ] SSL/TLS enabled (HTTPS)

## Rollback

If something goes wrong:

```bash
# List function deployments
appwrite functions listDeployments --functionId web3-auth

# Activate previous deployment
appwrite functions updateDeployment \
  --functionId web3-auth \
  --deploymentId PREVIOUS_DEPLOYMENT_ID \
  --activate true
```

## Performance Optimization

### Cold Start (~1-2 seconds)
- Keep function warm with periodic health checks
- Use Appwrite Cloud for better cold start times

### Reduce Bundle Size
```bash
# Only install production dependencies
npm install --production

# Remove dev dependencies from deployment
zip -r web3-auth.zip dist/ node_modules/ package.json -x "node_modules/@types/*"
```

### Caching
- Appwrite automatically caches function responses
- Configure cache headers if needed

## Scaling

Appwrite automatically scales functions based on load:
- **Appwrite Cloud**: Auto-scaling included
- **Self-hosted**: Configure workers in `docker-compose.yml`

## Support

- **Logs**: Check execution logs in Appwrite Console
- **Documentation**: [Appwrite Functions Docs](https://appwrite.io/docs/functions)
- **Community**: [Appwrite Discord](https://appwrite.io/discord)

## Next Steps

1. ✅ Deploy function
2. ✅ Test with curl
3. ✅ Integrate into frontend
4. ✅ Monitor logs
5. ✅ Scale as needed

Happy deploying! 🚀
