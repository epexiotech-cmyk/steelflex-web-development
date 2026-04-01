const fs = require('fs');
const path = require('path');

const distDir = path.join(__dirname, '..', 'dist');
const websiteDir = path.join(distDir, 'src', 'website');
const adminDir = path.join(distDir, 'src', 'admin');
const newAdminDir = path.join(distDir, 'admin');

// 1. Ensure admin destination exists
if (!fs.existsSync(newAdminDir)) {
    fs.mkdirSync(newAdminDir, { recursive: true });
}

// 2. Move admin index.html
const adminOldPath = path.join(adminDir, 'index.html');
const adminNewPath = path.join(newAdminDir, 'index.html');
if (fs.existsSync(adminOldPath)) {
    fs.renameSync(adminOldPath, adminNewPath);
}

// 3. Move all website fles to root of dist
if (fs.existsSync(websiteDir)) {
    const websiteFiles = fs.readdirSync(websiteDir);
    for (const file of websiteFiles) {
        fs.renameSync(path.join(websiteDir, file), path.join(distDir, file));
    }
}

// 4. Update anchor hrefs in all HTML files in dist
const base = '/steelflex-web-development/';

function processDir(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const filePath = path.join(dir, file);
        if (fs.statSync(filePath).isDirectory()) {
            processDir(filePath);
        } else if (file.endsWith('.html')) {
            let content = fs.readFileSync(filePath, 'utf-8');
            
            // Replace <a href="/something"> with <a href="/steelflex-web-development/something">
            content = content.replace(/href="\/([^"]*)"/g, (match, p1) => {
                if (p1.startsWith('steelflex-web-development') || p1.startsWith('http')) return match;
                if (p1 === '') return `href="${base}"`;
                return `href="${base}${p1}"`;
            });
            
            fs.writeFileSync(filePath, content);
        }
    }
}

processDir(distDir);

console.log('Post-build optimizations complete.');
