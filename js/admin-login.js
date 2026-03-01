// Admin Login JavaScript
// API_BASE_URL is now provided by api-config.js

document.addEventListener('DOMContentLoaded', () => {
    checkIfAlreadyLoggedIn();
    setupEventListeners();
});

function setupEventListeners() {
    const loginForm = document.getElementById('loginForm');
    loginForm.addEventListener('submit', handleLogin);
}

// Check if user is already logged in
function checkIfAlreadyLoggedIn() {
    const token = localStorage.getItem('adminToken');
    if (token) {
        // Optionally verify token is still valid
        window.location.href = 'admin.html';
    }
}

// Handle login form submission
async function handleLogin(e) {
    e.preventDefault();

    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    if (!username.trim() || !password.trim()) {
        showMessage('Username and password are required!', 'error');
        return;
    }

    // Show loading state
    const submitBtn = e.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    submitBtn.disabled = true;
    submitBtn.textContent = 'Logging in...';

    try {
        // Call backend API
        const response = await fetch(`${API_BASE_URL}/admin/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                username: username,
                password: password
            })
        });

        const data = await response.json();

        if (response.ok && data.token) {
            // Store token in localStorage
            localStorage.setItem('adminToken', data.token);
            if (data.admin) {
                localStorage.setItem('adminUser', JSON.stringify(data.admin));
            }

            showMessage('Login successful! Redirecting...', 'success');
            
            // Redirect to dashboard after 1 second
            setTimeout(() => {
                window.location.href = 'admin.html';
            }, 1000);
        } else {
            showMessage(data.message || 'Login failed. Please check your credentials.', 'error');
        }
    } catch (error) {
        console.error('Login error:', error);
        
        // For development: allow demo login if backend is not available
        // if (username === 'admin' && password === 'admin123') {
        //     const demoToken = generateDemoToken();
        //     localStorage.setItem('adminToken', demoToken);
        //     localStorage.setItem('adminUser', JSON.stringify({
        //         id: '1',
        //         username: 'admin',
        //         role: 'admin',
        //         demoMode: true
        //     }));
            
        //     showMessage('Demo login successful! Redirecting...', 'success');
        //     setTimeout(() => {
        //         window.location.href = 'admin.html';
        //     }, 1000);
        // } else {
        //     showMessage('Connection error. Please try again or use demo credentials.', 'error');
        // }
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
    }
}

// Show message
function showMessage(message, type) {
    const element = document.getElementById('loginMessage');
    const className = type === 'success' ? 'success-message' : 'error-message';
    element.innerHTML = `<div class="${className}">${escapeHtml(message)}</div>`;

    if (type === 'error') {
        setTimeout(() => {
            element.innerHTML = '';
        }, 5000);
    }
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
}

// Generate demo token (for development without backend)
function generateDemoToken() {
    return 'demo_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}


