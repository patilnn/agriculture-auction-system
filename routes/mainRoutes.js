// public/routes/mainRoutes.js
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
    res.sendFile(path.join(__dirname, 'views', 'index.ejs')); // Serve the about.html file
});

// Contact Page
router.get('/about', (req, res) => {
    res.render('about');
});
// router.get('/about', (req, res) => {
//     res.sendFile(path.join(__dirname, 'views', 'index.ejs')); // Serve the about.html file
// });

module.exports = router;