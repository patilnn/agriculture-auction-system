const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../db'); // Database connection
const router = express.Router();

// Render Admin Login Page
// router.get('/admin_login', (req, res) => {
//     res.render('admin_login'); // EJS template for admin login
// });

// Handle Admin Login
router.post('/admin_login', (req, res) => {
    const { email, password } = req.body;

    // Query the admin table
    db.query('SELECT * FROM admin WHERE email = ?', [email], async (err, results) => {
        if (err) throw err;

        if (results.length > 0) {
            const admin = results[0];

            // Compare hashed passwords
            //const isMatch = await bcrypt.compare(password, admin.password);

            //if (isMatch) {
            if(password===admin.password){
                // Save admin session
                req.session.isAdmin = true;
                req.session.adminId = admin.id;
                req.session.adminName = admin.name;

                res.redirect('/authAdmin/dashboard-admin'); // Redirect to admin dashboard
            } else {
                res.send('Incorrect password.');
            }
        } else {
            res.send('Admin not found.');
        }
    });
});

// Render Admin Dashboard
router.get('/dashboard-admin', (req, res) => {
    if (!req.session.isAdmin) return res.redirect('/authAdmin/admin_login'); // Check session
    res.render('dashboard_admin', { name: req.session.adminName }); // Pass admin data
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