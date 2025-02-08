// routes/userDash.js
const express = require('express');
const db = require('../db'); // Database connection
const path = require('path');
const multer = require('multer');
const router = express.Router();

const profileCheck = require('../middleware/profileCheck')

// header Page
router.get('/user/head', (req, res) => {
    res.render('user/head');
});

// Render User Dashboard
router.get('/user/dashboard_user', profileCheck, (req, res) => {
    if (!req.session.isUser) return res.redirect('/authUser/login'); // Check session
    
    res.render('user/dashboard_user', { id: req.session.userId, name: req.session.userName }); // Pass user data
});



//------------------------------------------------------------------------------------------------------------------------------------------------
// Fetch Categories Function
const fetchCategories = () => {
    return new Promise((resolve, reject) => {
        const query = 'SELECT category_id, category_name FROM categories';
        db.query(query, (err, results) => {
            if (err) {
                console.error('Error fetching categories:', err);
                reject(err);
            } else {
                resolve(results);
            }
        });
    });
};
// Promisified query function
function queryAsync(sql, params) {
    return new Promise((resolve, reject) => {
        db.query(sql, params, (err, result) => {
            if (err) return reject(err);
            resolve(result);
        });
    });
}

// Render Make Auction page with categories
router.get('/user/make_auction', profileCheck, async (req, res) => {
    if (!req.session.isUser) return res.redirect('/authUser/login'); // Check session
    try {
        const categories = await fetchCategories(); // Get categories using the utility function
        res.render('user/make_auction', {
            id: req.session.userId,
            name: req.session.userName,
            categories: categories,
            message: undefined, // No success message for initial page load
            error: undefined // No error for initial page load
        });
    } catch (err) {
        console.error('Error fetching categories:', err);
        res.status(500).render('user/make_auction', {
            id: req.session.userId,
            name: req.session.userName,
            categories: [],
            message: undefined,
            error: 'Failed to load categories. Please try again later.'
        });
    }
});
// Set up storage for uploaded images
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, path.join(__dirname, '../img2')); // Specify folder to save images
    },
    filename: (req, file, cb) => {
      cb(null, Date.now() + path.extname(file.originalname)); // Set unique file name
    }
});
// Initialize multer middleware
const upload = multer({ storage: storage });
// Route to add a category
router.post('/user/make_auction', upload.single('image'), async (req, res) => {
    if (!req.session.isUser) return res.redirect('/authUser/login'); // Check session
    const { form_type } = req.body;

    if (form_type === 'category') {
        // Handle category form submission
        const { category_name, description } = req.body;

        try {
            const query = 'INSERT INTO categories (category_name, description) VALUES (?, ?)';
            await new Promise((resolve, reject) => {
                db.query(query, [category_name, description], (err, result) => {
                    if (err) reject(err);
                    else resolve(result);
                });
            });

            // Fetch updated categories
            const categories = await fetchCategories();

            res.render('user/make_auction', {
                id: req.session.userId,
                name: req.session.userName,
                categories: categories,
                message: 'Category added successfully.',
                error: undefined
            });
        } catch (err) {
            console.error('Error adding category:', err);
            res.render('user/make_auction', {
                id: req.session.userId,
                name: req.session.userName,
                categories: await fetchCategories(),
                message: undefined,
                error: 'An error occurred while adding the category. Please try again.'
            });
        }
    } else if (form_type === 'product') {
        const { product_name, Product_description, starting_price, reserve_price, auction_start_date, auction_end_date, category_id } = req.body;
        const image = req.file ? req.file.filename : null;
        const seller_id = req.session.userId;
    
        // Convert dates to JS Date objects
        const now = new Date();
        const startDate = new Date(auction_start_date);
        const endDate = new Date(auction_end_date);
    
        // Validation for past dates
        if (startDate < now) {
            return res.render('user/make_auction', {
                id: req.session.userId,
                name: req.session.userName,
                categories: await fetchCategories(),
                message: undefined,
                error: 'Auction start date cannot be in the past.'
            });
        }
    
        if (endDate <= startDate) {
            return res.render('user/make_auction', {
                id: req.session.userId,
                name: req.session.userName,
                categories: await fetchCategories(),
                message: undefined,
                error: 'Auction end date must be after the start date.'
            });
        }
    
        try {
            const query = `
            INSERT INTO products 
            (product_name, description, starting_price, reserve_price, auction_start_date, auction_end_date, category_id, image_url, seller_id) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;
    
            await queryAsync(query, [
                product_name,
                Product_description,
                starting_price,
                reserve_price,
                auction_start_date,
                auction_end_date,
                category_id,
                image,
                seller_id,
            ]);
    
            res.render('user/make_auction', {
                id: req.session.userId,
                name: req.session.userName,
                categories: await fetchCategories(),
                message: 'Product added successfully.',
                error: undefined,
            });
        } catch (err) {
            console.error('Error adding product:', err);
            res.render('user/make_auction', {
                id: req.session.userId,
                name: req.session.userName,
                categories: await fetchCategories(),
                message: undefined,
                error: 'An error occurred while adding the product. Please try again.',
            });
        }
    }
});        

//------------------------------------------------------------------------------------------------------------------------------------------------

// Route to display user's created auctions
router.get('/user/See_auction', profileCheck, async (req, res) => {
    if (!req.session.isUser) return res.redirect('/authUser/login');
    try {
        const userId = req.session.userId; 

        if (!userId) {
            return res.redirect('/login');
        }

        const query = `
            SELECT p.product_id, p.product_name, p.description, p.starting_price, 
                   p.reserve_price, p.image_url, p.auction_start_date, p.auction_end_date, 
                   c.category_name, p.created_at
            FROM Products p
            LEFT JOIN Categories c ON p.category_id = c.category_id
            WHERE p.seller_id = ?
            ORDER BY p.created_at DESC
        `;
        
        db.query(query, [userId], (err, results) => {
            if (err) {
                console.error('Error fetching user auctions:', err);
                return res.status(500).send('Internal Server Error');
            }
            res.render('user/See_auction', {
                auctions: results,
                id: req.session.userId,
                name: req.session.userName 
            });
        });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).send('Internal Server Error');
    }
});

// Render Edit Auction Page
router.get('/user/edit_auction/:id', profileCheck, async (req, res) => {
    if (!req.session.isUser) return res.redirect('/authUser/login');

    const auctionId = req.params.id;
    try {
        const query = `SELECT * FROM products WHERE product_id = ? AND seller_id = ?`;
        const auction = await queryAsync(query, [auctionId, req.session.userId]);

        if (auction.length === 0) {
            return res.redirect('/user/See_auction'); // Prevent unauthorized access
        }

        const categories = await fetchCategories();
        res.render('user/edit_auction', {
            auction: auction[0],
            categories: categories,
            id: req.session.userId,
            name: req.session.userName,
            message: undefined,
            error: undefined
        });
    } catch (error) {
        console.error('Error fetching auction:', error);
        res.status(500).send('Internal Server Error');
    }
});

// Handle Edit Auction Submission
router.post('/user/edit_auction/:id', upload.single('image'), async (req, res) => {
    if (!req.session.isUser) return res.redirect('/authUser/login');

    const auctionId = req.params.id;
    const { product_name, Product_description, starting_price, reserve_price, auction_start_date, auction_end_date, category_id } = req.body;
    const image = req.file ? req.file.filename : req.body.old_image; // Keep old image if no new one uploaded

    try {
        const query = `
            UPDATE products 
            SET product_name = ?, description = ?, starting_price = ?, reserve_price = ?, 
                auction_start_date = ?, auction_end_date = ?, category_id = ?, image_url = ? 
            WHERE product_id = ? AND seller_id = ?
        `;

        await queryAsync(query, [
            product_name,
            Product_description,
            starting_price,
            reserve_price,
            auction_start_date,
            auction_end_date,
            category_id,
            image,
            auctionId,
            req.session.userId
        ]);

        res.redirect('/userDashboard/user/See_auction');
    } catch (error) {
        console.error('Error updating auction:', error);
        res.status(500).send('Internal Server Error');
    }
});

router.post('/user/delete_auction/:id', profileCheck, async (req, res) => {
    if (!req.session.isUser) return res.redirect('/authUser/login');

    const auctionId = req.params.id;

    try {
        const query = `DELETE FROM products WHERE product_id = ? AND seller_id = ?`;
        await queryAsync(query, [auctionId, req.session.userId]);

        res.redirect('/userDashboard/user/See_auction');
    } catch (error) {
        console.error('Error deleting auction:', error);
        res.status(500).send('Internal Server Error');
    }
});

//------------------------------------------------------------------------------------------------------------------------------------------------

// Render User profile
router.get('/user/profile', (req, res) => {
    if (!req.session.isUser) return res.redirect('/authUser/login'); // Check session
    const userId = req.session.userId;
    // Fetch user data from database
    db.query('SELECT * FROM Users WHERE id = ?', [userId], (err, result) => {
        if (err) {
            return res.status(500).send('Database error');
        }
        const user = result[0];
        // console.log(result);
        res.render('user/profile', { user, id: req.session.userId, name: req.session.userName });
    });
});
// Route to handle form submission for profile updates
router.post('/user/profile', (req, res) => {
    console.log("Received Data:", req.body);  // Log received data

    const { user_type, mobile, PAN_number, city, state, nation } = req.body;
    const userId = req.session.userId;

    if (!userId) {
        return res.status(401).json({ message: 'You need to log in to update your profile.' });
    }

    const updateQuery = `
        UPDATE Users 
        SET user_type = ?, mobile = ?, PAN_number = ?, city = ?, state = ?, nation = ?, profile_completed = true
        WHERE id = ?`;

    db.query(updateQuery, [user_type, mobile, PAN_number, city, state, nation, userId], (err, result) => {
        if (err) {
            console.error("Database Error:", err);
            return res.status(500).json({ message: 'Database error occurred while updating your profile.' });
        }

        console.log("Profile Updated Successfully!"); // Confirm update in logs
        return res.status(200).json({
            message: 'Your profile has been successfully updated!',
            redirectUrl: 'user/profile'
        });
    });
});

//------------------------------------------------------------------------------------------------------------------------------------------------


// Handle User Logout
router.post('/logout', (req, res) => {
    // Destroy the session
    req.session.destroy((err) => {
        if (err) {
            console.error('Error ending session:', err);
            return res.send('Error logging out. Please try again.');
        }
        res.redirect('/authUser/login'); // Redirect to login page after logout
    });
});

// ------------------------------------------------------------------------------------------------------------------------------------------------

module.exports = router;
