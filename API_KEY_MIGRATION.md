# 🔑 API Key Migration Guide

## Summary

The Web3 Authentication function has been updated to use Appwrite's **built-in API key** (`APPWRITE_FUNCTION_API_KEY`) automatically provided by the Appwrite runtime. This eliminates the need for manual API key configuration.

## ✅ Zero Breaking Changes

**Important:** This update is fully backward compatible. Your existing deployments will continue to work without any modifications.

## What Changed?

### Before (Legacy)
- Required manual API key configuration
- Used `APPWRITE_API_KEY` environment variable
- Manual setup of API key with user management permissions

### After (Current)
- **Automatic API key provision** by Appwrite
- Uses `APPWRITE_FUNCTION_API_KEY` (built-in)
- Falls back to `APPWRITE_API_KEY` for backward compatibility
- No manual configuration required for new deployments

## Migration Paths

### Option 1: Do Nothing (Recommended for Existing Deployments)

If your function is already deployed and working with `APPWRITE_API_KEY`:
- ✅ **No action required**
- ✅ Function continues to work exactly as before
- ✅ The fallback mechanism ensures compatibility

### Option 2: Migrate to Built-in Key (Recommended for New Deployments)

For new deployments or when updating:
1. Deploy the function normally
2. **Do NOT set `APPWRITE_API_KEY`** in environment variables
3. Appwrite will automatically provide `APPWRITE_FUNCTION_API_KEY`
4. The function will use the built-in key automatically

### Option 3: Clean Migration (Optional)

If you want to remove the legacy `APPWRITE_API_KEY` from existing deployments:

1. **Verify the built-in key is available:**
   ```bash
   # Check function logs after deployment
   # The function will automatically use APPWRITE_FUNCTION_API_KEY if available
   ```

2. **Remove legacy environment variable:**
   - Go to Appwrite Console → Functions → Your Function → Settings → Environment Variables
   - Remove `APPWRITE_API_KEY` (if set)
   - Save changes

3. **Redeploy function:**
   ```bash
   appwrite deploy function
   ```

4. **Test thoroughly:**
   - Test authentication flow
   - Verify user creation and wallet binding
   - Check function logs for any errors

## Technical Details

### Code Changes

The authentication handler now checks for API keys in this priority order:

```typescript
const apiKey = process.env.APPWRITE_FUNCTION_API_KEY || process.env.APPWRITE_API_KEY;
```

1. First tries `APPWRITE_FUNCTION_API_KEY` (built-in, automatic)
2. Falls back to `APPWRITE_API_KEY` (legacy, manual)
3. Throws error if neither is available

### Benefits of Built-in Key

✅ **Automatic Configuration**: No manual API key setup required  
✅ **Better Security**: Appwrite manages key lifecycle and permissions  
✅ **Simplified Deployment**: Fewer configuration steps  
✅ **Reduced Errors**: No risk of forgetting to set API key  
✅ **Consistency**: All Appwrite functions use the same pattern  

### Compatibility Matrix

| Deployment Scenario | APPWRITE_FUNCTION_API_KEY | APPWRITE_API_KEY | Result |
|---------------------|---------------------------|------------------|--------|
| New deployment (modern) | ✅ Auto-provided | ❌ Not set | ✅ Uses built-in key |
| Existing deployment (legacy) | ❌ Not available | ✅ Manually set | ✅ Uses legacy key |
| Both available | ✅ Auto-provided | ✅ Manually set | ✅ Prefers built-in key |
| Neither available | ❌ Not available | ❌ Not set | ❌ Error (misconfiguration) |

## Verification

After deployment, verify the function is using the correct API key:

1. **Check function execution logs:**
   ```
   Appwrite Console → Functions → Web3 Authentication → Executions → Logs
   ```

2. **Test authentication:**
   ```javascript
   // From your frontend
   const execution = await functions.createExecution(
     'web3-auth',
     JSON.stringify({ email, address, signature, message }),
     false
   );
   
   // Should return: { userId: "...", secret: "..." }
   ```

3. **Monitor for errors:**
   - If you see "Function API key not configured", check your environment variables
   - Verify either `APPWRITE_FUNCTION_API_KEY` or `APPWRITE_API_KEY` is set

## Troubleshooting

### Issue: "Server configuration error"

**Cause:** Neither `APPWRITE_FUNCTION_API_KEY` nor `APPWRITE_API_KEY` is available.

**Solution:**
- For Appwrite Cloud: The built-in key should be automatic. Contact support if missing.
- For Self-hosted: Ensure your Appwrite version supports function API keys (v1.4+)
- Temporary workaround: Set `APPWRITE_API_KEY` manually with required permissions

### Issue: "Permission denied" errors

**Cause:** The API key (built-in or manual) lacks required permissions.

**Solution:**
- Built-in keys automatically have correct permissions
- If using legacy `APPWRITE_API_KEY`, verify it has:
  - `users.read`
  - `users.write`
  - `sessions.write`

### Issue: Function works in testing but not in production

**Cause:** Different API keys in different environments.

**Solution:**
- Verify the production function has access to API keys
- Check function logs for specific error messages
- Ensure function permissions allow execution (`execute: ["any"]`)

## Rollback Plan

If you experience issues after updating:

1. **Revert to previous version:**
   ```bash
   git checkout <previous-commit>
   npm run build
   appwrite deploy function
   ```

2. **Or manually set legacy key:**
   - Set `APPWRITE_API_KEY` in function environment variables
   - Redeploy function
   - The fallback mechanism will use the legacy key

## Support

For questions or issues:
- Check function execution logs in Appwrite Console
- Review this migration guide
- Test with the `/ping` health check endpoint first
- Verify API key permissions if using manual configuration

## Summary of Changes

**Files Modified:**
- `src/auth-handler.ts` - Added fallback logic for API key
- `src/appwrite-helpers.ts` - Updated documentation
- `src/main.ts` - Updated security documentation
- `env.sample` - Updated environment variable documentation
- `README.md` - Updated configuration section

**Behavior:**
- ✅ Fully backward compatible
- ✅ Automatic API key detection
- ✅ Prioritizes built-in key over legacy key
- ✅ Clear error messages if misconfigured
- ✅ No changes to API endpoints or responses
- ✅ No changes to client-side integration

## Conclusion

This migration enhances the function by leveraging Appwrite's built-in API key system while maintaining complete backward compatibility. Existing deployments continue to work without modification, and new deployments benefit from simplified configuration.
