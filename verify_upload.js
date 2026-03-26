const axios = require('axios');
const fs = require('fs');
const FormData = require('form-data');

async function testUpload() {
    try {
        const form = new FormData();
        form.append('image', fs.createReadStream('test_image.png'));

        const response = await axios.post('http://localhost:3000/upload', form, {
            headers: form.getHeaders()
        });

        console.log('--- Upload Success ---');
        console.log(JSON.stringify(response.data, null, 2));

        const fileName = response.data.file;
        const opPath = `uploads/optimized/${fileName}`;
        const thPath = `uploads/thumbs/${fileName}`;

        console.log('\n--- Checking Files ---');
        console.log(`Optimized exists: ${fs.existsSync(opPath)}`);
        console.log(`Thumbnail exists: ${fs.existsSync(thPath)}`);

    } catch (error) {
        console.error('--- Upload Failed ---');
        if (error.response) {
            console.error(error.response.data);
        } else {
            console.error(error.message);
        }
    }
}

testUpload();
