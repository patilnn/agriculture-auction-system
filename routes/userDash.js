// routes/userDash.js
const express = require('express');
const db = require('../db'); // Database connection
const path = require('path');
const multer = require('multer');
const router = express.Router();

// header Page
router.get('/user/head', (req, res) => {
    res.render('user/head');
});

// Render User Dashboard
router.get('/user/dashboard_user', (req, res) => {
    if (!req.session.isUser) return res.redirect('/authUser/login'); // Check session
    
    res.render('user/dashboard_user', { id: req.session.userId, name: req.session.userName }); // Pass user data
});



//------------------------------------------------------------------------------------------------------------------------------------------------
// Fetch Categories Function
const fetchCategories = () => {
    return new Promise((resolve, reject) => {
        const query = 'SELECT category_name FROM categories';
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
router.get('/user/make_auction', async (req, res) => {
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
        const { product_name, Product_description, starting_price, reserve_price, auction_start_date, auction_end_date, categoryName } = req.body;
        const image = req.file ? req.file.filename : null; // Store the image filename
        const seller_id = req.session.userId; // Get the seller's user ID from the session
    
        try {
            const query = `
                INSERT INTO products 
                (product_name, description, starting_price, reserve_price, auction_start_date, auction_end_date, category_name, image_url, seller_id) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;
    
            // Use the promisified query
            await queryAsync(query, [
                product_name,
                Product_description,
                starting_price,
                reserve_price,
                auction_start_date,
                auction_end_date,
                categoryName,
                image,
                seller_id,
            ]);
    
            // Fetch updated categories after successful insertion
            const categories = await fetchCategories();
    
            res.render('user/make_auction', {
                id: req.session.userId,
                name: req.session.userName,
                categories: categories,
                message: 'Product added successfully.',
                error: undefined,
            });
        } catch (err) {
            console.error('Error adding product:', err);
            const categories = await fetchCategories();
            res.render('user/make_auction', {
                id: req.session.userId,
                name: req.session.userName,
                categories: categories,
                message: undefined,
                error: 'An error occurred while adding the product. Please try again.',
            });
        }
    }    
    // else if (form_type === 'product') {
    //     // Handle product form submission
    //     const { product_name, Product_description, starting_price, reserve_price, auction_start_date, auction_end_date, categoryName } = req.body;
    //     const image = req.file ? req.file.filename : null; // Store the image filename
    //     const seller_id = req.session.userId; // Get the seller's user ID from the session
    
    //     try {
    //         const query = 
    //             'INSERT INTO products (product_name, description, starting_price, reserve_price, auction_start_date, auction_end_date, category_name, image_url, seller_id) ' +
    //             'VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)';
            
    //         db.query(query, [product_name, seller_id, Product_description, starting_price, reserve_price, auction_start_date, auction_end_date, categoryName, image], (err, result) => {
    //             if (err) {
    //                 console.error('Error inserting product:', err);
    //                 return res.status(500).send('Database error');
    //             }
    //             res.redirect('/userDashboard/user/make_auction'); // Redirect to dashboard after successful product addition
    //         });
    
    //         // Fetch updated categories
    //         const categories = await fetchCategories();
    //         res.render('user/make_auction', {
    //             id: req.session.userId,
    //             name: req.session.userName,
    //             message: 'Product added successfully.',
    //             categories: categories,
    //             error: undefined
    //         });
    //     } catch (err) {
    //         console.error('Error adding product:', err);
    //         res.render('user/make_auction', {
    //             id: req.session.userId,
    //             name: req.session.userName,
    //             categories: await fetchCategories(),
    //             message: undefined,
    //             error: 'An error occurred while adding the product. Please try again.'
    //         });
    //     }
    // }
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
    const { mobile, PAN_number, city, state, nation } = req.body;
    const userId = req.session.userId;
    if (!userId) {
        return res.redirect('/authUser/login'); // Redirect to login if userId is missing
    }
    const updateQuery = `
        UPDATE Users 
        SET mobile = ?, PAN_number = ?, city = ?, state = ?, nation = ?, profile_completed = true
        WHERE id = ?`;
    db.query(updateQuery, [mobile, PAN_number, city, state, nation, userId], (err, result) => {
        if (err) {
            return res.status(500).send('Database error');
        }
        // Redirect to the correct absolute path
        res.redirect('/userDashboard/user/profile'); 
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

module.exports = router;
