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

// Handle Login
router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ message: 'All fields are required' });
    }

    try {
        // Query the user table
        db.query('SELECT * FROM users WHERE email = ?', [email], async (err, results) => {
            if (err) {
                console.error('Database error:', err);
                return res.status(500).json({ message: 'Server error' });
            }

            if (results.length > 0) {
                const user = results[0];

                // Compare hashed passwords
                const isMatch = await bcrypt.compare(password, user.password);

                if (isMatch) {
                    // Save user session
                    req.session.isUser = true;
                    req.session.userId = user.id;
                    req.session.userName = user.name;

                    // Send a JSON response with the redirect URL
                    return res.status(200).json({ message: 'Login successful', redirectUrl: '/userDashboard/user/dashboard_user' });
                } else {
                    return res.status(401).json({ message: 'Invalid credentials' });
                }
            } else {
                return res.status(404).json({ message: 'User not found' });
            }
        });
    } catch (error) {
        console.error('Error during login:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;
