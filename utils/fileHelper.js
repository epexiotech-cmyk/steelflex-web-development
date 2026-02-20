const path = require('path');
const fs = require('fs-extra');

/**
 * Format file path relative to the public directory
 * @param {Object} file - The file object from multer
 * @param {string} folder - The subfolder in uploads (e.g., 'reviews', 'projects')
 * @returns {string|null} - The formatted path or null
 */
const formatFilePath = (file, folder = '') => {
    if (!file) return null;
    const separator = folder ? '/' + folder + '/' : '/';
    return '/uploads' + separator + file.filename;
};

/**
 * Delete a local file based on its path relative to the public directory
 * @param {string} filePath - the path to delete, e.g. /uploads/reviews/filename.jpg
 */
const deleteLocalFile = async (filePath) => {
    if (!filePath) return;
    const fullPath = path.join(__dirname, '../public', filePath);
    try {
        if (await fs.pathExists(fullPath)) {
            await fs.unlink(fullPath);
        }
    } catch (e) {
        console.error('Failed to delete file:', fullPath, e);
    }
};

module.exports = {
    formatFilePath,
    deleteLocalFile
};
