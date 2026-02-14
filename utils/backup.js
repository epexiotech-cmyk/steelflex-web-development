const fs = require('fs-extra');
const path = require('path');

const backupData = async () => {
    try {
        const dataDir = path.join(__dirname, '../data');
        const backupDir = path.join(__dirname, '../backups');

        // Create timestamped folder
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const targetDir = path.join(backupDir, timestamp);

        await fs.ensureDir(targetDir);
        await fs.copy(dataDir, targetDir);

        console.log(`Data backed up to ${targetDir}`);

        // Cleanup old backups (keep last 5)
        const backups = await fs.readdir(backupDir);
        if (backups.length > 5) {
            backups.sort(); // Oldest first
            const toDelete = backups.slice(0, backups.length - 5);
            for (const folder of toDelete) {
                await fs.remove(path.join(backupDir, folder));
                console.log(`Removed old backup: ${folder}`);
            }
        }

    } catch (error) {
        console.error('Backup failed:', error);
    }
};

module.exports = backupData;
