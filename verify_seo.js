const axios = require('axios');
const fs = require('fs');
const FormData = require('form-data');

async function testSeoUpload() {
    const url = 'http://localhost:3000/upload';
    
    try {
        const form = new FormData();
        form.append('image', fs.createReadStream('test_image.png'));
        form.append('project', 'Industrial Warehouse');
        form.append('location', 'Vadodara');
        form.append('category', 'PEB Shed');

        console.log('Testing SEO Upload to /upload...');
        const response = await axios.post(url, form, {
            headers: form.getHeaders()
        });

        console.log('Result: SUCCESS');
        console.log('Response:', JSON.stringify(response.data, null, 2));
        
        const expectedPrefix = '/uploads/optimized/industrial-warehouse/industrial-warehouse-peb-shed-vadodara-';
        if (response.data.optimizedUrl.startsWith(expectedPrefix)) {
            console.log('SEO Name & Path: VALID ✅');
        } else {
            console.log('SEO Name & Path: INVALID ❌');
            console.log('Expected prefix:', expectedPrefix);
        }

    } catch (error) {
        console.log('Result: FAILED');
        if (error.response) {
            console.log('Error:', error.response.data);
        } else {
            console.log('Error:', error.message);
        }
    }
}

testSeoUpload();
