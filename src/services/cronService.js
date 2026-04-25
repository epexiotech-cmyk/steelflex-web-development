const cron = require('node-cron');
const path = require('path');
const fs = require('fs');
const { createBackupZip } = require('../utils/backupUtil');
const { uploadFile, cleanupOldBackups } = require('./googleDriveService');
const { logBackup } = require('./backupLogService');

function initCron() {
    // Run backup every night at midnight
    cron.schedule('0 0 * * *', async () => {
        console.log('⏰ Starting scheduled Google Drive backup...');
        await performCloudBackupWithRetry(3);
    });

    console.log('📅 Backup scheduler initialized (Daily at Midnight)');
}

function getBackupFileName() {
    const now = new Date();
    const pad = (num) => String(num).padStart(2, '0');
    const yyyy = now.getFullYear();
    const mm = pad(now.getMonth() + 1);
    const dd = pad(now.getDate());
    const hh = pad(now.getHours());
    const min = pad(now.getMinutes());
    return `backup-${yyyy}-${mm}-${dd}-${hh}-${min}.zip`;
}

async function performCloudBackupWithRetry(maxAttempts = 3) {
    let lastError = null;
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
            console.log(`🚀 Backup attempt ${attempt}/${maxAttempts}...`);
            const result = await performCloudBackup();
            
            // Log success
            await logBackup({
                status: 'success',
                fileName: result.fileName,
                fileSize: result.fileSize,
                attempts: attempt,
                message: 'Backup completed successfully'
            });
            
            return { success: true, ...result };
        } catch (error) {
            lastError = error;
            console.error(`❌ Attempt ${attempt} failed: ${error.message}`);
            
            if (attempt < maxAttempts) {
                const delay = 5000 * attempt; // Simple backoff
                console.log(`Waiting ${delay / 1000}s before next attempt...`);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
    }

    // If all attempts fail
    await logBackup({
        status: 'fail',
        error: lastError.message,
        attempts: maxAttempts,
        message: 'All backup attempts failed'
    });

    return { success: false, error: lastError.message };
}

async function performCloudBackup() {
    const fileName = getBackupFileName();
    const backupsDir = path.join(__dirname, '..', '..', 'backups');
    const tempBackupPath = path.join(backupsDir, `temp-${Date.now()}.zip`);

    try {
        // 1. Ensure backups folder exists
        if (!fs.existsSync(backupsDir)) fs.mkdirSync(backupsDir, { recursive: true });

        // 2. Create the ZIP file
        console.log('Creating ZIP archive...');
        await createBackupZip(tempBackupPath);

        // 3. Upload to Google Drive (now returns {id, size, name})
        console.log('Uploading to Google Drive...');
        const uploadResult = await uploadFile(tempBackupPath, fileName);

        // 4. Cleanup local temp ZIP
        if (fs.existsSync(tempBackupPath)) fs.unlinkSync(tempBackupPath);

        // 5. Cleanup old backups on Google Drive (keep last 30 days)
        console.log('Running cleanup for old backups...');
        await cleanupOldBackups(30);

        console.log('✨ Cloud backup process completed successfully.');
        return { 
            success: true, 
            fileName: uploadResult.name, 
            fileSize: uploadResult.size 
        };
    } catch (error) {
        // Ensure cleanup if failed
        if (fs.existsSync(tempBackupPath)) fs.unlinkSync(tempBackupPath);
        throw error;
    }
}

module.exports = { initCron, performCloudBackup: performCloudBackupWithRetry };
