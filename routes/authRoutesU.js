const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../db'); // Database connection
const router = express.Router();

// Render Registration Page
router.get('/register', (req, res) => {
    res.render('login'); // EJS template for registration
});

// Handle User Registration
router.post('/register', async (req, res) => {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
        return res.status(400).json({ message: 'All fields are required' });
    }

    try {
        // Hash the password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Insert into the database
        db.query(
            'INSERT INTO users (name, email, password) VALUES (?, ?, ?)',
            [name, email, hashedPassword],
            (err) => {
                if (err) {
                    //console.error('Error during user registration:', err);
                    return res.status(500).send({ message: 'Error registering user/user already registered ' });
                }
                res.status(201).json({ message: 'User registered successfully' });
            }
        );
    } catch (error) {
        console.error('Error hashing password:', error);
        res.status(500).json({ message: 'Server error' });
    }
});


// Render Login Page
router.get('/login', (req, res) => {
    res.render('login'); // EJS template for login
});

// Handle Login (User and Admin combined)
router.post('/login', async (req, res) => {
    const { email, password, role } = req.body;

    if (!email || !password || !role) {
        return res.status(400).json({ message: 'All fields are required' });
    }

    try {
        if (role === 'user') {
            // Handle User Login
            db.query('SELECT * FROM users WHERE email = ?', [email], async (err, results) => {
                if (err) {
                    console.error('Database error:', err);
                    return res.status(500).json({ message: 'Server error' });
                }

                if (results.length > 0) {
                    const user = results[0];

                    const isMatch = await bcrypt.compare(password, user.password);

                    if (isMatch) {
                        req.session.isUser = true;
                        req.session.userId = user.id;
                        req.session.userName = user.name;

                        return res.status(200).json({
                            message: 'User login successful',
                            redirectUrl: '/userDashboard/user/dashboard_user' // Redirect to user dashboard
                        });
                    } else {
                        return res.status(401).json({ message: 'Invalid credentials' });
                    }
                } else {
                    return res.status(404).json({ message: 'User not found' });
                }
            });
        } else if (role === 'admin') {
            // Handle Admin Login
            db.query('SELECT * FROM admin WHERE email = ?', [email], (err, results) => {
                if (err) {
                    console.error('Database error:', err);
                    return res.status(500).json({ message: 'Server error' });
                }

                if (results.length > 0) {
                    const admin = results[0];

                    if (password === admin.password) {
                        req.session.isAdmin = true;
                        req.session.adminId = admin.id;
                        req.session.adminName = admin.name;

                        return res.status(200).json({
                            message: 'Admin login successful',
                            redirectUrl: '/AdminDash/admin/dashboard_admin' // Redirect to admin dashboard
                        });
                    } else {
                        return res.status(401).json({ message: 'Incorrect password.' });
                    }
                } else {
                    return res.status(404).json({ message: 'Admin not found.' });
                }
            });
        } else {
            return res.status(400).json({ message: 'Invalid role selected' });
        }
    } catch (error) {
        console.error('Error during login:', error);
        return res.status(500).json({ message: 'Server error' });
    }
});


module.exports = router;
