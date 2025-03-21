const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../config/db'); // Database connection
const router = express.Router();

// ✅ Route: Admin Dashboard
router.get('/admin/dashboard_admin', (req, res) => {
    if (!req.session.isAdmin) return res.redirect('/authUser/login');

    db.query("SELECT COUNT(*) AS totalUsers FROM users", (err, userResults) => {
        if (err) {
            console.error("Database error:", err);
            return res.status(500).send("Internal Server Error");
        }
        
        db.query("SELECT COUNT(*) AS totalProducts FROM products", (err, productResults) => {
            if (err) {
                console.error("Database error:", err);
                return res.status(500).send("Internal Server Error");
            }

            res.render('admin/dashboard_admin', {
                id: req.session.adminId,
                name: req.session.adminName,
                totalUsers: userResults[0]?.totalUsers || 0,
                totalProducts: productResults[0]?.totalProducts || 0
            });
        });
    });
});

// ✅ Fetch All Users (Admin Management Page)
router.get('/admin/users', (req, res) => {
    if (!req.session.isAdmin) return res.redirect('/authUser/login');

    db.query('SELECT id, name, email, verification_status FROM users', (err, users) => {
        if (err) {
            console.error('Error fetching users:', err);
            return res.render('admin/users', { users: [] });
        }
        res.render('admin/users', { 
            users,
            id: req.session.adminId,
            name: req.session.adminName
        });
    });
});

// ✅ Verify User (Admin Action)
router.post('/admin/verify/:id', (req, res) => {
    const userId = req.params.id;
    if (!userId) return res.status(400).send('Invalid user ID');

    db.query('UPDATE users SET verification_status = "verified" WHERE id = ?', [userId], (err) => {
        if (err) {
            console.error('Error verifying user:', err);
            return res.status(500).send('Error verifying user');
        }
        res.redirect('/admin/users');
    });
});

// ✅ Delete User (Admin Action)
router.post('/admin/delete/:id', (req, res) => {
    const userId = req.params.id;
    if (!userId) return res.status(400).send('Invalid user ID');

    db.query('DELETE FROM users WHERE id = ?', [userId], (err) => {
        if (err) {
            console.error('Error deleting user:', err);
            return res.status(500).send('Error deleting user');
        }
        res.redirect('/admin/users');
    });
});

// ✅ Fetch Products with Seller Name for Admin Panel
router.get('/admin/products', (req, res) => {
    if (!req.session.isAdmin) return res.redirect('/authUser/login');

    const query = `
        SELECT p.product_id, p.seller_id, u.name AS seller_name, p.product_name, 
               p.description, p.starting_price, p.reserve_price, p.image_url, 
               p.auction_start_date, p.auction_end_date, p.category_id, 
               p.created_at, p.updated_at 
        FROM products p
        LEFT JOIN users u ON p.seller_id = u.id
    `;

    db.query(query, (err, results) => {
        if (err) {
            console.error("Unexpected error:", err);
            return res.status(500).send("Internal Server Error");
        }

        res.render('admin/products', {
            title: "Manage Products",
            products: results,
            id: req.session.adminId,
            name: req.session.adminName
        });
    });
});

// ✅ Handle User Logout
router.post('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error('Error ending session:', err);
            return res.send('Error logging out. Please try again.');
        }
        res.redirect('/authUser/login');
    });
});

module.exports = router;
