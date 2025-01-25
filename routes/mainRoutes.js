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
    res.render('auction');
});

module.exports = router;