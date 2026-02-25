# 🔌 Frontend API Configuration

Centralized API setup for all frontend files. No more repeating the API URL in every file!

## 📁 File: `js/api-config.js`

This is the **single source of truth** for API configuration.

### What It Does

✅ Defines `API_BASE_URL` once  
✅ Provides `fetchAPI()` helper function  
✅ Checks if backend is running  
✅ Shows error banner if backend is down  
✅ Available globally as `window.API_BASE_URL`  

### Configuration

```javascript
const API_BASE_URL = 'http://localhost:5000/api';
const BACKEND_URL = 'http://localhost:5000';
const BACKEND_TIMEOUT = 5000; // 5 seconds
```

Change these values once, and all files automatically use the new settings.

## 🚀 Usage in HTML

Load `api-config.js` **before** other scripts:

```html
<head>
    <!-- ... other stuff ... -->
</head>
<body>
    <!-- Content -->
    
    <!-- Load API config first -->
    <script src="js/api-config.js"></script>
    
    <!-- Then load your other scripts -->
    <script src="js/main.js"></script>
    <script src="js/admin.js"></script>
</body>
</html>
```

## 💻 Usage in JavaScript

### Access the URL

```javascript
// Global access (after api-config.js loads)
const url = window.API_BASE_URL;

// Or use the helper function
const response = await fetchAPI('/admin/login', {
    method: 'POST',
    body: JSON.stringify({ username: 'user', password: 'pass' })
});
```

### Example: Login

```javascript
async function handleLogin(username, password) {
    const result = await fetchAPI('/admin/login', {
        method: 'POST',
        body: JSON.stringify({ username, password })
    });
    
    if (result.success) {
        console.log('Logged in!');
    } else {
        console.error('Login failed:', result.error);
    }
}
```

### Direct Fetch

If you need to use fetch directly:

```javascript
const response = await fetch(`${window.API_BASE_URL}/admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
});
```

## 🔍 Backend Status Check

Check if backend is running:

```javascript
const isRunning = await window.isBackendRunning();

if (isRunning) {
    console.log('✅ Backend is running');
} else {
    console.log('❌ Backend is NOT running');
}
```

## ⚠️ Error Handling

If backend is not running:

1. **Error banner appears** at top of page
2. **Shows error message** with instructions
3. **API calls fail gracefully** with error response

Banner content:
```
❌ Backend Server Not Running
Could not connect to backend at http://localhost:5000
Start backend with: cd backend && npm run dev
```

## 📄 Updated HTML Files

All HTML files now load `api-config.js` first:

- ✅ `admin-login.html`
- ✅ `admin-register.html`
- ✅ `admin.html`
- ✅ `index.html`

## 🔧 Updated JS Files

All JS files now use centralized config:

- ✅ `js/admin-login.js`
- ✅ `js/admin-register.js`
- ✅ `js/admin.js`
- ✅ `js/main.js`

They no longer define `const API_BASE_URL = ...` locally.

## 📋 API Functions Available

### `isBackendRunning()`
```javascript
const running = await window.isBackendRunning();
// Returns: true/false
```

### `fetchAPI(endpoint, options)`
```javascript
const result = await window.fetchAPI('/admin/login', {
    method: 'POST',
    body: JSON.stringify(data)
});
// Returns: { success: true/false, ... }
```

## 🎯 Benefits

✨ **Single Source of Truth**
- Change URL in one place
- All files use the new URL automatically

✨ **Error Detection**
- Automatically detects backend disconnection
- Shows helpful error message to users

✨ **Consistent API Calls**
- Same headers across all requests
- Same error handling everywhere

✨ **Easy Debugging**
- Global `window.API_BASE_URL` for console testing
- Can quickly check backend status

## 🧪 Testing

Open browser console and test:

```javascript
// Check URL
console.log(window.API_BASE_URL);
// Output: http://localhost:5000/api

// Check if backend is running
await window.isBackendRunning();
// Output: true/false

// Make a test call
await window.fetchAPI('/health');
// Output: { status: 'ok', ... }
```

## 🚨 Environment Variations

### Development

```javascript
const API_BASE_URL = 'http://localhost:5000/api';
```

### Production

```javascript
const API_BASE_URL = 'https://api.balloondior.com/api';
```

Just change the value in `api-config.js` and redeploy!

## 🔐 Security Notes

- API_BASE_URL is public (visible in client code) ✅
- Never put secrets in `api-config.js` ✅
- JWT tokens stored in localStorage are handled by other files ✅
- Auth headers added automatically by individual fetches ✅

---

**Status:** ✅ Ready to Use  
**Version:** 1.0.0  
**Last Updated:** February 22, 2026
