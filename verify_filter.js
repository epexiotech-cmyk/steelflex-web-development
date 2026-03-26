const axios = require('axios');
const fs = require('fs');
const FormData = require('form-data');

async function runTests() {
    const baseURL = 'http://localhost:3000/upload';

    // Test 1: Regular Image Upload (Success)
    console.log('Test 1: Regular Image Upload (Success)');
    await testUpload(baseURL, 'test_image.png');

    // Test 2: Regular PDF Upload (Failure)
    console.log('\nTest 2: Regular PDF Upload (Failure)');
    await testUpload(baseURL, 'test_cv.pdf');

    // Test 3: Career PDF Upload (Success)
    console.log('\nTest 3: Career PDF Upload (Success)');
    await testUpload(baseURL + '?context=career', 'test_cv.pdf');

    // Test 4: Career Image Upload (Success)
    console.log('\nTest 4: Career Image Upload (Success)');
    await testUpload(baseURL + '?context=career', 'test_image.png');
}

async function testUpload(url, filename) {
    try {
        if (!fs.existsSync(filename)) {
            console.log(`File ${filename} missing, skipping test.`);
            return;
        }
        const form = new FormData();
        form.append('image', fs.createReadStream(filename));

        const response = await axios.post(url, form, {
            headers: form.getHeaders()
        });

        console.log('Result: SUCCESS');
        // console.log('Response:', JSON.stringify(response.data, null, 2));
    } catch (error) {
        console.log('Result: FAILED');
        if (error.response) {
            console.log('Error:', error.response.data.error || error.response.data.message);
        } else {
            console.log('Error:', error.message);
        }
    }
}

runTests();
