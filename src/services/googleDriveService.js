const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

const CREDENTIALS_PATH = path.join(__dirname, '..', '..', 'oauth-credentials.json');
const TOKEN_PATH = path.join(__dirname, '..', '..', 'token.json');

async function getAuthClient() {
    if (!fs.existsSync(CREDENTIALS_PATH)) {
        throw new Error('oauth-credentials.json not found');
    }
    if (!fs.existsSync(TOKEN_PATH)) {
        throw new Error('token.json not found. Run "node scripts/auth_google.js" first.');
    }

    const credentials = JSON.parse(fs.readFileSync(CREDENTIALS_PATH));
    const token = JSON.parse(fs.readFileSync(TOKEN_PATH));
    const { client_secret, client_id, redirect_uris } = credentials.installed;
    
    const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);
    oAuth2Client.setCredentials(token);
    
    return oAuth2Client;
}

async function uploadFile(filePath, fileName) {
    try {
        const auth = await getAuthClient();
        const drive = google.drive({ version: 'v3', auth });
        
        const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
        if (!folderId) {
            throw new Error('GOOGLE_DRIVE_FOLDER_ID is not defined in .env');
        }

        const fileMetadata = {
            name: fileName,
            parents: [folderId],
        };

        const media = {
            mimeType: 'application/zip',
            body: fs.createReadStream(filePath),
        };

        const response = await drive.files.create({
            requestBody: fileMetadata,
            media: media,
            fields: 'id',
            supportsAllDrives: true,
        });

        console.log(`✅ Backup uploaded to Google Drive. File ID: ${response.data.id}`);
        return response.data.id;
    } catch (error) {
        console.error('❌ Google Drive upload failed:', error.message);
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
        
        const q = `'${folderId}' in parents and mimeType = 'application/zip' and createdTime < '${timeLimit.toISOString()}'`;
        
        const response = await drive.files.list({
            q: q,
            fields: 'files(id, name, createdTime)',
            supportsAllDrives: true,
            includeItemsFromAllDrives: true,
        });

        const files = response.data.files;
        if (files.length > 0) {
            console.log(`Cleaning up ${files.length} old backups from Google Drive...`);
            for (const file of files) {
                await drive.files.delete({ 
                    fileId: file.id,
                    supportsAllDrives: true 
                });
                console.log(`Deleted old backup: ${file.name}`);
            }
        }
    } catch (error) {
        console.error('❌ Google Drive cleanup failed:', error.message);
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
        console.error('❌ Google Drive list failed:', error.message);
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
        console.error('❌ Google Drive download failed:', error.message);
        throw error;
    }
}

module.exports = { uploadFile, cleanupOldBackups, listBackups, downloadFile };
