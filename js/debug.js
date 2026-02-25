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
    console.log('🔍 Testing backend connection...');
    console.log(`🎯 Backend URL: ${window.BACKEND_URL}`);
    
    try {
        const response = await fetch(`${window.BACKEND_URL}/api/health`, {
            method: 'GET'
        });
        
        if (response.ok) {
            const data = await response.json();
            console.log('✅ Backend is running!');
            console.log('📊 Response:', data);
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
    console.log('🔍 Testing CORS from frontend to backend...');
    console.log(`📱 Frontend URL: ${window.location.origin}`);
    console.log(`🎯 Backend URL: ${window.BACKEND_URL}`);
    
    try {
        const response = await fetch(`${window.BACKEND_URL}/api/health`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        const data = await response.json();
        console.log('✅ CORS is working!');
        console.log('📊 Server response:', data);
        return true;
    } catch (error) {
        console.error('❌ CORS error detected!');
        console.error('❌ Error:', error.message);
        console.log('💡 Check backend .env CORS_ORIGIN setting');
        console.log(`💡 Should include: ${window.location.origin}`);
        return false;
    }
}

async function testAPICall() {
    console.log('🔍 Testing API call to /api/events/current...');
    
    try {
        const response = await fetch(`${window.BACKEND_URL}/api/events/current`);
        const data = await response.json();
        console.log('✅ API call successful!');
        console.log('📊 Response:', data);
        return true;
    } catch (error) {
        console.error('❌ API call failed:', error.message);
        return false;
    }
}

// ===== CONFIGURATION CHECKS =====

function checkConfiguration() {
    console.log('📋 CONFIGURATION CHECK');
    console.log('='.repeat(50));
    
    console.log('🌐 Frontend:');
    console.log(`   Current URL: ${window.location.origin}`);
    console.log(`   Frontend Port: ${window.location.port || 'default'}`);
    
    console.log('\n🔌 API Configuration:');
    console.log(`   API_BASE_URL: ${window.API_BASE_URL}`);
    console.log(`   BACKEND_URL: ${window.BACKEND_URL}`);
    
    console.log('\n📦 Supabase Integration:');
    // This would fail if api-config.js is the only config. Add on next version
    console.log('   (Check backend .env for SUPABASE_URL)');
    
    console.log('\n✅ Quick Test Commands:');
    console.log('   1. await testBackendConnection()');
    console.log('   2. await testCORS()');
    console.log('   3. await testAPICall()');
    console.log('   4. await window.isBackendRunning()');
}

// ===== NETWORK MONITOR =====

function monitorNetworkErrors() {
    console.log('📡 Setting up network error monitoring...');
    
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
    
    console.log('✅ Network monitoring active');
    console.log('💡 All failed fetch requests will be logged');
}

// ===== QUICK DIAGNOSTICS =====

async function runFullDiagnostics() {
    console.clear();
    console.log('🔧 FULL DIAGNOSTICS');
    console.log('='.repeat(50));
    
    checkConfiguration();
    
    console.log('\n🧪 Running tests...\n');
    
    const backendRunning = await testBackendConnection();
    console.log('');
    
    const corsWorking = await testCORS();
    console.log('');
    
    if (backendRunning) {
        await testAPICall();
    }
    
    console.log('\n' + '='.repeat(50));
    console.log('✅ Diagnostics complete!');
    
    if (backendRunning && corsWorking) {
        console.log('✨ Everything looks good! Ready to use.');
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

console.log('🐛 Debug tools loaded! Run: window.DEBUG.runFullDiagnostics()');
