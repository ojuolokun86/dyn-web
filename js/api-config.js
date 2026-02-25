/**
 * Centralized API Configuration
 * Use this file in all JavaScript files instead of defining API_BASE_URL everywhere
 * 
 * Usage:
 *   import { API_BASE_URL, isBackendRunning } from './api-config.js';
 *   OR in HTML:
 *   <script src="js/api-config.js"></script>
 *   // Access as: window.API_BASE_URL, window.isBackendRunning()
 */
const url = 'http://localhost:5000';

const API_BASE_URL = `${url}/api`;
const BACKEND_URL = url;
const BACKEND_TIMEOUT = 5000; // 5 seconds
// Supabase configuration - set these values to enable direct uploads
const SUPABASE_URL = 'https://wjpelhrjclljpgqeavyp.supabase.co'; // e.g. https://xyzcompany.supabase.co
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndqcGVsaHJqY2xsanBncWVhdnlwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0Mjg4NTk2MSwiZXhwIjoyMDU4NDYxOTYxfQ.sE6jO-2Ct0uzDecE84zvEq2b-ENgDZudJejdA50ovGo'; // anon/public key

// Supabase client (will be initialized if library present and keys set)
window.supabaseClient = null;

// Default buckets used by the UI
const SUPABASE_BUCKET_PROFILES = 'profiles';
const SUPABASE_BUCKET_VIDEOS = 'videos';

function initSupabaseClient() {
    try {
        if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return null;
        if (window.supabase && typeof window.supabase.createClient === 'function') {
            window.supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
            console.info('Supabase client initialized');
            return window.supabaseClient;
        }
    } catch (err) {
        console.error('Failed to init Supabase client:', err);
    }
    return null;
}

// Try to initialize Supabase client on load (if the lib has been included and keys set)
if (typeof window !== 'undefined') {
    // Defer to DOMContentLoaded in case CDN script loads slightly after
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initSupabaseClient);
    } else {
        initSupabaseClient();
    }
}

// Upload helper: uploads a File to a Supabase storage bucket and returns the stored object path
async function uploadToSupabase(bucket, path, file, opts = { upsert: true }) {
    if (!window.supabaseClient) {
        throw new Error('Supabase client not initialized');
    }

    const storage = window.supabaseClient.storage;
    const { data, error } = await storage.from(bucket).upload(path, file, { upsert: opts.upsert });
    if (error) throw error;

    // Return the object path; caller can request a signed URL for private buckets
    return data?.path || null;
}

// Create a signed URL for a private object. Returns a signed URL string.
async function createSupabaseSignedUrl(bucket, path, expiresIn = 3600) {
    if (!window.supabaseClient) throw new Error('Supabase client not initialized');
    const storage = window.supabaseClient.storage;
    const { data, error } = await storage.from(bucket).createSignedUrl(path, expiresIn);
    if (error) throw error;
    return data?.signedUrl || null;
}

/**
 * Check if backend server is running
 * @returns {Promise<boolean>} True if backend is accessible
 */
async function isBackendRunning() {
    try {
        const response = await fetch(`${BACKEND_URL}/api/health`, {
            method: 'GET',
            timeout: BACKEND_TIMEOUT
        });
        return response.ok;
    } catch (error) {
        return false;
    }
}

/**
 * Get API response with error handling
 * @param {string} endpoint - API endpoint (e.g., '/admin/login')
 * @param {object} options - Fetch options
 * @returns {Promise<object>} Response data
 */
async function fetchAPI(endpoint, options = {}) {
    const url = `${API_BASE_URL}${endpoint}`;
    
    try {
        const response = await fetch(url, {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options
        });

        // Check if backend is running
        if (!response.ok && response.status === 0) {
            showBackendError();
            return { success: false, error: 'Backend server is not running' };
        }

        const data = await response.json();
        return data;
    } catch (error) {
        console.error('API Error:', error);
        showBackendError();
        return { success: false, error: error.message };
    }
}

/**
 * Show backend connection error message
 */
function showBackendError() {
    const banner = document.getElementById('backend-error-banner');
    
    if (!banner) {
        const div = document.createElement('div');
        div.id = 'backend-error-banner';
        div.className = 'backend-error-banner';
        div.innerHTML = `
            <div class="backend-error-content">
                <strong>❌ Backend Server Error</strong>
                <p>Could not connect to backend server at ${BACKEND_URL}</p>
                <small>Make sure to run: <code>npm run dev</code> in the backend folder</small>
            </div>
        `;
        document.body.insertAdjacentElement('afterbegin', div);
    }
}

/**
 * Add error banner styles if not already present
 */
function addErrorStyles() {
    if (document.getElementById('backend-error-styles')) return;
    
    const style = document.createElement('style');
    style.id = 'backend-error-styles';
    style.textContent = `
        .backend-error-banner {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            background: #f8d7da;
            border-bottom: 2px solid #f5c6cb;
            padding: 15px 20px;
            z-index: 9999;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }

        .backend-error-content {
            max-width: 1200px;
            margin: 0 auto;
            color: #721c24;
        }

        .backend-error-content strong {
            display: block;
            font-size: 1.1em;
            margin-bottom: 5px;
        }

        .backend-error-content p {
            margin: 5px 0;
            font-size: 0.95em;
        }

        .backend-error-content small {
            display: block;
            margin-top: 10px;
            opacity: 0.8;
        }

        .backend-error-content code {
            background: rgba(0,0,0,0.1);
            padding: 2px 6px;
            border-radius: 3px;
            font-family: monospace;
        }
    `;
    document.head.appendChild(style);
}

// Add styles on page load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', addErrorStyles);
} else {
    addErrorStyles();
}

// Check backend on page load
window.addEventListener('load', async () => {
    const isRunning = await isBackendRunning();
    if (!isRunning) {
        const banner = document.createElement('div');
        banner.id = 'backend-error-banner';
        banner.className = 'backend-error-banner';
        banner.innerHTML = `
            <div class="backend-error-content">
                <strong>❌ Backend Server Not Running</strong>
                <p>Could not connect to backend at ${BACKEND_URL}</p>
                <small>Start backend with: <code>cd backend && npm run dev</code></small>
            </div>
        `;
        document.body.insertAdjacentElement('afterbegin', banner);
    }
});

// Export for ES6 modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        API_BASE_URL,
        BACKEND_URL,
        isBackendRunning,
        fetchAPI
    };
}

// Make globally available
window.API_BASE_URL = API_BASE_URL;
window.BACKEND_URL = BACKEND_URL;
window.isBackendRunning = isBackendRunning;
window.fetchAPI = fetchAPI;
// Expose Supabase helpers and bucket names to other scripts
window.uploadToSupabase = typeof uploadToSupabase === 'function' ? uploadToSupabase : undefined;
window.createSupabaseSignedUrl = typeof createSupabaseSignedUrl === 'function' ? createSupabaseSignedUrl : undefined;
window.SUPABASE_BUCKET_PROFILES = typeof SUPABASE_BUCKET_PROFILES !== 'undefined' ? SUPABASE_BUCKET_PROFILES : 'profiles';
window.SUPABASE_BUCKET_VIDEOS = typeof SUPABASE_BUCKET_VIDEOS !== 'undefined' ? SUPABASE_BUCKET_VIDEOS : 'videos';
window.SUPABASE_URL = typeof SUPABASE_URL !== 'undefined' ? SUPABASE_URL : '';
window.SUPABASE_ANON_KEY = typeof SUPABASE_ANON_KEY !== 'undefined' ? SUPABASE_ANON_KEY : '';
