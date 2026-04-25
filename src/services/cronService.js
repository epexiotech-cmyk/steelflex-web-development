const cron = require('node-cron');
const path = require('path');
const fs = require('fs');
const { createBackupZip } = require('../utils/backupUtil');
const { uploadFile, cleanupOldBackups } = require('./googleDriveService');

function initCron() {
    // Run backup every night at midnight
    cron.schedule('0 0 * * *', async () => {
        console.log('⏰ Starting scheduled Google Drive backup...');
        await performCloudBackup();
    });

    console.log('📅 Backup scheduler initialized (Daily at Midnight)');
}

async function performCloudBackup() {
    const tempBackupPath = path.join(__dirname, '..', '..', 'backups', `auto-backup-${Date.now()}.zip`);
    const fileName = `steelflex-auto-backup-${new Date().toISOString().split('T')[0]}.zip`;

    try {
        // 1. Ensure backups folder exists
        const backupsDir = path.join(__dirname, '..', '..', 'backups');
        if (!fs.existsSync(backupsDir)) fs.mkdirSync(backupsDir);

        // 2. Create the ZIP file
        console.log('Creating ZIP archive...');
        await createBackupZip(tempBackupPath);

        // 3. Upload to Google Drive
        console.log('Uploading to Google Drive...');
        await uploadFile(tempBackupPath, fileName);

        // 4. Cleanup local temp ZIP
        if (fs.existsSync(tempBackupPath)) fs.unlinkSync(tempBackupPath);

        // 5. Cleanup old backups on Google Drive (keep last 30 days)
        await cleanupOldBackups(30);

        console.log('✨ Cloud backup process completed successfully.');
        return { success: true, fileName };
    } catch (error) {
        console.error('❌ Scheduled backup failed:', error.message);
        // Ensure cleanup if failed
        if (fs.existsSync(tempBackupPath)) fs.unlinkSync(tempBackupPath);
        return { success: false, error: error.message };
    }
}

module.exports = { initCron, performCloudBackup };
