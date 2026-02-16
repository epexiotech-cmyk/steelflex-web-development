const http = require('http');

function request(path, method = 'GET', body = null, headers = {}) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'localhost',
            port: 3000,
            path: '/api' + path,
            method: method,
            headers: {
                'Content-Type': 'application/json',
                ...headers
            }
        };

        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                try {
                    const parsed = data ? JSON.parse(data) : null;
                    resolve({ status: res.statusCode, data: parsed, headers: res.headers });
                } catch (e) {
                    resolve({ status: res.statusCode, data, headers: res.headers });
                }
            });
        });

        req.on('error', reject);

        if (body) {
            req.write(JSON.stringify(body));
        }
        req.end();
    });
}

async function runTests() {
    console.log('Starting Backend Verification...');

    try {
        // 1. Health Check
        console.log('\n[1] Checking Health...');
        const health = await request('/health');
        if (health.status === 200) console.log('✅ Health Check Passed');
        else console.error('❌ Health Check Failed', health);

        // 2. Login
        console.log('\n[2] Testing Super Admin Login...');
        const login = await request('/auth/login', 'POST', { userId: 'admin', password: 'admin123' });
        if (login.status === 200 && login.data.accessToken) {
            console.log('✅ Login Passed');
            const token = login.data.accessToken;

            // 3. User Management (Get Users)
            console.log('\n[3] Testing Get Users (Protected)...');
            const users = await request('/users', 'GET', null, { 'Authorization': `Bearer ${token}` });
            if (users.status === 200 && Array.isArray(users.data)) {
                console.log(`✅ Get Users Passed (Found ${users.data.length} users)`);
            } else {
                console.error('❌ Get Users Failed', users.status);
            }

            // 4. Create Review
            console.log('\n[4] Testing Create Review...');
            const review = await request('/reviews', 'POST', {
                clientName: 'Test Client',
                companyName: 'Test Co',
                reviewText: 'Good',
                rating: 5,
                status: 'Active'
            }, { 'Authorization': `Bearer ${token}` });

            if (review.status === 201) {
                console.log('✅ Create Review Passed');
            } else {
                console.error('❌ Create Review Failed', review.status);
            }

        } else {
            console.error('❌ Login Failed', login.status, login.data);
        }

    } catch (err) {
        console.error('❌ Test Script Error:', err);
    }
}

runTests();
