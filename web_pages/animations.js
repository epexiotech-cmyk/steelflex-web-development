const initScrollReveal = () => {
    const elements = document.querySelectorAll(".reveal-on-scroll");

    if (!("IntersectionObserver" in window)) {
        elements.forEach(el => el.classList.add("in-view"));
        return;
    }

    const observer = new IntersectionObserver(
        (entries, obs) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add("in-view");
                    obs.unobserve(entry.target);
                }
            });
        },
        {
            threshold: 0.2, // As requested
            rootMargin: "0px 0px -10% 0px"
        }
    );

    elements.forEach(el => observer.observe(el));
};

// Contact Form Integration
// Injected via animations.js to avoid modifying HTML structure
const initFormsAndVacancies = () => {
    const contactForm = document.querySelector('.interaction-form');

    if (contactForm) {
        contactForm.addEventListener('submit', async function (e) {
            e.preventDefault();

            const submitBtn = contactForm.querySelector('.submit-btn');
            const originalBtnText = submitBtn.textContent;
            submitBtn.textContent = 'Sending...';
            submitBtn.disabled = true;

            const formData = {
                name: document.getElementById('name').value,
                email: document.getElementById('email').value,
                phone: document.getElementById('mobile').value,
                projectType: document.getElementById('subject').value,
                message: document.getElementById('message').value
            };

            try {
                const response = await fetch('/api/contact', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(formData)
                });

                let result = {};
                try { result = await response.json(); } catch (e) { }

                if (response.ok) {
                    alert('Message sent successfully! We will get back to you soon.');
                    contactForm.reset();
                } else {
                    alert('Error: ' + (result.message || 'Failed to send message.'));
                }
            } catch (error) {
                console.error('Error submitting form:', error);
                alert('Network error. Please try again later.');
            } finally {
                submitBtn.textContent = originalBtnText;
                submitBtn.disabled = false;
            }
        });
    }

    // Careers Form Submission
    const careerForm = document.getElementById('careerForm');
    if (careerForm) {
        careerForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const cvInput = document.getElementById('cv');
            if (cvInput && (!cvInput.files || cvInput.files.length === 0)) {
                alert('Please upload your CV.');
                return;
            }

            const submitBtn = careerForm.querySelector('button[type="submit"]');
            const originalText = submitBtn.innerText;
            submitBtn.innerText = 'Submitting...';
            submitBtn.disabled = true;

            try {
                const formData = new FormData(careerForm);

                const response = await fetch('/api/careers/apply', {
                    method: 'POST',
                    body: formData
                });

                let result = {};
                try { result = await response.json(); } catch (e) { }

                if (response.ok) {
                    alert('Application submitted successfully! We will review your profile and get back to you.');
                    careerForm.reset();
                    // Reset file display bits if they exist
                    if (document.getElementById('fileName')) document.getElementById('fileName').textContent = "";
                    if (document.getElementById('uploadText')) document.getElementById('uploadText').textContent = "Click or Drag & Drop CV here";
                    if (document.getElementById('uploadBox')) {
                        document.getElementById('uploadBox').style.background = "transparent";
                        document.getElementById('uploadBox').style.borderColor = "#eee";
                    }
                } else {
                    alert('Error: ' + (result.message || 'Failed to submit application.'));
                }
            } catch (error) {
                console.error('Submission error:', error);
                alert('An error occurred. Please try again later.');
            } finally {
                submitBtn.innerText = originalText;
                submitBtn.disabled = false;
            }
        });
    }


    // Dynamic Vacancies Loading
    const vacancyContainer = document.getElementById('vacancy-container');
    if (vacancyContainer) {
        fetch('/api/vacancies/public')
            .then(res => res.json())
            .then(vacancies => {
                vacancyContainer.innerHTML = ''; // Clear loading

                if (vacancies.length === 0) {
                    vacancyContainer.innerHTML = '<div style="grid-column: 1/-1; text-align: center; color: #666; padding: 40px;">No current openings. Please check back later.</div>';
                    return;
                }

                vacancies.forEach(vacancy => {
                    const card = document.createElement('div');
                    card.className = 'vacancy-card reveal-on-scroll in-view'; // Force in-view for simplicity

                    // Truncate description
                    const shortDesc = vacancy.description.length > 150
                        ? vacancy.description.substring(0, 150) + '...'
                        : vacancy.description;

                    card.innerHTML = `
                        <h3 class="job-role">${vacancy.title}</h3>
                        <div class="job-location">📍 ${vacancy.location}</div>
                        <p class="job-desc">${shortDesc}</p>
                        <button class="apply-now-btn" data-role="${vacancy.title}">Apply Now</button>
                    `;
                    vacancyContainer.appendChild(card);
                });

                // Attach event listeners to new buttons
                document.querySelectorAll('.apply-now-btn').forEach(btn => {
                    btn.addEventListener('click', function () {
                        const role = this.getAttribute('data-role');
                        applyForRole(role);
                    });
                });
            })
            .catch(err => {
                vacancyContainer.innerHTML = '<div style="grid-column: 1/-1; text-align: center; color: red;">Failed to load vacancies.</div>';
                console.error('Error loading vacancies:', err);
            });
    }
};

// Helper for Apply Now
window.applyForRole = function (roleTitle) {
    const selectBox = document.getElementById('position');
    const formSection = document.querySelector('.application-section');

    if (selectBox) {
        // Check if option exists
        let optionExists = Array.from(selectBox.options).some(opt => opt.value === roleTitle);

        if (!optionExists) {
            const newOpt = document.createElement('option');
            newOpt.value = roleTitle;
            newOpt.text = roleTitle;
            selectBox.add(newOpt, selectBox[1]); // Add after placeholder
        }

        selectBox.value = roleTitle;
    }

    if (formSection) {
        formSection.scrollIntoView({ behavior: 'smooth' });
    }
};

const initProjects = () => {
    // Check if we are on the projects page by looking for the ongoing-projects container
    if (document.getElementById('ongoing-projects')) {
        loadProjects('Ongoing', 'ongoing-projects');
    }
};

// Main Initialization
document.addEventListener('DOMContentLoaded', () => {
    initScrollReveal();
    initFormsAndVacancies();
    initProjects();
});

// Global switchTab function attached to window
window.switchTab = function (tabName) {
    // Update Tab Buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.getAttribute('data-tab') === tabName) {
            btn.classList.add('active');
        }
    });

    // Toggle Content Containers
    const ongoing = document.getElementById('ongoing-projects');
    const completed = document.getElementById('completed-projects');

    if (!ongoing || !completed) return;

    if (tabName === 'ongoing') {
        ongoing.style.display = 'grid';
        completed.style.display = 'none';
        // Only load if empty or loading placeholder is present (checking children count < 2 as quick check)
        if (ongoing.children.length <= 1) loadProjects('Ongoing', 'ongoing-projects');
    } else {
        ongoing.style.display = 'none';
        completed.style.display = 'grid';
        if (completed.children.length <= 1) loadProjects('Completed', 'completed-projects');
    }
};

window.loadProjects = async function (status, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    // Optional: Show loading state if empty?
    // container.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 20px;">Loading...</div>';

    try {
        const res = await fetch(`/api/projects`);
        if (!res.ok) throw new Error('Failed to fetch projects');
        let projects = await res.json();

        // Local filtering
        if (status && status !== 'ALL') {
            projects = projects.filter(p => p.status === status);
        }

        container.innerHTML = '';

        if (projects.length === 0) {
            container.innerHTML = `<div style="grid-column: 1/-1; text-align: center; color: #666; padding: 40px;">No ${status.toLowerCase()} projects found at the moment.</div>`;
            return;
        }

        projects.forEach(p => {
            // Update global cache for modal if it exists (defined in projects.html)
            if (typeof cachedProjects !== 'undefined') {
                cachedProjects[p.id] = p;
            }

            const card = document.createElement('article');
            card.className = 'project-card reveal-on-scroll in-view';
            // The onclick triggers openModal which should use cachedProjects[p.id]
            card.onclick = () => window.openModal(p.id);

            // Image handling
            let displayImage = 'https://via.placeholder.com/600x400?text=No+Image';
            if (p.images && p.images.length > 0) displayImage = p.images[0];
            else if (p.image) displayImage = p.image;

            // Meta tags based on status
            const completedTag = status === 'Completed'
                ? `<span class="project-tag" style="background: #fff; color: #333; display: inline-block; padding: 2px 8px; border-radius: 4px; font-size:0.8rem; margin-top: 5px;">Completed</span>`
                : '';

            card.innerHTML = `
                <div class="card-image-wrapper">
                    <img src="${displayImage}" alt="${p.title}" class="project-card-image">
                    <div class="card-overlay">
                        <h3 class="project-title">${p.title}</h3>
                        <div class="card-hidden-details">
                            <p class="project-meta"><strong>Location:</strong> ${p.location}</p>
                            ${p.area ? `<p class="project-meta"><strong>Area:</strong> ${p.area} Sqft</p>` : ''}
                            ${p.weight ? `<p class="project-meta"><strong>Weight:</strong> ${p.weight} Tons</p>` : ''}
                            ${completedTag}
                            <button class="btn-more-details">Click for Details</button>
                        </div>
                    </div>
                </div>
            `;
            container.appendChild(card);
        });

    } catch (err) {
        console.error(err);
        container.innerHTML = '<div style="grid-column: 1/-1; text-align: center; color: red;">Error loading projects. Please try again later.</div>';
    }
};
