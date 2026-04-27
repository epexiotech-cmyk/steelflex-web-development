/**
 * SteelFlex Shared Components Loader
 * Loads navbar and footer into placeholders and initializes interactions.
 */

document.addEventListener('DOMContentLoaded', () => {
    console.log("COMPONENTS LOADED");
    
    const navbar = document.getElementById("navbar");
    const footer = document.getElementById("footer");

    if (navbar) {
        try {
            navbar.innerHTML = `
<header class="main-header">
    <div class="container nav-container">
        <div class="logo">
            <a href="/">
                <img loading="lazy" src="/assets/Logo/Steelflex Logo.png" alt="SteelFlex" class="logo-img">
            </a>
        </div>
        <button class="mobile-menu-btn" aria-label="Toggle Menu">☰</button>
        <nav class="main-nav">
            <ul>
                <li><a href="/about-us">About Us</a></li>
                <li><a href="/products-structures">Products & Structures</a></li>
                <li><a href="/capabilities">Capabilities</a></li>
                <li><a href="/machineries">Machineries</a></li>
                <li><a href="/projects">Projects</a></li>
                <li><a href="/careers">Careers</a></li>
                <li><a href="/contact-us">Contact</a></li>
            </ul>
        </nav>
    </div>
</header>`;
            initNavbar();
        } catch (e) {
            console.log("Navbar error:", e);
        }
    }

    if (footer) {
        try {
            footer.innerHTML = `
<footer class="site-footer-redesign">
    <div class="footer-cta-bridge">
        <div class="container reveal-on-scroll">
            <h2 class="footer-cta-title">Let’s build reliable engineering solutions together.</h2>
        </div>
    </div>
    <div class="footer-main">
        <div class="container">
            <div class="footer-grid-modern">
                <div class="footer-col">
                    <span class="footer-brand-title">
                        <a href="/">
                            <img loading="lazy" src="/assets/Logo/Steelflex Logo.png" alt="SteelFlex" style="height: 50px;">
                        </a>
                    </span>
                    <p class="footer-brand-statement">Trusted partner in heavy industrial engineering and turnkey steel construction solutions. <br /><strong>A Group Company of ISKO & SAMIRIKA</strong></p>
                </div>
                <div class="footer-col">
                    <h4 class="footer-col-title">Quick Links</h4>
                    <ul class="footer-links-list">
                        <li><a href="/">Home</a></li>
                        <li><a href="/about-us">About Us</a></li>
                        <li><a href="/products-structures">Products</a></li>
                        <li><a href="/capabilities">Capabilities</a></li>
                        <li><a href="/machineries">Machineries</a></li>
                        <li><a href="/projects">Projects</a></li>
                        <li><a href="/careers">Careers</a></li>
                        <li><a href="/contact-us">Contact Us</a></li>
                    </ul>
                </div>
                <div class="footer-col">
                    <h4 class="footer-col-title">Contact</h4>
                    <div class="footer-contact-item">
                        <span>📞 Phone</span>
                        <a href="tel:+919426443442" style="color: inherit; text-decoration: none;">+91 94264 43442</a><br />
                        <a href="tel:+918238999916" style="color: inherit; text-decoration: none;">+91 82389 99916</a>
                    </div>
                    <div class="footer-contact-item">
                        <span>📧 Email</span>
                        <a href="mailto:md@steelflexstructures.com" style="color: inherit; text-decoration: none;">md@steelflexstructures.com</a>
                    </div>
                    <div class="footer-contact-item">
                        <span>📍 Location</span>
                        <a href="https://maps.app.goo.gl/bfLVMmJv6tCNb2xcA" target="_blank" style="color: inherit; text-decoration: none;">Por, Vadodara, Gujarat</a>
                    </div>
                    <a href="/review" class="btn-footer-review">Add Review</a>
                </div>
            </div>
        </div>
    </div>
    <div class="footer-legal">
        <div class="container">
            <p class="copyright-text">&copy; 2026 <strong>SteelFlex Structures India Private Limited.</strong> All rights reserved. | Designed by <a href="https://www.epexio.in" target="_blank" style="color: #2F528F; text-decoration: none;">Epexio Techno Solutions</a></p>
        </div>
    </div>
</footer>`;
            initFooter();
        } catch (e) {
            console.log("Footer error:", e);
        }
    }
});

function initNavbar() {
    const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
    const mainNav = document.querySelector('.main-nav');
    
    if (mobileMenuBtn && mainNav) {
        mobileMenuBtn.addEventListener('click', () => {
            mainNav.classList.toggle('active');
        });
    }

    // Set active class based on current page
    const currentPath = window.location.pathname;
    const navLinks = document.querySelectorAll('.main-nav a');
    
    navLinks.forEach(link => {
        const href = link.getAttribute('href');
        // Check for exact match or clean URL match
        if (currentPath === href || 
            (currentPath === '/' && href === '/') || 
            (currentPath.startsWith(href) && href !== '/')) {
            link.classList.add('active');
        } else {
            link.classList.remove('active');
        }
    });

    // Handle smooth scroll for anchor links
    document.querySelectorAll('.main-nav a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            if (mainNav) mainNav.classList.remove('active');

            const targetId = this.getAttribute('href');
            if (targetId && targetId !== '#') {
                const targetElement = document.querySelector(targetId);
                if (targetElement) {
                    targetElement.scrollIntoView({ behavior: 'smooth' });
                }
            }
        });
    });
}

function initFooter() {
    const currentPath = window.location.pathname;
    const footerLinks = document.querySelectorAll('.footer-links-list a');
    
    footerLinks.forEach(link => {
        const href = link.getAttribute('href');
        if (currentPath === href || (currentPath === '/' && href === '/')) {
            link.classList.add('active');
        }
    });

    if (window.ScrollTrigger) {
        ScrollTrigger.refresh();
    }
}
