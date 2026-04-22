const fs = require('fs');
const path = require('path');

const webDir = path.join(__dirname, '../src/website');
const files = fs.readdirSync(webDir).filter(f => f.endsWith('.html'));

files.forEach(file => {
    const filePath = path.join(webDir, file);
    let content = fs.readFileSync(filePath, 'utf8');

    // Remove the specific mobile menu toggle script block
    // Pattern 1: document.querySelector('.mobile-menu-btn')...
    const pattern1 = /<script>\s*\/\/ Mobile Menu Toggle\s*document\.querySelector\(['"]\.mobile-menu-btn['"]\)\.addEventListener\(['"]click['"],\s*function\s*\(\)\s*{\s*document\.querySelector\(['"]\.main-nav['"]\)\.classList\.toggle\(['"]active['"]\);\s*}\);\s*<\/script>/g;
    
    // Pattern 2: document.querySelector(".mobile-menu-btn")... (double quotes)
    const pattern2 = /<script>\s*document\.querySelector\(['"]\.mobile-menu-btn['"]\)\.addEventListener\(['"]click['"],\s*function\s*\(\)\s*{\s*document\.querySelector\(['"]\.main-nav['"]\)\.classList\.toggle\(['"]active['"]\);\s*}\);\s*<\/script>/g;

    // Pattern 3: Simple version without comments
    const pattern3 = /document\.querySelector\(['"]\.mobile-menu-btn['"]\)\.addEventListener\(['"]click['"],\s*function\s*\(\)\s*{\s*document\.querySelector\(['"]\.main-nav['"]\)\.classList\.toggle\(['"]active['"]\);\s*}\);/g;

    let newContent = content.replace(pattern1, '').replace(pattern2, '');
    
    // If it was inside a larger script block, replace pattern 3
    newContent = newContent.replace(pattern3, '');

    if (content !== newContent) {
        console.log(`Cleaned up redundant script in ${file}`);
        fs.writeFileSync(filePath, newContent);
    }
});
