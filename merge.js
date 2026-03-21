const fs = require('fs');

const indexCss = fs.readFileSync('src/website/indexStyle.css', 'utf8');
let stylesCss = fs.readFileSync('src/website/styles.css', 'utf8');

// We want to extract sections starting from .hero, skipping the generic top stuff.
// The file is 804 lines long. Let's find the index of "/* Hero Section */" or ".hero {"
const heroStartIndex = indexCss.indexOf('/* Hero Section */');
const footerStartIndex = indexCss.indexOf('/* Footer */');

if (heroStartIndex !== -1) {
    let specificCss = indexCss.substring(heroStartIndex, footerStartIndex);
    
    // Also remove any desktop media queries that affect .nav-links or generic layout
    // The media queries are at the very end, we might need some of them (like for .services-grid).
    // Let's just grab the whole thing from hero to end, but filter out .navbar and .footer stuff.
    
    let endCss = indexCss.substring(footerStartIndex);
    // remove .footer, .footer-logo
    endCss = endCss.replace(/\.footer \{[\s\S]*?\}/g, '');
    endCss = endCss.replace(/\.footer-logo \{[\s\S]*?\}/g, '');
    
    // In media query, remove .nav-links, .logo, .mobile-toggle
    endCss = endCss.replace(/\.mobile-toggle \{[\s\S]*?\}/g, '');
    endCss = endCss.replace(/\.nav-links \{[\s\S]*?\}/g, '');
    endCss = endCss.replace(/\.nav-links li \{[\s\S]*?\}/g, '');
    endCss = endCss.replace(/\.nav-links a \{[\s\S]*?\}/g, '');
    endCss = endCss.replace(/\/\* Desktop Logo Size \*\/[\s\S]*?\.logo img \{[\s\S]*?\}/g, '');
    endCss = endCss.replace(/\/\* Footer Side-by-Side \*\/[\s\S]*?\.footer-content \{[\s\S]*?\}/g, '');
    
    // Append to styles.css
    stylesCss += "\n\n/* --- MERGED FROM INDEXSTYLE.CSS --- */\n" + specificCss + endCss;
    
    fs.writeFileSync('src/website/styles.css', stylesCss);
    console.log("Successfully merged CSS!");
} else {
    console.log("Could not find Hero section marker");
}
