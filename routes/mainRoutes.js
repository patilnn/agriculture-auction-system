const express = require('express');
const router = express.Router();

// header Page
router.get('/partials/header', (req, res) => {
    res.render('partials/header');
});

// footer Page
router.get('/partials/footer', (req, res) => {
    res.render('partials/footer');
});

// Home Page
router.get('/', (req, res) => {
    res.render('index');
});

// Auction Page
router.get('/auction', (req, res) => {
    res.render('auction');
});

// Contact Page
router.get('/contact', (req, res) => {
    res.render('contact');
});

// Contact Page
router.get('/about', (req, res) => {
    res.render('about');
});

module.exports = router;