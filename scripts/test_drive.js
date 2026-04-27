require('dotenv').config();
const { listBackups } = require('../src/services/googleDriveService');

async function testConnection() {
    console.log('🔍 Testing Google Drive connection...');
    console.log('------------------------------------');
    
    try {
        const backups = await listBackups(5);
        console.log('✅ SUCCESS! Successfully connected to Google Drive.');
        console.log(`📂 Found ${backups.length} existing backups in the folder.`);
        
        if (backups.length > 0) {
            console.log('\nLast 5 backups:');
            backups.forEach(b => console.log(`- ${b.name} (${new Date(b.createdTime).toLocaleString()})`));
        } else {
            console.log('\nThe folder is currently empty, which is fine.');
        }
        
    } catch (err) {
        console.error('❌ CONNECTION FAILED!');
        console.error('Error Details:', err.message);
        console.log('\nPossible fixes:');
        console.log('1. Make sure "oauth-credentials.json" and "token.json" are in the root folder.');
        console.log('2. Make sure GOOGLE_DRIVE_FOLDER_ID is correct in .env');
        console.log('3. Ensure your token hasn\'t expired (re-generate locally if needed).');
    }
}

testConnection();
