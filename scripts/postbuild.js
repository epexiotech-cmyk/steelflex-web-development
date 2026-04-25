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

// 1. Move website files to root
if (fs.existsSync(websiteDir)) {
    console.log('Flattening website dist...');
    const files = fs.readdirSync(websiteDir);
    for (const file of files) {
        const oldPath = path.join(websiteDir, file);
        const newPath = path.join(distDir, file);
        if (fs.lstatSync(oldPath).isDirectory()) {
            copyRecursiveSync(oldPath, newPath);
        } else {
            fs.renameSync(oldPath, newPath);
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
