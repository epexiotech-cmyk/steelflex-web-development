const fs = require('fs');
const path = require('path');

const dataDir = path.join(__dirname, '..', 'public', 'data');
const uploadsDir = path.join(__dirname, '..', 'uploads');
const publicUploadsDir = path.join(__dirname, '..', 'public', 'uploads');

const filesToClear = [
    'careers.json',
    'contact_queries.json',
    'projects.json',
    'reviews.json',
    'vacancies.json'
];

const foldersToClear = [
    path.join(publicUploadsDir, 'projects'),
    path.join(publicUploadsDir, 'cvs'),
    path.join(publicUploadsDir, 'reviews'),
    path.join(uploadsDir, 'optimized'),
    path.join(uploadsDir, 'thumbs')
];

console.log('Cleaning data for testing...');

// Clear JSON files
filesToClear.forEach(file => {
    const filePath = path.join(dataDir, file);
    if (fs.existsSync(filePath)) {
        fs.writeFileSync(filePath, '[]');
        console.log(`Cleared ${file}`);
    }
});

// Clear Upload Folders
foldersToClear.forEach(dir => {
    if (fs.existsSync(dir)) {
        const files = fs.readdirSync(dir);
        files.forEach(file => {
            const filePath = path.join(dir, file);
            if (fs.lstatSync(filePath).isFile()) {
                fs.unlinkSync(filePath);
            }
        });
        console.log(`Cleared folder ${dir}`);
    }
});

console.log('Done! Admin panel data has been wiped (except users).');
