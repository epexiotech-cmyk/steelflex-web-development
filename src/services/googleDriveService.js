const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

const CREDENTIALS_PATH = process.env.GOOGLE_CREDENTIALS || process.env.GOOGLE_CREDENTIALS_PATH || path.join(__dirname, '..', '..', 'oauth-credentials.json');
const TOKEN_PATH = process.env.GOOGLE_TOKEN || process.env.GOOGLE_TOKEN_PATH || path.join(__dirname, '..', '..', 'token.json');

let cachedAuthClient = null;

async function getAuthClient() {
    if (cachedAuthClient) {
        return cachedAuthClient;
    }

    if (!fs.existsSync(CREDENTIALS_PATH)) {
        throw new Error(`File not found: ${CREDENTIALS_PATH}`);
    }
    if (!fs.existsSync(TOKEN_PATH)) {
        throw new Error(`File not found: ${TOKEN_PATH}`);
    }

    const credentials = JSON.parse(fs.readFileSync(CREDENTIALS_PATH));
    const token = JSON.parse(fs.readFileSync(TOKEN_PATH));
    
    // Support both 'installed' and 'web' credential types
    const key = credentials.installed || credentials.web;
    if (!key) throw new Error('Invalid oauth-credentials.json format');

    const { client_secret, client_id, redirect_uris } = key;
    console.log('\n--- GOOGLE AUTH DIAGNOSTICS ---');
    console.log('Credentials Path:', CREDENTIALS_PATH);
    console.log('Token Path:', TOKEN_PATH);
    console.log('Client ID:', client_id);
    console.log('Has Refresh Token:', !!token.refresh_token);
    console.log('Expiry Date:', token.expiry_date ? new Date(token.expiry_date).toISOString() : 'N/A');
    console.log('-------------------------------\n');

    const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);
    oAuth2Client.setCredentials(token);
    
    oAuth2Client.on('tokens', (tokens) => {
        try {
            const currentToken = JSON.parse(fs.readFileSync(TOKEN_PATH, 'utf8'));
            currentToken.access_token = tokens.access_token;
            currentToken.expiry_date = tokens.expiry_date;
            if (tokens.refresh_token) {
                currentToken.refresh_token = tokens.refresh_token;
            }
            
            const tempTokenPath = `${TOKEN_PATH}.tmp.${Date.now()}`;
            fs.writeFileSync(tempTokenPath, JSON.stringify(currentToken, null, 2), 'utf8');
            fs.renameSync(tempTokenPath, TOKEN_PATH);
            console.log('✅ token.json securely updated with refreshed token.');
        } catch (err) {
            console.error('❌ Failed to update token.json:', err);
        }
    });

    cachedAuthClient = oAuth2Client;
    return cachedAuthClient;
}

async function uploadFile(filePath, fileName) {
    try {
        const auth = await getAuthClient();
        const drive = google.drive({ version: 'v3', auth });
        
        const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
        if (!folderId) {
            throw new Error('GOOGLE_DRIVE_FOLDER_ID is not defined in .env');
        }

        const stats = fs.statSync(filePath);
        const fileSize = stats.size;

        const fileMetadata = {
            name: fileName,
            parents: [folderId],
        };

        const media = {
            mimeType: 'application/zip',
            body: fs.createReadStream(filePath),
        };

        try {
            console.log('\n--- PRE-UPLOAD TOKEN CHECK ---');
            const tokenInfo = await auth.getAccessToken();
            console.log('Success: true');
            console.log('Has Token:', !!tokenInfo.token);
            console.log('------------------------------\n');
        } catch (tokenErr) {
            console.log('\n--- PRE-UPLOAD TOKEN CHECK FAILED ---');
            console.log('Success: false');
            console.log('Google Error Code:', tokenErr.code);
            console.log('HTTP Status:', tokenErr.response?.status);
            console.log('Response Body:', JSON.stringify(tokenErr.response?.data, null, 2));
            console.log('-------------------------------------\n');
        }

        const response = await drive.files.create({
            requestBody: fileMetadata,
            media: media,
            fields: 'id, name, size',
            supportsAllDrives: true,
        });

        // Verification Step
        const fileId = response.data.id;
        const check = await drive.files.get({
            fileId: fileId,
            fields: 'id, size, name',
            supportsAllDrives: true
        });

        if (!check.data || parseInt(check.data.size) === 0) {
            throw new Error('Upload verification failed: File not found or size is 0');
        }

        console.log(`✅ Backup uploaded and verified. ID: ${fileId}, Size: ${check.data.size} bytes`);
        return { id: fileId, size: parseInt(check.data.size), name: check.data.name };
    } catch (error) {
        console.error('\n❌ Google Drive upload failed:');
        console.error('Code:', error.code);
        console.error('Status:', error.response?.status);
        console.error('Data:', JSON.stringify(error.response?.data, null, 2));
        throw error;
    }
}

async function cleanupOldBackups(daysToKeep = 30) {
    try {
        const auth = await getAuthClient();
        const drive = google.drive({ version: 'v3', auth });
        
        const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
        const timeLimit = new Date();
        timeLimit.setDate(timeLimit.getDate() - daysToKeep);
        
        // Fetch all zip files in the folder sorted by creation time
        const response = await drive.files.list({
            q: `'${folderId}' in parents and mimeType = 'application/zip' and trashed = false`,
            fields: 'files(id, name, createdTime)',
            orderBy: 'createdTime desc',
            supportsAllDrives: true,
            includeItemsFromAllDrives: true,
        });

        const files = response.data.files || [];
        if (files.length <= 1) return; // Keep the only file (the newest)

        // Pattern for backup-YYYY-MM-DD-HH-mm.zip
        const backupPattern = /^backup-\d{4}-\d{2}-\d{2}-\d{2}-\d{2}\.zip$/;
        
        // Filter files to delete:
        // 1. Matches the naming pattern
        // 2. Older than the time limit
        // 3. IS NOT the newest file (files[0] is newest due to orderBy)
        const filesToDelete = files.filter((file, index) => {
            if (index === 0) return false; // Always keep the newest
            const isOld = new Date(file.createdTime) < timeLimit;
            const matchesPattern = backupPattern.test(file.name);
            return isOld && matchesPattern;
        });

        if (filesToDelete.length > 0) {
            console.log(`Cleaning up ${filesToDelete.length} old backups from Google Drive...`);
            for (const file of filesToDelete) {
                await drive.files.delete({ 
                    fileId: file.id,
                    supportsAllDrives: true 
                });
                console.log(`Deleted old backup: ${file.name}`);
            }
        }
    } catch (error) {
        console.error('\n❌ Google Drive cleanup failed:');
        console.error('Code:', error.code);
        console.error('Status:', error.response?.status);
        console.error('Data:', JSON.stringify(error.response?.data, null, 2));
    }
}

async function listBackups(limit = 20, date = null) {
    try {
        const auth = await getAuthClient();
        const drive = google.drive({ version: 'v3', auth });
        const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;

        let q = `'${folderId}' in parents and mimeType = 'application/zip'`;
        if (date) {
            // date is expected as YYYY-MM-DD from frontend input[type="date"]
            const startOfDay = `${date}T00:00:00Z`;
            const endOfDay = `${date}T23:59:59Z`;
            q += ` and createdTime >= '${startOfDay}' and createdTime <= '${endOfDay}'`;
        }

        const response = await drive.files.list({
            q: q,
            fields: 'files(id, name, createdTime, size)',
            orderBy: 'createdTime desc',
            pageSize: limit,
            supportsAllDrives: true,
            includeItemsFromAllDrives: true,
        });

        return response.data.files;
    } catch (error) {
        console.error('\n❌ Google Drive list failed:');
        console.error('Code:', error.code);
        console.error('Status:', error.response?.status);
        console.error('Data:', JSON.stringify(error.response?.data, null, 2));
        throw error;
    }
}

async function downloadFile(fileId, destPath) {
    try {
        const auth = await getAuthClient();
        const drive = google.drive({ version: 'v3', auth });

        const dest = fs.createWriteStream(destPath);
        const response = await drive.files.get(
            { fileId: fileId, alt: 'media', supportsAllDrives: true },
            { responseType: 'stream' }
        );

        return new Promise((resolve, reject) => {
            response.data
                .on('end', () => {
                    console.log(`✅ Downloaded file ${fileId} to ${destPath}`);
                    resolve(destPath);
                })
                .on('error', (err) => {
                    console.error('❌ Error downloading file:', err);
                    reject(err);
                })
                .pipe(dest);
        });
    } catch (error) {
        console.error('\n❌ Google Drive download failed:');
        console.error('Code:', error.code);
        console.error('Status:', error.response?.status);
        console.error('Data:', JSON.stringify(error.response?.data, null, 2));
        throw error;
    }
}

module.exports = { uploadFile, cleanupOldBackups, listBackups, downloadFile };
