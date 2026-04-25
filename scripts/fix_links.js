const fs = require('fs');
const path = require('path');

const websiteDir = path.join(__dirname, '../src/website');
const files = [
    'index.html',
    'about-us.html',
    'products-structures.html',
    'projects.html',
    'contact-us.html',
    'capabilities.html',
    'machineries.html',
    'review.html',
    'careers.html',
    '404.html'
];

files.forEach(file => {
    const filePath = path.join(websiteDir, file);
    if (!fs.existsSync(filePath)) return;

    let content = fs.readFileSync(filePath, 'utf8');

    // Fix /Logo/ to /assets/Logo/
    content = content.replace(/\/Logo\//g, '/assets/Logo/');
    
    // Fix Logo/ to /assets/Logo/
    content = content.replace(/([^/])Logo\//g, '$1/assets/Logo/');

    fs.writeFileSync(filePath, content);
    console.log(`Fixed Logo paths in ${file}`);
});
