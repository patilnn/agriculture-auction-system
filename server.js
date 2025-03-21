// server.js
const express = require('express');
const session = require('express-session');
const path = require('path');
const bodyParser = require('body-parser');

const app = express();

// Set View Engine to EJS
app.set('view engine', 'ejs');  // ✅ Fix for "No default engine" error
app.set('views', path.join(__dirname, 'views')); // Ensure Express looks for views in the correct folder

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(bodyParser.urlencoded({ extended: true }));

// Serve static files (CSS, JS, images)
app.use(express.static(path.join(__dirname, 'public')));
app.use('/img2', express.static('img2'));

// Express Session
app.use(session({ 
    secret: 'secret', 
    resave: false, 
    saveUninitialized: true 
}));

// Routes
const mainRoutes = require('./routes/mainRoutes');
const authRoutesU = require('./routes/authRoutesU');   // User-Admin Authentication
const Dash_user = require('./routes/Dash_user');       // User Dashboard (Notifications included)
const Dash_admin = require('./routes/Dash_admin');     // Admin Dashboard

app.use('/', mainRoutes);
app.use('/authUser', authRoutesU);
app.use('/userDashboard', Dash_user);  // Includes notifications
app.use('/AdminDash', Dash_admin);

// Load Auction Cron Job
require('./cron/auctionCron');  // ✅ Ensures auction notifications run every minute

// Error-handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack); // Log the error
    res.status(500).send('Something went wrong!'); // Send generic error message
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
