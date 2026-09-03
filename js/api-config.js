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
const defaultLocalUrl = 'http://localhost:5000';
const defaultProductionUrl = 'https://dyn-server.fly.dev';

const localHostnames = ['localhost', '127.0.0.1', '[::1]'];
const isLocalFrontend = typeof window !== 'undefined' && window.location && localHostnames.includes(window.location.hostname);
const url = isLocalFrontend ? defaultLocalUrl : defaultProductionUrl;

const API_BASE_URL = `${url}/api`;
const BACKEND_URL = url;
const BACKEND_TIMEOUT = 5000; // 5 seconds

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
    if (typeof document === 'undefined' || typeof document.getElementById !== 'function' || typeof document.createElement !== 'function') {
        return;
    }

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
        if (document.body && typeof document.body.insertAdjacentElement === 'function') {
            document.body.insertAdjacentElement('afterbegin', div);
        }
    }
}

/**
 * Add error banner styles if not already present
 */
function addErrorStyles() {
    if (typeof document === 'undefined' || typeof document.getElementById !== 'function' || typeof document.createElement !== 'function') {
        return;
    }
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
if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', addErrorStyles);
    } else {
        addErrorStyles();
    }
}

// Check backend on page load
if (typeof window !== 'undefined') {
    window.addEventListener('load', async () => {
        const isRunning = await isBackendRunning();
        if (!isRunning && typeof document !== 'undefined') {
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
}

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
if (typeof window !== 'undefined') {
    window.API_BASE_URL = API_BASE_URL;
    window.BACKEND_URL = BACKEND_URL;
    window.isBackendRunning = isBackendRunning;
    window.fetchAPI = fetchAPI;
}
