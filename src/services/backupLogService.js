const fs = require('fs');
const path = require('path');

const LOG_FILE = path.join(__dirname, '..', '..', 'public', 'data', 'backup_logs.json');

function ensureLogFile() {
    const dir = path.dirname(LOG_FILE);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
    if (!fs.existsSync(LOG_FILE)) {
        fs.writeFileSync(LOG_FILE, JSON.stringify([], null, 2));
    }
}

async function logBackup(entry) {
    try {
        ensureLogFile();
        const logs = JSON.parse(fs.readFileSync(LOG_FILE, 'utf8') || '[]');
        
        const newEntry = {
            id: Date.now().toString(),
            date: new Date().toISOString(),
            status: entry.status, // 'success' or 'fail'
            fileName: entry.fileName || 'N/A',
            fileSize: entry.fileSize || 0,
            message: entry.message || '',
            attempts: entry.attempts || 1,
            error: entry.error || null
        };

        logs.unshift(newEntry);
        
        // Keep only last 100 logs
        const trimmedLogs = logs.slice(0, 100);
        
        fs.writeFileSync(LOG_FILE, JSON.stringify(trimmedLogs, null, 2));
        return newEntry;
    } catch (err) {
        console.error('Failed to write backup log:', err);
    }
}

function getLatestStatus() {
    try {
        ensureLogFile();
        const logs = JSON.parse(fs.readFileSync(LOG_FILE, 'utf8') || '[]');
        return logs.length > 0 ? logs[0] : null;
    } catch (err) {
        return null;
    }
}

module.exports = { logBackup, getLatestStatus };
