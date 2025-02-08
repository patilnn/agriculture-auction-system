const express = require('express');
const bodyParser = require('body-parser');
const session = require('express-session');
const path = require('path');

const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({ secret: 'secret', resave: false, saveUninitialized: true }));

// Use body parser to handle POST data
app.use(bodyParser.urlencoded({ extended: true }));

// 
app.use('/img2', express.static('img2'));

// Setting EJS as templating engine
app.set('view engine', 'ejs');

// Routes
const mainRoutes = require('./routes/mainRoutes');
const authRoutesU = require('./routes/authRoutesU'); //User-admin Authentication
const Dash_user = require('./routes/Dash_user'); //User Dashboard
const Dash_admin = require('./routes/Dash_admin'); //Admin Dashboard

//middelware
app.use('/', mainRoutes);
app.use('/authUser', authRoutesU);
app.use('/userDashboard', Dash_user); // Include your route
app.use('/AdminDash', Dash_admin);

// Error-handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack); // Log the full error stack to the console
    res.status(500).send('Something went wrong!'); // Send a generic error message
});

app.listen(3000, () => console.log('Server running on http://localhost:3000'));
