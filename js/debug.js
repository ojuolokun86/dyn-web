/**
 * Connection Debug Helper
 * Open browser console and run these commands to debug API connections
 * 
 * Usage in browser console:
 *  await testBackendConnection();
 *  await testCORS();
 *  checkConfiguration();
 */

// ===== CONNECTION TESTS =====

async function testBackendConnection() {
    
    
    
    try {
        const response = await fetch(`${window.BACKEND_URL}/api/health`, {
            method: 'GET'
        });
        
        if (response.ok) {
            const data = await response.json();
            
            
            return true;
        } else {
            console.error('❌ Backend responded with status:', response.status);
            return false;
        }
    } catch (error) {
        console.error('❌ Cannot connect to backend:', error.message);
        console.error('💡 Make sure backend is running: npm run dev');
        return false;
    }
}

async function testCORS() {
    
    
    
    
    try {
        const response = await fetch(`${window.BACKEND_URL}/api/health`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        const data = await response.json();
        
        
        return true;
    } catch (error) {
        console.error('❌ CORS error detected!');
        console.error('❌ Error:', error.message);
        
        
        return false;
    }
}

async function testAPICall() {
    
    
    try {
        const response = await fetch(`${window.BACKEND_URL}/api/events/current`);
        const data = await response.json();
        
        
        return true;
    } catch (error) {
        console.error('❌ API call failed:', error.message);
        return false;
    }
}

// ===== CONFIGURATION CHECKS =====

function checkConfiguration() {
    
    );
    
    
    
    
    
    
    
    
    
    
    // This would fail if api-config.js is the only config. Add on next version
    ');
    
    
    ');
    ');
    ');
    ');
}

// ===== NETWORK MONITOR =====

function monitorNetworkErrors() {
    
    
    // Log fetch errors
    const originalFetch = window.fetch;
    window.fetch = function(...args) {
        const request = args[0];
        const url = typeof request === 'string' ? request : request.url;
        
        return originalFetch.apply(this, args).catch(error => {
            console.error(`❌ FETCH ERROR: ${url}`);
            console.error(`   ${error.message}`);
            throw error;
        });
    };
    
    
    
}

// ===== QUICK DIAGNOSTICS =====

async function runFullDiagnostics() {
    console.clear();
    
    );
    
    checkConfiguration();
    
    
    
    const backendRunning = await testBackendConnection();
    
    
    const corsWorking = await testCORS();
    
    
    if (backendRunning) {
        await testAPICall();
    }
    
    );
    
    
    if (backendRunning && corsWorking) {
        
    } else {
        console.error('⚠️ Some issues detected. See above for details.');
    }
}

// ===== EXPORT =====

window.DEBUG = {
    testBackendConnection,
    testCORS,
    testAPICall,
    checkConfiguration,
    monitorNetworkErrors,
    runFullDiagnostics
};

');
