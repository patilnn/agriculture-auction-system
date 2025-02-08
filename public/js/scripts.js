document.addEventListener('DOMContentLoaded', () => {
    // Load header dynamically
    fetch('/partials/header')
        .then(response => response.text())
        .then(html => {
            document.getElementById('header').innerHTML = html;
            initializeSlideshow(); // Initialize slideshow after header is loaded
        })
        .catch(error => console.error('Error loading header:', error));

    // Load footer dynamically
    fetch('/partials/footer')
        .then(response => response.text())
        .then(html => document.getElementById('footer').innerHTML = html)
        .catch(error => console.error('Error loading footer:', error));
    
    // Slideshow functionality
    let slideIndex = 1;
    let slideInterval;

    function showSlide(index) {
        const slides = document.querySelectorAll('.slides');
        const dotsContainer = document.querySelector('.dots-container');
        const visibleDotsCount = 5;

        if (index > slides.length) slideIndex = 1;
        if (index < 1) slideIndex = slides.length;

        // Show only the current slide
        slides.forEach((slide, i) => {
            slide.style.display = i + 1 === slideIndex ? 'block' : 'none';
        });

        // Update dots dynamically
        dotsContainer.innerHTML = ''; // Clear existing dots
        const startDot = Math.max(1, Math.min(slideIndex - Math.floor(visibleDotsCount / 2), slides.length - visibleDotsCount + 1));
        for (let i = startDot; i < startDot + visibleDotsCount && i <= slides.length; i++) {
            const dot = document.createElement('span');
            dot.classList.add('dot');
            if (i === slideIndex) dot.classList.add('active');
            dot.addEventListener('click', () => currentSlide(i));
            dotsContainer.appendChild(dot);
        }
    }
    window.changeSlide = function (n) { // Expose changeSlide globally
        clearInterval(slideInterval); // Stop auto slide
        showSlide(slideIndex += n);
        startAutoSlide(); // Restart auto slide
    };
    function currentSlide(n) {
        clearInterval(slideInterval); // Stop auto slide
        showSlide(slideIndex = n);
        startAutoSlide(); // Restart auto slide
    }
    function startAutoSlide() {
        slideInterval = setInterval(() => {
            showSlide(slideIndex += 1);
        }, 3000); // Set time to 3 seconds
    }
    function initializeSlideshow() {
        showSlide(slideIndex);
        startAutoSlide();
    }
});
