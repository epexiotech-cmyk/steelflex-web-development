import './indexStyle.css'

// Mobile Menu Toggle
const mobileToggle = document.querySelector('.mobile-toggle');
const navLinks = document.querySelector('.nav-links');

if (mobileToggle) {
  mobileToggle.addEventListener('click', () => {
    navLinks.classList.toggle('active');
  });
}

// Close menu when clicking a link and handle smooth scroll
document.querySelectorAll('a[href^="#"]').forEach(link => {
  link.addEventListener('click', function(e) {
    e.preventDefault();
    if (navLinks) {
      navLinks.classList.remove('active');
    }
    const targetId = this.getAttribute('href');
    if (targetId && targetId !== '#') {
      const targetElement = document.querySelector(targetId);
      if (targetElement) {
        targetElement.scrollIntoView({ behavior: 'smooth' });
      }
    }
  });
});

// For any button link without href or with specific routing needs, 
// you can define their behavior here.
const redirectButtons = document.querySelectorAll('button[data-link]');
redirectButtons.forEach(btn => {
  btn.addEventListener('click', function() {
    window.location.href = this.getAttribute('data-link');
  });
});

// PEB Cards Scroll Animation
const pebCards = document.querySelectorAll('.peb-card');
if (pebCards.length > 0) {
  const pebObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
  });

  pebCards.forEach((card, index) => {
    card.style.transitionDelay = `${index * 0.1}s`;
    pebObserver.observe(card);
    
    // Remove delay so it doesn't break hover effects later
    card.addEventListener('transitionend', function(e) {
      if(e.propertyName === 'opacity' && this.classList.contains('visible')) {
        this.style.transitionDelay = '0s';
      }
    });
  });
}
