// public/routes/mainRoutes.js
const express = require('express');
const db = require('../db'); // Database connection

const router = express.Router();

// header Page
router.get('/partials/header', (req, res) => {
    res.render('partials/header');
});

// footer Page
router.get('/partials/footer', (req, res) => {
    res.render('partials/footer');
});

// index Page
router.get('/', (req, res) => {
  res.render('index',{
    section: 'contact',
    error: req.session.error,
    message: req.session.message,
  });
});


router.post('/', (req, res) => {
  const { name, email, location, subject, msg } = req.body;

  // Validate input
  if (!name || !email || !msg) {
      return res.render('index', { 
          error: 'Name, Email, and msg are required fields!', 
          message: undefined 
      });
  }

  const query = `
      INSERT INTO contactus (name, email, location, subject, msg) 
      VALUES (?, ?, ?, ?, ?)
  `;

  // Execute the query
  db.query(query, [name, email, location, subject, msg], (err, results) => {
      if (err) {
          console.error(err);
          return res.render('index', { 
              error: 'An error occurred while processing your request. Please try again.', 
              message: undefined 
          });
      }

      // Success response
      res.render('index', { 
          error: undefined, 
          message: 'Your message has been sent successfully!' 
      });
  });
});

// Auction Page
router.get('/auction', (req, res) => {
    // Query to get all products
    const sql = `
        SELECT p.product_id, p.product_name, p.description, p.starting_price, 
        p.reserve_price, p.image_url, p.auction_start_date, p.auction_end_date, 
        c.category_name, u.name AS seller_name
        FROM Products p
        LEFT JOIN Categories c ON p.category_id = c.category_id
        INNER JOIN Users u ON p.seller_id = u.id
        ORDER BY p.created_at DESC;
    `;

    db.query(sql, (err, results) => {
        if (err) {
            console.error("Error retrieving products:", err);
            return res.status(500).render('auction', { error: "Database error", products: [] });
        }

        // Render the auction page and pass products data
        res.render('auction', { products: results, error: null });
    });
});

module.exports = router;