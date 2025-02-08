const db = require('../db'); // Adjust the path to your database connection file

module.exports = (req, res, next) => {
    if (!req.session.userId) {
        return res.redirect('/authUser/login'); // Redirect if not logged in
    }

    db.query('SELECT profile_completed FROM Users WHERE id = ?', [req.session.userId], (err, result) => {
        if (err) {
            return res.status(500).send('Database error');
        }

        if (!result.length || !result[0].profile_completed) {
            return res.redirect('/userDashboard/user/profile'); // Redirect to profile completion
        }

        next(); // Allow access if profile is complete
    });
};
