/**
 * TalentLens Deployment Connectivity Checker
 * Run this script to verify your frontend and backend configurations.
 */

const axios = require('axios');

// CONFIGURATION - UPDATE THESE WITH YOUR DEPLOYED URLS
const BACKEND_URL = 'https://your-backend.up.railway.app'; // e.g. https://backend.up.railway.app
const FRONTEND_URL = 'https://your-frontend.vercel.app';  // e.g. https://talentlens.vercel.app

async function runDiagnostics() {
    console.log('🔍 Starting TalentLens Connectivity Diagnostics...\n');

    // 1. Check Backend Health
    console.log(`📡 Checking Backend Health: ${BACKEND_URL}/health`);
    try {
        const resp = await axios.get(`${BACKEND_URL}/health`, { timeout: 5000 });
        console.log('✅ Backend is reachable!');
        console.log(`   Response: ${JSON.stringify(resp.data)}\n`);
    } catch (err) {
        console.error('❌ Backend is UNREACHABLE!');
        console.error(`   Error: ${err.message}`);
        if (err.response) {
            console.error(`   Status: ${err.response.status}`);
        }
        console.log('   👉 Tip: Check if the Railway service is running and the URL is correct.\n');
    }

    // 2. Check CORS (Simulated)
    console.log(`🛡️  Checking CORS for Frontend: ${FRONTEND_URL}`);
    try {
        const resp = await axios.options(`${BACKEND_URL}/api/v1/auth/login`, {
            headers: {
                'Origin': FRONTEND_URL,
                'Access-Control-Request-Method': 'POST',
                'Access-Control-Request-Headers': 'Content-Type'
            },
            timeout: 5000
        });
        
        const allowedOrigin = resp.headers['access-control-allow-origin'];
        if (allowedOrigin === FRONTEND_URL || allowedOrigin === '*') {
            console.log('✅ CORS configuration is correct!');
        } else {
            console.warn('⚠️  CORS might be misconfigured.');
            console.warn(`   Backend returned Access-Control-Allow-Origin: ${allowedOrigin}`);
            console.log('   👉 Tip: Ensure FRONTEND_URL in Railway matches your Vercel URL exactly (no trailing slash).\n');
        }
    } catch (err) {
        console.error('❌ CORS Preflight check failed!');
        console.error(`   Error: ${err.message}`);
        console.log('   👉 Tip: Check backend logs for "CORS REJECTED" messages.\n');
    }

    // 3. Database Check
    console.log('🗄️  Checking Database Connectivity (via health check timestamp)');
    try {
        const resp = await axios.get(`${BACKEND_URL}/health`);
        if (resp.data.status === 'ok') {
            console.log('✅ Database status looks okay from health check.\n');
        }
    } catch (err) {
        // Already handled in step 1
    }

    console.log('🏁 Diagnostics complete.');
}

if (BACKEND_URL.includes('your-backend')) {
    console.error('❌ Please edit this script and set BACKEND_URL and FRONTEND_URL first.');
    process.exit(1);
}

runDiagnostics();
