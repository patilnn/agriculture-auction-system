// public/js/scripts.js
document.addEventListener('DOMContentLoaded', () => {
    // Load header
    fetch('/partials/header') // Use absolute paths starting with `/`
        .then(response => response.text())
        .then(html => document.getElementById('header').innerHTML = html)
        .catch(error => console.error('Error loading header:', error));

    // Load footer
    fetch('/partials/footer') // Use absolute paths starting with `/`
        .then(response => response.text())
        .then(html => document.getElementById('footer').innerHTML = html)
        .catch(error => console.error('Error loading footer:', error));
});
