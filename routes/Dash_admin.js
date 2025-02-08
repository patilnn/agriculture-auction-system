const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../db'); // Database connection
const router = express.Router();

// Render Admin Dashboard
router.get('/admin/dashboard_admin', (req, res) => {
    if (!req.session.isAdmin) return res.redirect('/auth/login'); // Check session
    res.render('admin/dashboard_admin', { name: req.session.adminName }); // Pass admin data
});

// Handle User Logout
router.post('/logout', (req, res) => {
    // Destroy the session
    req.session.destroy((err) => {
        if (err) {
            console.error('Error ending session:', err);
            return res.send('Error logging out. Please try again.');
        }
        res.redirect('/authUser/login'); // Redirect to login page after logout
    });
});

module.exports = router;