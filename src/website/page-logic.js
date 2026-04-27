/**
 * SteelFlex Website - Page Specific Logic
 * Extracted from inline scripts to support clean Vite bundling.
 */

// --- HOME PAGE (index.html) ---

export function initHomePage() {
    function initPebMobile() {
        if (window.innerWidth > 768) return;

        document.querySelectorAll('.peb-step').forEach(function (step) {
            var imgSrc = step.getAttribute('data-img');
            if (!imgSrc) return;

            if (step.querySelector('.peb-mobile-img')) return;

            var img = document.createElement('img');
            img.src = imgSrc;
            img.alt = step.querySelector('h2') ? step.querySelector('h2').textContent.trim() : 'PEB';
            img.className = 'peb-mobile-img';
            img.loading = 'lazy';
            step.insertBefore(img, step.firstChild);

            var contentDiv = document.createElement('div');
            contentDiv.className = 'peb-step-content';
            Array.from(step.childNodes).forEach(function (child) {
                if (child !== img) contentDiv.appendChild(child);
            });
            step.appendChild(contentDiv);
        });
    }

    initPebMobile();
    window.addEventListener('resize', initPebMobile);

    if (window.loadProjects) {
        window.loadProjects('Completed', 'home-completed-projects', 3);
    }

    const initReviews = async () => {
        const track = document.getElementById('reviews-track');
        const dotsContainer = document.getElementById('reviews-dots');
        if (track && window.StorageManager) {
            try {
                const allReviews = await StorageManager.getData('reviews');
                const reviews = allReviews.filter(r => ['approved', 'active', 'accepted'].includes((r.status || '').toLowerCase()));

                if (reviews.length === 0) {
                    const reviewsSection = document.getElementById('reviews');
                    if (reviewsSection) reviewsSection.style.display = 'none';
                    return;
                }

                track.innerHTML = '';
                dotsContainer.innerHTML = '';
                track.style.display = 'grid';
                track.style.placeItems = 'center';

                const themes = [
                    { main: '#ED3A53', dark: '#C4243A', light: 'rgba(237, 58, 83, 0.3)' },
                    { main: '#23BFA3', dark: '#19947D', light: 'rgba(35, 191, 163, 0.3)' },
                    { main: '#B2319A', dark: '#8C2378', light: 'rgba(178, 49, 154, 0.3)' }
                ];

                reviews.forEach((review, index) => {
                    let ratingValue = parseInt(review.rating) || 5;
                    let starsHtml = '';
                    for (let i = 0; i < 5; i++) {
                        starsHtml += i < ratingValue ? '★' : '<span style="color:#eee">★</span>';
                    }

                    const theme = themes[index % themes.length];
                    const dateStr = review.createdAt ? new Date(review.createdAt).toLocaleDateString() : 'N/A';
                    const companyLogo = review.companyLogo || 'https://via.placeholder.com/80?text=No+Logo';
                    const reviewerPhoto = review.reviewerPhoto ? review.reviewerPhoto : 'https://via.placeholder.com/80?text=No+Photo';

                    const slideWrapper = document.createElement('div');
                    slideWrapper.style.cssText = 'grid-area: 1 / 1; width: 100%; max-width: 480px; box-sizing: border-box; padding: 0 15px; cursor: pointer;';
                    slideWrapper.onclick = () => window.goToReviewSlide(index);

                    let reviewText = review.reviewText || '';
                    if (reviewText.length > 200) reviewText = reviewText.substring(0, 197) + '...';

                    slideWrapper.innerHTML = `
                        <div class="review-creative-card" style="--theme-main: ${theme.main}; --theme-dark: ${theme.dark}; --theme-light: ${theme.light}; margin-bottom: 20px;">
                            <div class="creative-tr-ribbon"></div>
                            <div class="creative-tr-fold"></div>
                            <div class="creative-bl-ribbon"></div>
                            <div class="creative-bl-fold"></div>
                            <div class="creative-white-box">
                                <div class="creative-quote-icon">“</div>
                                <div class="creative-quote-bg">”</div>
                                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; position: relative; z-index: 8;">
                                    <div style="font-size: 0.85rem; color: #888; font-weight: 500;">
                                        Date: <span style="color: #444;">${dateStr}</span>
                                    </div>
                                    <div style="display: flex; align-items: center; gap: 8px;">
                                        <span style="font-size: 0.75rem; color: #aaa;">Company Logo</span>
                                        <img loading="lazy" src="${companyLogo}" title="Company Logo" alt="Company Logo" style="height: 40px; width: 40px; border-radius: 50%; object-fit: contain; border: 1px solid #ddd; background: #fff; padding: 2px;">
                                    </div>
                                </div>
                                <p class="creative-text">${reviewText}</p>
                                <div class="creative-stars" style="text-align: center; margin-top: 15px;">${starsHtml}</div>
                            </div>
                            <div class="creative-client-container">
                                <img loading="lazy" src="${reviewerPhoto}" class="creative-client-photo" alt="Client">
                                <div class="creative-client-info">
                                    <h4 class="creative-client-name">${review.clientName}</h4>
                                    <p class="creative-client-desig">${review.companyName}</p>
                                </div>
                            </div>
                        </div>
                    `;
                    track.appendChild(slideWrapper);

                    const dot = document.createElement('button');
                    dot.style.cssText = `width: 10px; height: 10px; border-radius: 50%; border: none; background: ${index === 0 ? '#2F528F' : '#ccc'}; cursor: pointer; transition: all 0.3s; padding: 0; outline: none;`;
                    dot.onclick = () => window.goToReviewSlide(index);
                    dotsContainer.appendChild(dot);
                });

                let currentIndex = 0;
                const totalSlides = reviews.length;

                window.goToReviewSlide = function (index) {
                    currentIndex = index;
                    const slides = Array.from(track.children);
                    if (!slides.length) return;
                    const isMobile = window.innerWidth <= 768;
                    const xOffset = isMobile ? 100 : 70;

                    slides.forEach((slide, i) => {
                        let diff = i - currentIndex;
                        if (diff < -totalSlides / 2) diff += totalSlides;
                        if (diff > totalSlides / 2) diff -= totalSlides;
                        if (totalSlides % 2 === 0 && diff === totalSlides / 2) diff = -totalSlides / 2;

                        slide.style.transition = 'all 0.6s cubic-bezier(0.25, 1, 0.5, 1)';

                        if (diff === 0) {
                            slide.style.transform = 'translateX(0) scale(1)';
                            slide.style.opacity = '1';
                            slide.style.zIndex = '5';
                            slide.style.pointerEvents = 'auto';
                            slide.style.filter = 'blur(0px)';
                        } else if (diff === -1 || (diff < 0 && totalSlides === 2)) {
                            slide.style.transform = `translateX(-${xOffset}%) scale(0.7)`;
                            slide.style.opacity = isMobile ? '0' : '0.6';
                            slide.style.zIndex = '4';
                            slide.style.pointerEvents = 'auto';
                            slide.style.filter = isMobile ? 'blur(0px)' : 'blur(1.5px)';
                        } else if (diff === 1 || (diff > 0 && totalSlides === 2)) {
                            slide.style.transform = `translateX(${xOffset}%) scale(0.7)`;
                            slide.style.opacity = isMobile ? '0' : '0.6';
                            slide.style.zIndex = '4';
                            slide.style.pointerEvents = 'auto';
                            slide.style.filter = isMobile ? 'blur(0px)' : 'blur(1.5px)';
                        } else {
                            slide.style.transform = `translateX(${diff > 0 ? (xOffset + 30) : -(xOffset + 30)}%) scale(0.5)`;
                            slide.style.opacity = '0';
                            slide.style.zIndex = '1';
                            slide.style.pointerEvents = 'none';
                            slide.style.filter = 'blur(4px)';
                        }
                    });

                    Array.from(dotsContainer.children).forEach((dot, i) => {
                        dot.style.background = i === currentIndex ? '#2F528F' : '#ccc';
                        dot.style.transform = i === currentIndex ? 'scale(1.2)' : 'scale(1)';
                    });
                };

                window.goToReviewSlide(0);
                window.addEventListener('resize', () => window.goToReviewSlide(currentIndex));

                if (totalSlides > 1) {
                    let autoPlay = setInterval(() => { window.goToReviewSlide((currentIndex + 1) % totalSlides); }, 6000);
                    track.addEventListener('mouseenter', () => clearInterval(autoPlay));
                    track.addEventListener('mouseleave', () => {
                        autoPlay = setInterval(() => { window.goToReviewSlide((currentIndex + 1) % totalSlides); }, 6000);
                    });
                }

            } catch (err) {
                console.error('Error loading reviews:', err);
                if (track) track.innerHTML = '<div style="width: 100%; flex-shrink: 0; padding: 20px; color: red;">Failed to load reviews.</div>';
            }
        }
    };
    initReviews();
}

// --- ABOUT US PAGE (about-us.html) ---

export function initAboutPage() {
    const initDepthCarousel = () => {
        const container = document.getElementById('heroCarousel');
        if (!container) return;
        const images = Array.from(container.querySelectorAll('.collage-img'));
        if (images.length === 0) return;

        const classes = ['img-main', 'img-small-1', 'img-small-2', 'img-out', 'img-out', 'img-out'];

        function rotateCarousel() {
            const lastClass = classes.pop();
            classes.unshift(lastClass);
            images.forEach((img, i) => {
                img.className = 'collage-img ' + classes[i];
            });
        }
        setInterval(rotateCarousel, 4000);
    };

    const initArcInteraction = () => {
        const centerTitle = document.getElementById('arcCenterTitle');
        const centerDesc = document.getElementById('arcCenterDesc');
        const centerImg = document.getElementById('arcCenterImg');
        const arcItems = document.querySelectorAll('.arc-item');
        if (!centerTitle || !arcItems.length) return;

        const defaultTitle = centerTitle.innerText;
        const defaultDesc = centerDesc.innerText;
        const defaultImgSrc = centerImg.src;

        function updateCenter(title, desc, imgSrc) {
            if (window.innerWidth < 900) return;
            centerTitle.style.opacity = '0';
            centerDesc.style.opacity = '0';
            centerImg.style.opacity = '0';

            setTimeout(() => {
                centerTitle.innerText = title;
                centerDesc.innerText = desc;
                centerImg.src = imgSrc;
                centerTitle.style.opacity = '1';
                centerDesc.style.opacity = '1';
                centerImg.style.opacity = '1';
            }, 300);
        }

        arcItems.forEach(item => {
            item.addEventListener('mouseenter', () => {
                const num = item.querySelector('.arc-num') ? item.querySelector('.arc-num').innerText : '';
                const label = item.querySelector('.arc-label') ? item.querySelector('.arc-label').innerText : '';
                const title = num + ' ' + label;
                const desc = item.querySelector('.arc-story') ? item.querySelector('.arc-story').innerText : '';
                const img = item.getAttribute('data-img');
                updateCenter(title, desc, img);
            });
            item.addEventListener('mouseleave', () => {
                updateCenter(defaultTitle, defaultDesc, defaultImgSrc);
            });
        });
    };

    initDepthCarousel();
    initArcInteraction();
}

// --- CAREERS PAGE (careers.html) ---

export function initCareersPage() {
    const fileInput = document.getElementById('cv');
    const fileNameDisplay = document.getElementById('fileName');
    const uploadBox = document.getElementById('uploadBox');
    const uploadText = document.getElementById('uploadText');

    if (fileInput) {
        fileInput.addEventListener('change', function () {
            if (this.files && this.files.length > 0) {
                const name = this.files[0].name;
                if (fileNameDisplay) fileNameDisplay.textContent = "Selected: " + name;
                if (uploadText) uploadText.textContent = "File attachment ready";
                if (uploadBox) {
                    uploadBox.style.borderColor = "var(--primary-color)";
                    uploadBox.style.background = "rgba(38, 71, 150, 0.05)";
                }
            }
        });
    }

    window.applyForRole = function (roleValue) {
        const selectBox = document.getElementById('position');
        const formSection = document.querySelector('.application-section');
        if (selectBox) selectBox.value = roleValue;
        if (formSection) formSection.scrollIntoView({ behavior: 'smooth' });
    };
}

// --- CONTACT PAGE (contact-us.html) ---

export function initContactPage() {
    const map = document.getElementById('contact-map');
    if (map) {
        const src = map.src;
        map.src = '';
        map.src = src;
    }
}

// --- PRODUCTS PAGE (products-structures.html) ---

export function initProductsPage() {
    window.switchView = function (viewId) {
        const buttons = document.querySelectorAll('.toggle-btn');
        buttons.forEach(btn => {
            // Keep compatibility with existing onclick logic if needed, 
            // but we use data attributes or text content as fallback
            const btnClick = btn.getAttribute('onclick');
            if (btnClick && btnClick.includes(viewId)) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });

        const views = document.querySelectorAll('.view-section');
        views.forEach(view => {
            if (view.id === viewId + '-view') {
                view.classList.add('active');
            } else {
                view.classList.remove('active');
            }
        });
    };
}

// --- PROJECTS PAGE (projects.html) ---

export function initProjectsPage() {
    // We use the switchTab and loadProjects defined in animations.js
    // Just trigger the initial load for Ongoing projects
    if (window.loadProjects) {
        window.loadProjects('Ongoing', 'ongoing-projects');
    }
}

// --- INITIALIZATION DISPATCHER ---

export function init() {
    const path = window.location.pathname;
    const isHome = path === '/' || path.endsWith('index.html') || path === '';
    
    if (isHome) initHomePage();
    if (path.includes('about-us')) initAboutPage();
    if (path.includes('careers')) initCareersPage();
    if (path.includes('contact-us')) initContactPage();
    if (path.includes('products-structures')) initProductsPage();
    if (path.includes('projects')) initProjectsPage();
}

// Automatically init on load
if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
}
