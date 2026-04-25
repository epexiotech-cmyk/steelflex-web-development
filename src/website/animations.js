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

        const selectedProjects = Array.from(contactForm.querySelectorAll('input[name="project_type"]:checked'))
                .map(cb => {
                    if (cb.id === 'other-checkbox') {
                        const otherVal = document.getElementById('other-project-text').value.trim();
                        return otherVal ? `Other: ${otherVal}` : 'Other';
                    }
                    return cb.nextElementSibling.textContent;
                })
                .join(', ');

            const formData = {
                name: document.getElementById('name').value,
                email: document.getElementById('email').value,
                phone: document.getElementById('mobile').value,
                projectType: selectedProjects || 'None selected',
                message: document.getElementById('message').value
            };

            // Validation
            if (!formData.name || !formData.email || !formData.phone || !formData.message) {
                alert('Please fill in all mandatory fields.');
                submitBtn.textContent = originalBtnText;
                submitBtn.disabled = false;
                return;
            }

            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(formData.email)) {
                alert('Please enter a valid email address.');
                submitBtn.textContent = originalBtnText;
                submitBtn.disabled = false;
                return;
            }

            const isValidMobile = (val) => {
                if (val.startsWith('0')) return /^[0-9]{11}$/.test(val);
                return /^[0-9]{10}$/.test(val);
            };

            if (!isValidMobile(formData.phone)) {
                alert('Please enter a valid mobile number (10 digits, or 11 digits if starting with 0).');
                submitBtn.textContent = originalBtnText;
                submitBtn.disabled = false;
                return;
            }

            try {
                const result = await StorageManager.addItem('contact', {
                    ...formData,
                    status: 'Unread' // Mark as unread for admin dashboard
                });

                if (result) {
                    alert('Message sent successfully! We will get back to you soon.');
                    contactForm.reset();
                    // Hide other input if it was open
                    const otherContainer = document.getElementById('other-project-container');
                    if (otherContainer) otherContainer.style.display = 'none';
                } else {
                    alert('Failed to send message.');
                }
            } catch (error) {
                console.error('Error submitting form:', error);
                alert('Network error. Please try again later.');
            } finally {
                submitBtn.textContent = originalBtnText;
                submitBtn.disabled = false;
            }
        });

        // Other Project Toggle Logic
        const otherCheckbox = document.getElementById('other-checkbox');
        const otherContainer = document.getElementById('other-project-container');
        if (otherCheckbox && otherContainer) {
            otherCheckbox.addEventListener('change', () => {
                otherContainer.style.display = otherCheckbox.checked ? 'block' : 'none';
                if (otherCheckbox.checked) {
                    document.getElementById('other-project-text').focus();
                }
            });
        }

        // Real-time Validation for Contact Page
        const setupContactValidation = (id, regex, customValidator) => {
            const field = document.getElementById(id);
            if (field) {
                field.addEventListener('blur', () => {
                    const val = field.value.trim();
                    if (val) {
                        const isValid = customValidator ? customValidator(val) : regex.test(val);
                        if (!isValid) {
                            const group = field.closest('.modern-input-group');
                            if (group) group.classList.add('invalid');
                        }
                    }
                });
                field.addEventListener('input', () => {
                    const group = field.closest('.modern-input-group');
                    if (group) group.classList.remove('invalid');
                });
            }
        };

        setupContactValidation('email', /^[^\s@]+@[^\s@]+\.[^\s@]+$/);
        setupContactValidation('mobile', null, (val) => {
            if (val.startsWith('0')) return /^[0-9]{11}$/.test(val);
            return /^[0-9]{10}$/.test(val);
        });
    }

    // Careers Form Submission
    const careerForm = document.getElementById('careerForm');
    if (careerForm) {
        careerForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            // Validate all fields
            const name = document.getElementById('name').value.trim();
            const email = document.getElementById('email').value.trim();
            const mobile = document.getElementById('mobile').value.trim();
            const position = document.getElementById('position').value;
            const message = document.getElementById('message').value.trim();
            const cvInput = document.getElementById('cv');

            if (!name || !email || !mobile || !position || !message) {
                alert('Please fill in all mandatory fields.');
                return;
            }

            // Email validation
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                alert('Please enter a valid email address.');
                return;
            }

            // Mobile validation
            const isValidMobile = (val) => {
                if (val.startsWith('0')) return /^[0-9]{11}$/.test(val);
                return /^[0-9]{10}$/.test(val);
            };

            if (!isValidMobile(mobile)) {
                alert('Please enter a valid mobile number (10 digits, or 11 digits if starting with 0).');
                return;
            }

            if (!cvInput || !cvInput.files || cvInput.files.length === 0) {
                alert('Please attach your CV (PDF or DOC) to proceed.');
                return;
            }

            const submitBtn = careerForm.querySelector('button[type="submit"]');
            const originalText = submitBtn.innerText;
            submitBtn.innerText = 'Submitting...';
            submitBtn.disabled = true;

            try {
                const formData = new FormData(careerForm);
                const data = Object.fromEntries(formData.entries());

                // CV UPLOAD LOGIC (Base64)
                if (data.cv instanceof File && data.cv.size > 0) {
                    const file = data.cv;
                    
                    // Validate file size (5MB)
                    if (file.size > 5 * 1024 * 1024) {
                        alert('CV file size exceeds 5MB limit. Please upload a smaller file.');
                        submitBtn.innerText = originalText;
                        submitBtn.disabled = false;
                        return;
                    }

                    data.cvName = file.name;
                    data.cvData = await new Promise((resolve, reject) => {
                        const reader = new FileReader();
                        reader.onload = () => resolve(reader.result);
                        reader.onerror = error => reject(error);
                        reader.readAsDataURL(file);
                    });
                }
                delete data.cv; // Remove File object

                // Extra fields for Admin Panel
                data.cvFile = data.cvData ? 'base64' : null; // Keep compatibility if used elsewhere or remove
                data.status = 'New'; // Mark for admin notification

                const result = await StorageManager.addItem('careers', data);

                if (result) {
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
                    alert('Failed to submit application.');
                }
            } catch (error) {
                console.error('Submission error:', error);
                alert('An error occurred. Please try again later.');
            } finally {
                submitBtn.innerText = originalText;
                submitBtn.disabled = false;
            }
        });

        // Real-time Validation (Red color on blur)
        const setupValidation = (id, regex, customValidator) => {
            const field = document.getElementById(id);
            if (field) {
                field.addEventListener('blur', () => {
                    const val = field.value.trim();
                    if (val) {
                        const isValid = customValidator ? customValidator(val) : regex.test(val);
                        if (!isValid) {
                            field.closest('.input-group').classList.add('invalid');
                        }
                    }
                });
                field.addEventListener('input', () => {
                    field.closest('.input-group').classList.remove('invalid');
                });
            }
        };

        setupValidation('email', /^[^\s@]+@[^\s@]+\.[^\s@]+$/);
        setupValidation('mobile', null, (val) => {
            if (val.startsWith('0')) return /^[0-9]{11}$/.test(val);
            return /^[0-9]{10}$/.test(val);
        });
    }


    // Dynamic Vacancies Loading
    const vacancyContainer = document.getElementById('vacancy-container');
    if (vacancyContainer) {
        StorageManager.getData('vacancies')
            .then(allVacancies => {
                const vacancies = allVacancies.filter(v => v.status === 'Open');
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

const initPebAppleScroll = () => {
    const section = document.querySelector('.peb-apple');
    const panel   = document.querySelector('.peb-sticky');
    const steps   = document.querySelectorAll('.peb-text-panel .peb-step');
    const bgImages = document.querySelectorAll('.peb-bg-img');

    if (!section || !panel || !steps.length || !bgImages.length) return;

    // Activate step by index + crossfade images via class toggling
    const showStep = (index) => {
        steps.forEach((s, i) => {
            if (i === index) {
                s.classList.add('active');
            } else {
                s.classList.remove('active');
            }
        });

        bgImages.forEach((img, i) => {
            if (i === index) {
                img.classList.add('active');
            } else {
                img.classList.remove('active');
            }
        });
    };

    // Show step 1 immediately
    showStep(0);

    const onScroll = () => {
        const rect          = section.getBoundingClientRect(); // always viewport-relative
        const sectionTop    = rect.top;
        const sectionBottom = rect.bottom;
        const vh            = window.innerHeight;

        if (sectionTop > 0) {
            // Section hasn't entered viewport yet — panel sits at top of section
            panel.classList.remove('is-fixed', 'is-bottom');
        } else if (sectionBottom < vh) {
            // Section has fully scrolled past — pin panel to bottom
            panel.classList.remove('is-fixed');
            panel.classList.add('is-bottom');
        } else {
            // Section is in view — fix panel to viewport
            panel.classList.add('is-fixed');
            panel.classList.remove('is-bottom');

            // Calculate progress through the section (0 → 1)
            const scrolled = -sectionTop;                       // px into section
            const travel   = section.offsetHeight - vh;         // total scrollable distance
            const progress = Math.min(Math.max(scrolled / travel, 0), 1);
            const index    = Math.min(Math.floor(progress * steps.length), steps.length - 1);
            showStep(index);
        }
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll(); // run once on init
};

const initEpcPushScroll = () => {
    const section = document.querySelector('.epc-sticky-section');
    const track   = document.querySelector('.epc-horizontal-track');
    const items   = document.querySelectorAll('.epc-item');

    if (!section || !track || !items.length) return;

    // State variables for physics
    let currentX = 0;
    let targetX = 0;
    let velocity = 0;
    let isAnimating = false;
    let lastUserScroll = Date.now();
    let lastActiveIndex = 0;
    let autoScrollStartTime = Date.now();
    let isProgrammaticScroll = false;
    let isHoverPaused = false;
    let lastFrameTime = Date.now();
    let cumulativeTime = 0;

    // Hover Detection
    let isMouseOverActiveCard = false;
    items.forEach((item) => {
        const card = item.querySelector('.epc-card');
        if (card) {
            card.addEventListener('mouseenter', () => { isMouseOverActiveCard = true; });
            card.addEventListener('mouseleave', () => { isMouseOverActiveCard = false; });
        }
    });

    // Indicators
    const capsules = document.querySelectorAll('.epc-capsule');

    // Physics Tuning Constants
    const SPRING = 0.08;      
    const FRICTION = 0.75;    
    const JOLT_BOOST = 1.2;   
    const TUG_RESISTANCE = 0.4; 

    // Auto-Scroll Settings
    const AUTO_SCROLL_DELAY = 5000; // 5 seconds per card

    const updatePhysics = () => {
        if (window.innerWidth <= 768) {
            isAnimating = false;
            // Reset track and card styles that might have been set by JS
            track.style.transform = '';
            items.forEach(item => {
                const card = item.querySelector('.epc-card');
                if (card) {
                    card.style.transform = '';
                    card.style.opacity = '';
                    card.style.filter = '';
                }
            });
            return;
        }

        const now = Date.now();
        const deltaTime = now - lastFrameTime;
        lastFrameTime = now;

        const rect = section.getBoundingClientRect();
        const vh = window.innerHeight;
        
        // Check if section is visible
        const isVisible = rect.bottom > 0 && rect.top < vh;
        if (!isVisible && !isAnimating) return;

        const sectionHeight = section.offsetHeight;
        const travel = sectionHeight - vh;
        let progress = Math.min(Math.max(-rect.top / travel, 0), 1);

        const buffer = 0.15;
        let mappedProgress = 0;
        if (progress > buffer && progress < (1 - buffer)) {
            mappedProgress = (progress - buffer) / (1 - 2 * buffer);
        } else if (progress >= (1 - buffer)) {
            mappedProgress = 1;
        }

        const activeIndex = Math.round(mappedProgress * (items.length - 1));
        
        // Calculate settlement state for the active card
        const activeItem = items[activeIndex];
        const activeItemRect = activeItem.getBoundingClientRect();
        const centerX = window.innerWidth / 2;
        const itemCenterX = activeItemRect.left + activeItemRect.width / 2;
        const distFromCenter = Math.abs(itemCenterX - centerX) / (window.innerWidth / 2);
        
        // Only pause if mouse is over AND card is settled (centered + low velocity)
        isHoverPaused = isMouseOverActiveCard && (distFromCenter < 0.1) && (Math.abs(velocity) < 1);

        // If hovering, "push" the start times forward so progress remains frozen
        if (isHoverPaused) {
            autoScrollStartTime += deltaTime;
            lastUserScroll += deltaTime;
        } else {
            cumulativeTime += deltaTime;
        }

        // Sync Indicators & Fill Animation
        // (activeIndex already calculated above)
        
        // Reset timer if card changed manually
        if (activeIndex !== lastActiveIndex) {
            lastActiveIndex = activeIndex;
            autoScrollStartTime = Date.now();
            capsules.forEach((capsule, i) => {
                const fill = capsule.querySelector('.epc-fill');
                if (fill) fill.style.width = '0%';
                capsule.classList.toggle('active', i === activeIndex);
            });
        }

        // AUTO-SCROLL TRIGGER (Inside Loop)
        const timeSinceInteraction = now - lastUserScroll;
        const timeSinceLastAuto = now - autoScrollStartTime;

        // Only auto-scroll if:
        // 1. We are in the sticky zone (rect.top <= 0)
        // 2. User hasn't interacted for 3s
        // 3. 5s has passed for current card
        // 4. We are NOT currently mid-auto-scroll (isProgrammaticScroll)
        if (rect.top <= 50 && rect.bottom >= vh - 50 && 
            timeSinceInteraction > 3000 && 
            timeSinceLastAuto >= AUTO_SCROLL_DELAY && 
            !isProgrammaticScroll && !isHoverPaused) {
            
            let nextIndex = (activeIndex + 1) % items.length;
            const targetMapped = nextIndex / (items.length - 1);
            const targetProgress = targetMapped * (1 - 2 * buffer) + buffer;
            const sectionScrollTop = window.scrollY + rect.top;
            const targetScrollY = sectionScrollTop + (targetProgress * travel);

            isProgrammaticScroll = true;
            window.scrollTo({
                top: targetScrollY,
                behavior: 'smooth'
            });
            
            autoScrollStartTime = now; // Reset timer for next card
            setTimeout(() => { isProgrammaticScroll = false; }, 2000);
        }

        // Update active fill
        const fillPercent = Math.min((timeSinceLastAuto / AUTO_SCROLL_DELAY) * 100, 100);
        const activeCapsule = capsules[activeIndex];
        if (activeCapsule) {
            const fill = activeCapsule.querySelector('.epc-fill');
            if (fill) fill.style.width = `${fillPercent}%`;
        }

        const totalWidth = track.scrollWidth;
        const visibleWidth = window.innerWidth;
        
        // Calculate item centers relative to the track
        const itemCenters = Array.from(items).map(item => item.offsetLeft + item.offsetWidth / 2);
        
        // Interpolate ideal center based on mapped progress
        const floatIndex = mappedProgress * (items.length - 1);
        const i1 = Math.floor(floatIndex);
        const i2 = Math.ceil(floatIndex);
        const f = floatIndex - i1;
        const idealCenter = itemCenters[i1] + (itemCenters[i2] - itemCenters[i1]) * f;
        
        // rawTarget is the translation needed to put idealCenter at viewport center
        let rawTarget = idealCenter - (visibleWidth / 2);
        
        const maxTranslate = totalWidth - visibleWidth;
        
        if (progress < buffer) {
            targetX = rawTarget * TUG_RESISTANCE;
        } else if (progress > (1 - buffer)) {
            // Adjust boundary tug for centered logic
            const over = rawTarget - maxTranslate;
            targetX = maxTranslate + (over * TUG_RESISTANCE);
        } else {
            targetX = rawTarget;
        }

        const diff = targetX - currentX;
        let acceleration = diff * SPRING;
        if (Math.abs(diff) > 100) acceleration *= JOLT_BOOST;

        velocity += acceleration;
        velocity *= FRICTION;
        currentX += velocity;

        track.style.transform = `translateX(${-currentX}px)`;

        items.forEach((item) => {
            const card = item.querySelector('.epc-card');
            if (!card) return;
            const itemRect = item.getBoundingClientRect();
            const centerX = window.innerWidth / 2;
            const itemCenterX = itemRect.left + itemRect.width / 2;
            const distFromCenter = itemCenterX - centerX;
            const normDist = distFromCenter / (window.innerWidth / 2);
            const absDist = Math.abs(normDist);

            if (absDist < 2) {
                const scale = 1 - (absDist * 0.12);
                const rotate = normDist * 12; 
                const brightness = 1 - (absDist * 0.2);
                const blur = absDist * 4;
                const opacity = Math.max(0.2, 1 - absDist);
                const floatY = Math.sin(cumulativeTime * 0.002) * 5 * absDist;

                card.style.transform = `scale(${scale}) rotateY(${-rotate}deg) translateY(${floatY}px)`;
                card.style.opacity = opacity;
                card.style.filter = `brightness(${brightness}) blur(${blur}px)`;
            }
        });

        if (Math.abs(velocity) > 0.01 || isVisible || isAnimating) {
            requestAnimationFrame(updatePhysics);
        } else {
            isAnimating = false;
        }
    };

    // Click on capsules to jump
    capsules.forEach((capsule, index) => {
        capsule.addEventListener('click', () => {
            if (window.innerWidth <= 768) return;
            lastUserScroll = Date.now();
            const rect = section.getBoundingClientRect();
            const travel = section.offsetHeight - window.innerHeight;
            const buffer = 0.15;
            const targetProgress = (index / (items.length - 1)) * (1 - 2 * buffer) + buffer;
            const sectionScrollTop = window.scrollY + rect.top;
            const targetScrollY = sectionScrollTop + (targetProgress * travel);

            isProgrammaticScroll = true;
            window.scrollTo({
                top: targetScrollY,
                behavior: 'smooth'
            });
            setTimeout(() => { isProgrammaticScroll = false; }, 1200);
        });
    });

    // Interaction detection
    const handleManualInteraction = () => {
        if (isProgrammaticScroll || window.innerWidth <= 768) return;
        lastUserScroll = Date.now();
        autoScrollStartTime = Date.now();
    };

    window.addEventListener('wheel', handleManualInteraction, { passive: true });
    window.addEventListener('touchstart', handleManualInteraction, { passive: true });
    window.addEventListener('touchmove', handleManualInteraction, { passive: true });
    window.addEventListener('keydown', handleManualInteraction, { passive: true });

    window.addEventListener('scroll', () => {
        if (window.innerWidth <= 768) return;
        if (!isAnimating) {
            isAnimating = true;
            lastFrameTime = Date.now();
            requestAnimationFrame(updatePhysics);
        }
    }, { passive: true });

    window.addEventListener('resize', () => {
        if (window.innerWidth > 768 && !isAnimating) {
            isAnimating = true;
            lastFrameTime = Date.now();
            requestAnimationFrame(updatePhysics);
        }
    });

    // Hover Pause Listeners
    section.addEventListener('mouseenter', () => { isHoverPaused = true; });
    section.addEventListener('mouseleave', () => { isHoverPaused = false; });

    // Start physics loop if not mobile
    if (window.innerWidth > 768) {
        isAnimating = true;
        lastFrameTime = Date.now();
        requestAnimationFrame(updatePhysics);
    }
};

const initHeaderScroll = () => {
    const header = document.querySelector('.main-header');
    const logo = document.querySelector('.logo-img');
    if (!header) return;

    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            header.classList.add('scrolled');
            if (logo) logo.style.opacity = '1';
        } else {
            header.classList.remove('scrolled');
            if (logo && !document.body.classList.contains('home-page')) {
                 // logo.style.opacity = '1'; // Keep visible on other pages
            }
        }
    }, { passive: true });
};

const initProcessAnimations = () => {
    // This is often handled in-page for the workflow, but we keep the hook for consistency
    const processSection = document.querySelector('.process-section');
    if (!processSection) return;
    // Additional site-wide process logic can go here
};

// Core Capabilities Flow Animations
const initFlowAnimations = () => {
    const flowSection = document.getElementById('capabilities-flow');
    const flowLine = document.getElementById('flowLineProgress');
    const flowItems = document.querySelectorAll('.flow-item');
    const flowNodes = document.querySelectorAll('.flow-node');

    if (!flowSection || !flowLine) return;

    const updateFlow = () => {
        const rect = flowSection.getBoundingClientRect();
        const vh = window.innerHeight;
        
        const startOffset = vh * 0.8;
        const endOffset = vh * 0.2;
        
        const totalHeight = flowSection.offsetHeight;
        const currentPos = -rect.top + startOffset;
        let progress = currentPos / (totalHeight + startOffset - endOffset);
        
        progress = Math.min(Math.max(progress, 0), 1);
        flowLine.style.height = `${progress * 100}%`;

        flowItems.forEach((item, index) => {
            const itemRect = item.getBoundingClientRect();
            const node = flowNodes[index];
            
            if (itemRect.top < vh * 0.7) {
                item.classList.add('in-view');
                if (node) node.classList.add('active');
            } else {
                item.classList.remove('in-view');
                if (node) node.classList.remove('active');
            }
        });
    };

    window.addEventListener('scroll', updateFlow, { passive: true });
    updateFlow();
};

// Premium Horizontal Workflow logic
const initHorizontalWorkflow = () => {
    const section = document.querySelector(".workflow-h-section");
    const track = document.getElementById("workflowTrack");
    const sticky = document.querySelector(".workflow-h-sticky");
    const stations = document.querySelectorAll(".workflow-h-station");
    const trackHighlight = document.getElementById("trackHighlight");
    const gearTrackSystem = document.querySelector(".gear-track-system");
    const parallaxBg = document.querySelector(".workflow-h-parallax-bg");
    const capsules = document.querySelectorAll('.workflow-capsule');

    if (!section || !track || !stations.length || !sticky) return;

    gsap.registerPlugin(ScrollTrigger);

    // Physics State
    let currentX = 0;
    let targetX = 0;
    let velocity = 0;
    let lastActiveIndex = 0;
    let autoScrollStartTime = Date.now();
    let isProgrammaticScroll = false;
    let lastFrameTime = Date.now();
    let lastUserScroll = Date.now();

    // Physics Constants
    const SPRING = 0.12;      // Snapping strength
    const FRICTION = 0.8;     // Smoothing
    const AUTO_SCROLL_DELAY = 5000; // 5 seconds per step

    // Set dynamic height for pinning
    const getScrollAmount = () => track.scrollWidth - window.innerWidth;
    const updateSectionHeight = () => {
        if (window.innerWidth <= 768) {
            section.style.height = "auto";
            return;
        }
        const amount = getScrollAmount();
        section.style.height = (amount + window.innerHeight) + "px";
    };
    updateSectionHeight();
    window.addEventListener("resize", updateSectionHeight);
    
    // Recalculate after images load to prevent overlap
    window.addEventListener("load", () => {
        updateSectionHeight();
        ScrollTrigger.refresh();
    });

    // Mobile Check
    if (window.innerWidth <= 768) {
        stations.forEach(s => s.classList.add('active'));
        return;
    }

    // Simple Pinning Trigger
    const pinning = ScrollTrigger.create({
        trigger: section,
        start: "top top",
        end: () => "+=" + getScrollAmount(),
        pin: sticky,
        pinSpacing: true,
        onUpdate: (self) => {
            if (!isProgrammaticScroll) {
                lastUserScroll = Date.now();
            }
        }
    });

    // On-click jump for indicators
    capsules.forEach((capsule, i) => {
        capsule.style.cursor = "pointer";
        capsule.addEventListener("click", () => {
            if (window.innerWidth <= 768) return;
            isProgrammaticScroll = true;
            lastUserScroll = Date.now();
            
            const targetY = pinning.start + (i * window.innerWidth);
            window.scrollTo({
                top: targetY,
                behavior: 'smooth'
            });

            // Re-enable user scroll detection after animation
            setTimeout(() => { isProgrammaticScroll = false; }, 1000);
        });
    });

    const updatePhysics = () => {
        if (window.innerWidth <= 768) return;
        const now = Date.now();
        const deltaTime = now - lastFrameTime;
        lastFrameTime = now;

        const rect = section.getBoundingClientRect();
        const vh = window.innerHeight;
        
        // Only run when visible
        const isVisible = rect.bottom > 0 && rect.top < vh;
        if (!isVisible) {
            requestAnimationFrame(updatePhysics);
            return;
        }

        const travel = section.offsetHeight - vh;
        const progress = Math.min(Math.max(-rect.top / travel, 0), 1);
        
        // Map scroll progress to float index
        const floatIndex = progress * (stations.length - 1);
        const activeIndex = Math.round(floatIndex);
        
        // Sync Indicators
        if (activeIndex !== lastActiveIndex) {
            lastActiveIndex = activeIndex;
            autoScrollStartTime = now;
            capsules.forEach((capsule, i) => {
                const fill = capsule.querySelector('.workflow-fill');
                if (fill) fill.style.width = '0%';
                capsule.classList.toggle('active', i === activeIndex);
            });
        }

        // Auto-Scroll Logic
        const timeSinceInteraction = now - lastUserScroll;
        const timeSinceLastAuto = now - autoScrollStartTime;

        if (rect.top <= 50 && rect.bottom >= vh - 50 && 
            timeSinceInteraction > 3000 && 
            timeSinceLastAuto >= AUTO_SCROLL_DELAY && 
            !isProgrammaticScroll) {
            
            let nextIndex = (activeIndex + 1) % stations.length;
            const targetProgress = nextIndex / (stations.length - 1);
            const targetScrollY = window.scrollY + rect.top + (targetProgress * travel);

            isProgrammaticScroll = true;
            window.scrollTo({
                top: targetScrollY,
                behavior: 'smooth'
            });
            
            autoScrollStartTime = now;
            setTimeout(() => { isProgrammaticScroll = false; }, 1500);
        }

        // Update active fill
        const fillPercent = Math.min((timeSinceLastAuto / AUTO_SCROLL_DELAY) * 100, 100);
        const activeCapsule = capsules[activeIndex];
        if (activeCapsule) {
            const fill = activeCapsule.querySelector('.workflow-fill');
            if (fill) fill.style.width = `${fillPercent}%`;
        }

        // Physics movement
        const itemWidth = window.innerWidth; // Each station is 100vw
        targetX = floatIndex * itemWidth;

        const diff = targetX - currentX;
        velocity += diff * SPRING;
        velocity *= FRICTION;
        currentX += velocity;

        track.style.transform = `translateX(${-currentX}px)`;

        // Update visuals
        if (trackHighlight) {
            trackHighlight.style.left = `${progress * 100}%`;
        }
        if (parallaxBg) {
            parallaxBg.style.transform = `translateX(${-progress * 150}px) translateY(${progress * 80}px)`;
        }

        // Station active states
        stations.forEach((station, i) => {
            const dist = Math.abs(i - floatIndex);
            const isActive = dist < 0.45;
            station.classList.toggle("active", isActive);
        });

        const anyActive = Array.from(stations).some(s => s.classList.contains('active'));
        if (gearTrackSystem) {
            gearTrackSystem.classList.toggle("glow-active", anyActive);
        }

        requestAnimationFrame(updatePhysics);
    };

    requestAnimationFrame(updatePhysics);
};
// Production Capacity Physics Nodes
// Production Capacity Spotlight Effect
const initCapacityPhysics = () => {
    const scene = document.getElementById('capacityPhysicsScene');
    const nodes = document.querySelectorAll('.physics-node');

    if (!scene || !nodes.length) return;

    let mouseX = 0;
    let mouseY = 0;

    window.addEventListener('mousemove', (e) => {
        mouseX = e.clientX;
        mouseY = e.clientY;
    });

    const nodeData = Array.from(nodes).map((node) => {
        const card = node.querySelector('.peephole-card');
        const data = {
            el: node,
            card: card,
            x: 0,
            y: 0,
            targetX: 0,
            targetY: 0,
            vx: 0,
            vy: 0,
            phase: Math.random() * Math.PI * 2,
            speed: parseFloat(node.dataset.speed) || 1,
            amp: 35 + Math.random() * 20, // Increased from 25 for faster ambient motion
            isHovered: false
        };

        node.addEventListener('mouseenter', () => { data.isHovered = true; });
        node.addEventListener('mouseleave', () => { data.isHovered = false; });

        return data;
    });

    const update = () => {
        const now = Date.now() * 0.001;

        nodeData.forEach((node) => {
            if (!node.card) return;

            // Get card center in viewport
            const rect = node.card.getBoundingClientRect();
            const centerX = rect.left + rect.width / 2;
            const centerY = rect.top + rect.height / 2;

            // 1. Ambient Floating (Relative to center)
            const floatX = Math.cos(now * 0.5 * node.speed + node.phase) * node.amp;
            const floatY = Math.sin(now * 0.7 * node.speed + node.phase) * node.amp;

            // 2. Mouse Attraction (Spotlight follows mouse when nearby)
            const dx = mouseX - centerX;
            const dy = mouseY - centerY;
            const dist = Math.sqrt(dx * dx + dy * dy);

            let attractX = 0;
            let attractY = 0;

            // If mouse is within 400px, spotlight leans towards it
            if (dist < 400) {
                const strength = (1 - dist / 400);
                attractX = dx * strength * 0.5;
                attractY = dy * strength * 0.5;
            }

            // 3. Physics Processing
            node.targetX = floatX + attractX;
            node.targetY = floatY + attractY;

            // Faster interpolation (increased from 0.1 and 0.82)
            node.vx += (node.targetX - node.x) * 0.15;
            node.vy += (node.targetY - node.y) * 0.15;
            node.vx *= 0.86; // Lower friction for faster movement
            node.vy *= 0.86;
            node.x += node.vx;
            node.y += node.vy;

            // 4. Map to CSS Variables (Using inset for smooth shape transitions)
            const pctX = 50 + (node.x / rect.width * 100);
            const pctY = 50 + (node.y / rect.height * 100);
            const halfSize = 18; 
            node.card.style.setProperty('--mask-top', `${pctY - halfSize}%`);
            node.card.style.setProperty('--mask-right', `${100 - (pctX + halfSize)}%`);
            node.card.style.setProperty('--mask-bottom', `${100 - (pctY + halfSize)}%`);
            node.card.style.setProperty('--mask-left', `${pctX - halfSize}%`);
        });

        requestAnimationFrame(update);
    };

    update();
};


document.addEventListener('DOMContentLoaded', () => {
    const initTask = (name, fn) => {
        try {
            fn();
        } catch (e) {
            console.error(`Failed to initialize ${name}:`, e);
        }
    };

    initTask('ScrollReveal', initScrollReveal);
    initTask('HeaderScroll', initHeaderScroll);
    initTask('Forms', initFormsAndVacancies);
    initTask('Projects', initProjects);
    initTask('PEBScroll', initPebAppleScroll);
    initTask('EPCAnimations', initEpcPushScroll);
    initTask('ProcessAnimations', initProcessAnimations);
    initTask('FlowAnimations', initFlowAnimations);
    initTask('HorizontalWorkflow', initHorizontalWorkflow);
    initTask('CapacityPhysics', initCapacityPhysics);
});

// Final global refresh to ensure all dynamic heights (footer, images) are accounted for
window.addEventListener('load', () => {
    ScrollTrigger.refresh();
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
        if (ongoing.children.length <= 1) window.loadProjects('Ongoing', 'ongoing-projects');
    } else {
        ongoing.style.display = 'none';
        completed.style.display = 'grid';
        if (completed.children.length <= 1) window.loadProjects('Completed', 'completed-projects');
    }
};

window.cachedProjects = window.cachedProjects || {};
window.currentImages = window.currentImages || [];
window.currentSlide = window.currentSlide || 0;

window.openModal = function(id) {
    const project = window.cachedProjects[id];
    if (!project) return;
    document.getElementById('project-modal').style.display = 'flex';
    document.getElementById('modal-title').textContent = project.title;
    document.getElementById('modal-location').textContent = project.location || '-';
    document.getElementById('modal-area').textContent = project.area || '-';
    document.getElementById('modal-weight').textContent = project.weight || '-';
    document.getElementById('modal-desc').textContent = project.description || 'No description available.';
    window.currentImages = project.images && project.images.length > 0 ? project.images : [];
    if (window.currentImages.length === 0 && project.image) window.currentImages.push(project.image);
    window.currentSlide = 0;
    window.updateSlide();
};

window.closeModal = function(e) {
    if (e) e.preventDefault();
    document.getElementById('project-modal').style.display = 'none';
};

window.moveSlide = function(dir) {
    window.currentSlide += dir;
    if (window.currentSlide >= window.currentImages.length) window.currentSlide = 0;
    if (window.currentSlide < 0) window.currentSlide = window.currentImages.length - 1;
    window.updateSlide();
};

window.updateSlide = function() {
    const modalImg = document.getElementById('modal-img');
    if (modalImg) modalImg.src = window.currentImages[window.currentSlide];
};

window.loadProjects = async function (status, containerId, limit = null) {
    const container = document.getElementById(containerId);
    if (!container) return;

    try {
        let projects = await StorageManager.getData('projects');

        if (status && status !== 'ALL') {
            projects = projects.filter(p => p.status === status);
        }

        if (limit) {
            projects = projects.slice(0, limit);
        }

        container.innerHTML = '';

        if (projects.length === 0) {
            container.innerHTML = `<div style="grid-column: 1/-1; text-align: center; color: #666; padding: 40px;">No ${status.toLowerCase()} projects found at the moment.</div>`;
            return;
        }

        projects.forEach(p => {
            window.cachedProjects[p.id] = p;

            const card = document.createElement('article');
            card.className = 'project-card reveal-on-scroll in-view';
            card.onclick = () => window.openModal(p.id);

            let displayImage = 'https://via.placeholder.com/600x400?text=No+Image';
            if (p.images && p.images.length > 0) displayImage = p.images[0];
            else if (p.image) displayImage = p.image;

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
