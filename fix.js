const fs = require('fs');
const path = 'web_pages/review.html';
let content = fs.readFileSync(path, 'utf8');

// Find the first occurrence of </section> after the form, or the first <footer class="site-footer-redesign">
let footerIndex = content.indexOf('<footer class="site-footer-redesign">');
if (footerIndex > -1) {
    let topPart = content.substring(0, footerIndex);

    // Actually the footer is duplicated. We want the topPart plus exactly ONE footer, then the script.

    let footerHTML = `
    <footer class="site-footer-redesign">
        <div class="footer-main">
            <div class="container">
                <div class="footer-grid-modern">
                    <div class="footer-col">
                        <span class="footer-brand-title"><img src="Logo/Steelflex Logo.png" alt="SteelFlex" style="height: 50px;"></span>
                        <p class="footer-brand-statement">Trusted partner in heavy industrial engineering and turnkey steel construction solutions.</p>
                    </div>
                    <div class="footer-col">
                        <h4 class="footer-col-title">Quick Links</h4>
                        <ul class="footer-links-list">
                            <li><a href="about-us.html">About Us</a></li>
                            <li><a href="products-structures.html">Products</a></li>
                            <li><a href="capabilities.html">Capabilities</a></li>
                            <li><a href="machineries.html">Machineries</a></li>
                            <li><a href="projects.html">Projects</a></li>
                            <li><a href="careers.html">Careers</a></li>
                            <li><a href="contact-us.html">Contact Us</a></li>
                        </ul>
                    </div>
                    <div class="footer-col">
                        <h4 class="footer-col-title">Contact</h4>
                        <div class="footer-contact-item"><span>Phone</span> +91 94264 43442</div>
                        <div class="footer-contact-item"><span>Email</span> md@steelflexstructures.com</div>
                        <div class="footer-contact-item"><span>Location</span> Vadodara, Gujarat</div>
                        <a href="review.html" class="btn-footer-review">Add Review</a>
                    </div>
                </div>
            </div>
        </div>
        <div class="footer-legal">
            <div class="container">
                <p class="copyright-text">&copy; 2026 SteelFlex Structures Pvt. Ltd. All rights reserved.</p>
            </div>
        </div>
    </footer>
    `;

    let scripts = `
    <script>
        document.querySelector('.mobile-menu-btn').addEventListener('click', function () {
            document.querySelector('.main-nav').classList.toggle('active');
        });

        const reviewForm = document.getElementById('review-form');
        if (reviewForm) {
            reviewForm.addEventListener('submit', async function(e) {
                e.preventDefault();
                const submitBtn = reviewForm.querySelector('.submit-btn');
                const originalText = submitBtn.textContent;
                submitBtn.textContent = 'Submitting...';
                submitBtn.disabled = true;

                const formData = new FormData(reviewForm);
                const backendData = new FormData();
                backendData.append('clientName', formData.get('client_name'));
                backendData.append('company', formData.get('company'));
                backendData.append('reviewText', formData.get('review_text'));
                backendData.append('rating', formData.get('rating'));

                if (formData.get('reviewer_photo')?.size > 0) backendData.append('reviewerPhoto', formData.get('reviewer_photo'));
                if (formData.get('company_logo')?.size > 0) backendData.append('companyLogo', formData.get('company_logo'));
                for (let file of formData.getAll('project_images')) {
                    if (file.size > 0) backendData.append('projectImages', file);
                }

                try {
                    const response = await fetch('/api/reviews', { method: 'POST', body: backendData });
                    const result = await response.json();
                    if (response.ok) {
                        alert('Review submitted successfully!');
                        reviewForm.reset();
                        loadAcceptedReviews();
                    } else alert('Error: ' + (result.message || 'Failed to submit review.'));
                } catch (error) {
                    console.error(error);
                    alert('Network error. Please try again later.');
                } finally {
                    submitBtn.textContent = originalText;
                    submitBtn.disabled = false;
                }
            });
        }

        async function loadAcceptedReviews() {
            const grid = document.getElementById('testimonials-grid');
            if (!grid) return;
            try {
                const res = await fetch('/api/reviews/accepted');
                if (!res.ok) return;
                const reviews = await res.json();
                grid.innerHTML = '';
                if (reviews.length === 0) {
                    grid.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: #777;">Be the first to leave a review!</p>';
                    return;
                }
                reviews.forEach(review => {
                    const stars = '★'.repeat(review.rating) + '☆'.repeat(5 - review.rating);
                    const photo = review.reviewerPhoto ? \`<img src="\${review.reviewerPhoto}" style="width: 60px; height: 60px; border-radius: 50%; object-fit: cover;">\` : '';
                    const logo = review.companyLogo ? \`<img src="\${review.companyLogo}" style="max-height: 40px; max-width: 100px; object-fit: contain;">\` : '';
                    const projImages = (review.projectImages && review.projectImages.length > 0) ? 
                        \`<div style="display: flex; gap: 5px; margin-top: 10px;">\${review.projectImages.map(img => \`<img src="\${img}" style="width: 50px; height: 50px; object-fit: cover; border-radius: 4px;">\`).join('')}</div>\` : '';

                    grid.innerHTML += \`<div style="background: #fff; padding: 25px; border-radius: 12px; box-shadow: 0 4px 15px rgba(0,0,0,0.05); border-left: 4px solid var(--primary-color);">
                        <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 15px;">
                            <div style="display: flex; gap: 15px; align-items: center;">\${photo}<div><h4 style="margin: 0; font-size: 1.1rem;">\${review.clientName}</h4><div style="font-size: 0.9rem; color: #666;">\${review.company}</div></div></div>
                            <div>\${logo}</div>
                        </div>
                        <div style="color: #f59e0b; margin-bottom: 15px; font-size: 1.2rem;">\${stars}</div>
                        <p style="font-style: italic; color: #444; margin: 0; line-height: 1.6;">"\${review.reviewText}"</p>\${projImages}
                    </div>\`;
                });
            } catch (err) {}
        }
        loadAcceptedReviews();
    </script>
</body>
<script src="animations.js"></script>
</html>
    `;

    fs.writeFileSync(path, topPart + footerHTML + scripts);
    console.log("Cleaned up review.html successfully.");
}
