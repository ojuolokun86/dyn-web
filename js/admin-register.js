// Admin Registration JavaScript
// API_BASE_URL is now provided by api-config.js

document.addEventListener('DOMContentLoaded', () => {
    checkIfAlreadyLoggedIn();
    setupEventListeners();
});

function setupEventListeners() {
    const registerForm = document.getElementById('registerForm');
    registerForm.addEventListener('submit', handleRegister);
}

// Check if user is already logged in
function checkIfAlreadyLoggedIn() {
    const token = localStorage.getItem('adminToken');
    if (token) {
        window.location.href = 'admin.html';
    }
}

// Handle registration form submission
async function handleRegister(e) {
    e.preventDefault();

    const fullName = document.getElementById('fullName').value.trim();
    const email = document.getElementById('email').value.trim();
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirmPassword').value;

    // Validation
    if (!fullName || !email || !username || !password) {
        showMessage('All fields are required!', 'error');
        return;
    }

    if (password !== confirmPassword) {
        showMessage('Passwords do not match!', 'error');
        return;
    }

    if (password.length < 6) {
        showMessage('Password must be at least 6 characters!', 'error');
        return;
    }

    if (username.length < 3) {
        showMessage('Username must be at least 3 characters!', 'error');
        return;
    }

    // Show loading state
    const submitBtn = e.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    submitBtn.disabled = true;
    submitBtn.textContent = 'Submitting...';

    try {
        // Call backend API
        const response = await fetch(`${API_BASE_URL}/admin/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                fullName: fullName,
                email: email,
                username: username,
                password: password
            })
        });

        const data = await response.json();

        if (response.ok && data.success) {
            showMessage('✅ ' + data.message, 'success');
            
            // Redirect to login after 3 seconds
            setTimeout(() => {
                window.location.href = 'admin-login.html';
            }, 3000);
        } else {
            showMessage(data.message || 'Registration failed. Please try again.', 'error');
        }
    } catch (error) {
        console.error('Registration error:', error);
        showMessage('Connection error. Please check if the backend server is running on port 5000.', 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
    }
}

// Show message
function showMessage(message, type) {
    const element = document.getElementById('registerMessage');
    const className = type === 'success' ? 'success-message' : 'error-message';
    element.innerHTML = `<div class="${className}">${escapeHtml(message)}</div>`;

    if (type !== 'success') {
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


