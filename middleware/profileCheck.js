const db = require('../config/db'); // Adjust the path to your database connection file

module.exports = (req, res, next) => {
    if (!req.session.userId) {
        return res.redirect('/authUser/login'); // Redirect if not logged in
    }

    db.query('SELECT profile_completed, verification_status FROM Users WHERE id = ?', [req.session.userId], (err, result) => {
        if (err) {
            return res.status(500).send('Database error');
        }

        if (!result.length) {
            return res.redirect('/authUser/login');
        }

        if (!result[0].profile_completed) {
            return res.redirect('/userDashboard/user/profile'); // Redirect to profile completion
        }

        if (result[0].verification_status !== 'verified') {
            return res.redirect('/userDashboard/user/profile'); // Redirect if not verified
        }

        next(); // Allow access if profile is complete and user is verified
    });
};
