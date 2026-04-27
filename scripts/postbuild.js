const fs = require('fs');
const path = require('path');

const distDir = path.join(__dirname, '..', 'dist');
const websiteDir = path.join(distDir, 'src', 'website');
const adminDir = path.join(distDir, 'src', 'admin');
const newAdminDir = path.join(distDir, 'admin');

function copyRecursiveSync(src, dest) {
    if (fs.existsSync(src)) {
        if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
        fs.readdirSync(src).forEach(file => {
            const srcPath = path.join(src, file);
            const destPath = path.join(dest, file);
            if (fs.lstatSync(srcPath).isDirectory()) {
                copyRecursiveSync(srcPath, destPath);
            } else {
                fs.copyFileSync(srcPath, destPath);
            }
        });
    }
}

function deleteRecursiveSync(dirPath) {
    if (fs.existsSync(dirPath)) {
        fs.readdirSync(dirPath).forEach((file) => {
            const curPath = path.join(dirPath, file);
            if (fs.lstatSync(curPath).isDirectory()) {
                deleteRecursiveSync(curPath);
            } else {
                fs.unlinkSync(curPath);
            }
        });
        fs.rmdirSync(dirPath);
    }
}

// 1. Move website files to root and create clean URL folders
if (fs.existsSync(websiteDir)) {
    console.log('Flattening website dist and building static clean URLs...');
    const files = fs.readdirSync(websiteDir);
    for (const file of files) {
        const oldPath = path.join(websiteDir, file);
        
        if (fs.lstatSync(oldPath).isDirectory()) {
            const newPath = path.join(distDir, file);
            copyRecursiveSync(oldPath, newPath);
        } else {
            // Create folder for clean URL if it's an HTML page (except index)
            if (file.endsWith('.html') && file !== 'index.html' && file !== '404.html') {
                const folderName = file.replace('.html', '');
                const folderPath = path.join(distDir, folderName);
                if (!fs.existsSync(folderPath)) fs.mkdirSync(folderPath, { recursive: true });
                
                const newPath = path.join(folderPath, 'index.html');
                fs.renameSync(oldPath, newPath);
            } else {
                const newPath = path.join(distDir, file);
                fs.renameSync(oldPath, newPath);
            }
        }
    }
}

// 2. Move admin files
if (fs.existsSync(adminDir)) {
    console.log('Moving admin files to /admin...');
    copyRecursiveSync(adminDir, newAdminDir);
}

// 3. Cleanup src
if (fs.existsSync(path.join(distDir, 'src'))) {
    console.log('Cleaning up src folder in dist...');
    deleteRecursiveSync(path.join(distDir, 'src'));
}

console.log('Post-build flattening complete.');
