const fs = require('fs');
const path = require('path');

const webPagesDir = path.join(__dirname, '..', 'src', 'website');
const files = fs.readdirSync(webPagesDir).filter(f => f.endsWith('.html'));

const navbarPlaceholder = '    <!-- Header Placeholder -->\n    <div id="navbar-placeholder"></div>';
const footerPlaceholder = '    <!-- Footer Placeholder -->\n    <div id="footer-placeholder"></div>';

const cssLink = '    <link rel="stylesheet" href="components/components.css">';
const jsLink = '    <script src="components/components.js" defer></script>';

files.forEach(file => {
    const filePath = path.join(webPagesDir, file);
    let content = fs.readFileSync(filePath, 'utf8');

    console.log(`Processing ${file}...`);

    // 1. Inject CSS/JS in Head
    if (!content.includes('components/components.css')) {
        content = content.replace('</head>', `${cssLink}\n${jsLink}\n</head>`);
    }

    // 2. Replace Header
    const headerRegex = /<header class="main-header">[\s\S]*?<\/header>/;
    content = content.replace(headerRegex, navbarPlaceholder);

    // 3. Replace Footer
    const footerRegex = /<footer class="site-footer-redesign">[\s\S]*?<\/footer>/;
    content = content.replace(footerRegex, footerPlaceholder);

    // 4. Remove Mobile Menu Script
    const scriptRegex = /<script>\s*document\.querySelector\('\.mobile-menu-btn'\)[\s\S]*?<\/script>/g;
    content = content.replace(scriptRegex, '');

    // 5. Cleanup redundant active classes (if any left in other pages)
    // Actually, since they are replaced by placeholders, we don't need to worry about the content inside them.

    fs.writeFileSync(filePath, content);
    console.log(`Updated ${file}`);
});
