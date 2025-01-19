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
  res.render('index');
});

// Auction Page
router.get('/auction', (req, res) => {
    res.render('auction');
});

router.get('/contactus', (req, res) => {
  res.render('contactus'); // Renders the index.ejs page (already has the contact form)
});

// Handle the contact form submission
router.post('/contactus', (req, res) => {
  const { name, email, location, subject, message } = req.body;

  // Validation: Ensure required fields are filled
  if (!name || !email || !message) {
    return res.render('contactus', {
      error: 'Name, Email, and Message are required.',
    });
  }

  // Insert the form data into the database (contactus table)
  const sql =
    'INSERT INTO contactus (name, email, location, subject, msg) VALUES (?, ?, ?, ?, ?)';
  db.query(
    sql,
    [name, email, location, subject, message],
    (err, result) => {
      if (err) {
        console.error('Error inserting data into database:', err.message);
        return res.render('index', {
          error: 'There was an error saving your message.',
        });
      }

      // If successful, show a success message
      res.render('contactus', {
        message: 'Your message has been sent successfully.',
      });
    }
  );
});

module.exports = router;