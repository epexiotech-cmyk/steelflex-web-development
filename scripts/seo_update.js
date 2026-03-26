const fs = require('fs');
const path = require('path');

const websiteDir = path.join(__dirname, '../src/website');

function updateSEO() {
    const files = fs.readdirSync(websiteDir).filter(f => f.endsWith('.html'));

    files.forEach(file => {
        const filePath = path.join(websiteDir, file);
        let content = fs.readFileSync(filePath, 'utf8');

        // 1. Clean URLs: replace href="page.html" with href="/page" or href="/" if index.html
        // We will match href="<something>.html"
        // Except for external links or things not matching our pages.
        const pages = [
            'about-us', 'capabilities', 'careers', 'contact-us', 
            'machineries', 'products-structures', 'projects', 'project-detail', 'review'
        ];
        
        // Replace index.html with /
        content = content.replace(/href="index\.html"/g, 'href="/"');
        content = content.replace(/href=["']?\/index\.html["']?/g, 'href="/"');
        
        pages.forEach(page => {
            const pageRegex = new RegExp(`href="${page}\\.html"`, 'g');
            content = content.replace(pageRegex, `href="/${page}"`);

            // Some places might have /page.html
            const pageRegexSlash = new RegExp(`href="/${page}\\.html"`, 'g');
            content = content.replace(pageRegexSlash, `href="/${page}"`);
        });

        // 2. Add lazy loading to images and fix logo path
        // Fix logo path first to ensure it starts with /
        content = content.replace(/src="Logo\/Steelflex Logo\.png"/g, 'src="/Logo/Steelflex Logo.png"');
        
        // Simply replace <img with <img loading="lazy" if it doesn't already have it
        content = content.replace(/<img(?![^>]*loading=)/gi, '<img loading="lazy"');
        
        // Ensure defer on scripts (except JSON-LD or important ones)
        // We will just replace script src without defer
        content = content.replace(/<script src="([^"]+)"(?![^>]*defer)(?![^>]*type="module")>/g, '<script src="$1" defer>');

        // 3. Improve the <head> if it's not index.html (index already done manually)
        if (file !== 'index.html') {
            const pageName = file.replace('.html', '').split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
            
            const metaTags = `
    <meta name="robots" content="index, follow" />
    <link rel="canonical" href="https://steelflexstructures.com/${file.replace('.html', '')}" />
    <meta property="og:title" content="SteelFlex Structures | ${pageName}" />
    <meta property="og:description" content="Learn more about ${pageName} at SteelFlex Structures, providing end-to-end Pre-Engineered Building (PEB) solutions in Gujarat, India." />
    <meta property="og:image" content="https://steelflexstructures.com/Logo/Steelflex Logo.png" />
    <meta property="og:url" content="https://steelflexstructures.com/${file.replace('.html', '')}" />
    <meta property="og:type" content="website" />
    <meta name="twitter:card" content="summary_large_image" />
    <link rel="icon" type="image/png" href="/Logo/Steelflex Logo.png" />
`;

            // Inject if not already there
            if (!content.includes('og:title')) {
                // inject before </head>
                content = content.replace('</head>', metaTags + '</head>');
            }
            
            // Also update <title> to be more SEO friendly
            content = content.replace(/<title>.*<\/title>/, `<title>${pageName} | SteelFlex Structures | Premier PEB Manufacturer in India</title>`);
            
            // Also ensure description exists
            if (!content.includes('meta name="description"')) {
                content = content.replace('</title>', `</title>\n    <meta name="description" content="Discover ${pageName} from SteelFlex Structures. We are a premier manufacturer of Pre-Engineered Buildings (PEB) in India." />`);
            }
        } else {
            // For index.html, we just need to ensure /Logo/... works
            content = content.replace('href="Logo/Steelflex Logo.png"', 'href="/Logo/Steelflex Logo.png"');
            content = content.replace('src="Logo/Steelflex Logo.png"', 'src="/Logo/Steelflex Logo.png"');
        }

        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`Optimized ${file}`);
    });
}

updateSEO();
