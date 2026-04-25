const AdmZip = require('adm-zip');
const fs = require('fs');
const path = require('path');

async function createBackupZip(outputPath) {
    const zip = new AdmZip();
    const baseDir = path.join(__dirname, '..', '..');
    
    const dataDir = path.join(baseDir, 'public/data');
    const uploadsDir = path.join(baseDir, 'uploads');
    const publicUploadsDir = path.join(baseDir, 'public/uploads');

    // Add Data Folder
    if (fs.existsSync(dataDir)) {
        zip.addLocalFolder(dataDir, 'public/data');
    }

    // Add Processed Uploads (Optimized & Thumbs)
    const optimizedDir = path.join(uploadsDir, 'optimized');
    const thumbsDir = path.join(uploadsDir, 'thumbs');
    
    if (fs.existsSync(optimizedDir)) {
        zip.addLocalFolder(optimizedDir, 'uploads/optimized');
    }
    if (fs.existsSync(thumbsDir)) {
        zip.addLocalFolder(thumbsDir, 'uploads/thumbs');
    }
    
    // Add any files in root uploads (excluding folders like temp)
    if (fs.existsSync(uploadsDir)) {
        const files = fs.readdirSync(uploadsDir);
        files.forEach(file => {
            const filePath = path.join(uploadsDir, file);
            if (fs.lstatSync(filePath).isFile()) {
                zip.addLocalFile(filePath, 'uploads');
            }
        });
    }

    // Add Public Uploads Folder (Projects, Reviews, CVs)
    if (fs.existsSync(publicUploadsDir)) {
        zip.addLocalFolder(publicUploadsDir, 'public/uploads');
    }

    if (outputPath) {
        zip.writeZip(outputPath);
        return outputPath;
    } else {
        return zip.toBuffer();
    }
}

module.exports = { createBackupZip };
