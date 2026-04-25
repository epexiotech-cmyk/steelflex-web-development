require('dotenv').config();
const { uploadFile } = require('./src/services/googleDriveService');
const fs = require('fs');
const path = require('path');

async function test() {
    const testFile = path.join(__dirname, 'test.txt');
    fs.writeFileSync(testFile, 'Hello Google Drive!');
    
    try {
        console.log('Testing small file upload...');
        await uploadFile(testFile, 'test-sync.txt');
        console.log('Success!');
    } catch (err) {
        console.error('Test Failed:', err.message);
    } finally {
        if (fs.existsSync(testFile)) fs.unlinkSync(testFile);
    }
}

test();
