# Google OAuth Debugging Guide

## Step 1: Check Console Logs After Google Login

After clicking "Sign in with Google" and being redirected back, open browser console (F12) and look for these logs:

### ✅ What You SHOULD See:
```
[AuthContext] Initializing auth...
[AuthContext] Initial session: { hasSession: true, user: { id: '...', email: '...' }, error: null }
[AuthContext] Auth state changed: { event: 'SIGNED_IN', hasSession: true, user: {...} }
[App] Auth state changed: { user: { id: '...', email: '...', provider: 'google' } }
[AuthenticatedApp] Mounting with user: { id: '...', email: '...' }
[useProducts] useEffect triggered { hasUser: true, ... }
[useProducts] loadProducts called, user: { id: '...', email: '...' }
[useProducts] Calling StorageService.getProducts...
```

### ❌ If You Only See:
```
[AuthContext] Initializing auth...
[AuthContext] Initial session: { hasSession: false, user: null, error: null }
```

This means the OAuth callback didn't work. The session wasn't captured.

## Step 2: Check Browser URL After Redirect

After Google redirects you back to your app, check the URL bar:

### ✅ Good - Has access token:
```
http://localhost:5173/#access_token=eyJhbGc...&expires_in=3600&...
```

### ❌ Bad - No access token:
```
http://localhost:5173/
```

If you don't see the access token in the URL, the OAuth redirect is broken.

## Step 3: Manual Session Check

After Google login (while still on the broken page), open console and run:

```javascript
// Check if session exists
const { data, error } = await window.supabase.auth.getSession()
console.log('Manual session check:', data.session, 'Error:', error)

// Check auth state listener
const { data: { subscription } } = window.supabase.auth.onAuthStateChange((event, session) => {
  console.log('Auth event:', event, 'Session:', session)
})
```

## Step 4: Check Supabase Configuration

### In Supabase Dashboard:

1. Go to **Authentication → URL Configuration**
2. Check these settings:

   **Site URL**: Should be your app URL
   - Local dev: `http://localhost:5173`
   - Production: `https://yourdomain.com`

   **Redirect URLs**: Should include your app URL
   - Local dev: `http://localhost:5173`
   - Production: `https://yourdomain.com`

3. Go to **Authentication → Providers → Google**
   - Ensure Google OAuth is enabled
   - Ensure you have valid Client ID and Client Secret

## Step 5: Clear Browser State

Google OAuth issues can be caused by stale browser state:

1. **Clear cookies and local storage:**
   - Open DevTools (F12)
   - Go to Application tab → Storage
   - Click "Clear site data"

2. **Hard refresh:**
   - Press `Ctrl+Shift+R` (Windows/Linux)
   - Press `Cmd+Shift+R` (Mac)

3. **Try again with Google login**

## Step 6: Check Network Tab

1. Open DevTools (F12) → Network tab
2. Click "Sign in with Google"
3. After redirect, look for these requests:
   - POST to `https://...supabase.co/auth/v1/token`
   - Should return 200 with access_token
   - Should NOT return 401/403

If you see 401/403 errors, the OAuth tokens aren't being accepted.

## Common Issues & Solutions

### Issue 1: OAuth Redirect URL Mismatch
**Symptoms**: No access token in URL after redirect
**Solution**:
- Ensure Supabase Redirect URL exactly matches your app URL (including protocol, port)
- No trailing slashes unless your app uses them

### Issue 2: Third-Party Cookies Blocked
**Symptoms**: OAuth completes but session not set
**Solution**:
- Enable third-party cookies in browser
- Or use same-site cookie configuration in Supabase

### Issue 3: Multiple User Accounts
**Symptoms**: Data not showing after switch between auth methods
**Solution**:
- See ACCOUNT_LINKING_FIX.md for merging accounts
- Or use email-based admin check (already in DATABASE_SCHEMA.md)

### Issue 4: Browser Extension Interference
**Symptoms**: Intermittent OAuth failures
**Solution**:
- Test in incognito/private window
- Disable ad blockers and privacy extensions

## What to Share for Further Help

If none of the above works, please share:

1. **Console logs** (all lines starting with `[AuthContext]`, `[App]`, `[useProducts]`)
2. **Browser URL** after Google redirect (mask the token values)
3. **Network tab** showing the POST to `/auth/v1/token` (response status and headers)
4. **Supabase URL Configuration** screenshot (mask sensitive values)

This will help identify exactly where the OAuth flow is breaking.
