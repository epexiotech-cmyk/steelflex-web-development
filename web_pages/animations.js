document.addEventListener("DOMContentLoaded", function () {
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
});
