/**
 * SteelFlex Shared Components Loader
 * Loads navbar and footer into placeholders and initializes interactions.
 */

document.addEventListener('DOMContentLoaded', () => {
    // 1. Load Navbar
    const navbarPlaceholder = document.getElementById('navbar-placeholder');
    if (navbarPlaceholder) {
        fetch('components/navbar.html')
            .then(response => response.text())
            .then(data => {
                navbarPlaceholder.innerHTML = data;
                initNavbar();
            })
            .catch(err => console.error('Error loading navbar:', err));
    }

    // 2. Load Footer
    const footerPlaceholder = document.getElementById('footer-placeholder');
    if (footerPlaceholder) {
        fetch('components/footer.html')
            .then(response => response.text())
            .then(data => {
                footerPlaceholder.innerHTML = data;
                initFooter();
            })
            .catch(err => console.error('Error loading footer:', err));
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
        if (currentPath.endsWith(href) || (currentPath === '/' && href === 'index.html')) {
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
    // Any footer-specific initialization can go here
    // For example, setting the active link in the footer too
    const currentPath = window.location.pathname;
    const footerLinks = document.querySelectorAll('.footer-links-list a');
    
    footerLinks.forEach(link => {
        const href = link.getAttribute('href');
        if (currentPath.endsWith(href) || (currentPath === '/' && href === 'index.html')) {
            link.classList.add('active');
        }
    });

    // Initialize reveal-on-scroll for footer elements if not already handled by a global script
    if (window.initScrollReveal) {
        window.initScrollReveal();
    }
}
