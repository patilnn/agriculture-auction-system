const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../db'); // Database connection
const router = express.Router();

// header Page
router.get('/admin/head', (req, res) => {
    res.render('admin/head');
});

router.get('/',(req,res)=>{
    res.render('index',{
        section: 'contact',
        error: req.session.error,
        message: req.session.message,
    });
});

// Render Admin Dashboard
router.get('/admin/dashboard_admin', (req, res) => {
    if (!req.session.isAdmin) return res.redirect('/authUser/login'); // Check session
    console.log(req.session);
    res.render('admin/dashboard_admin', { 
        id: req.session.adminid,
        name: req.session.adminName,
        email: req.session.adminemail
    }); // Pass admin data
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