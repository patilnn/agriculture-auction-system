// routes/userDash.js
const express = require("express");
const router = express.Router();
const db = require("../config/db");
const multer = require("multer");
const path = require("path");

const profileCheck = require('../middleware/profileCheck')

// header Page
router.get('/user/head', (req, res) => {
    res.render('user/head');
});

router.get('/',(req,res)=>{
    res.render('index',{
        section: 'contact',
        error: req.session.error,
        message: req.session.message,
    });
})

// Render User Dashboard with Chart Data & Notifications
router.get("/user/dashboard_user", profileCheck, async (req, res) => {
    if (!req.session.isUser) return res.redirect('/authUser/login');

    try {
        const userId = req.session.userId;
        if (!userId) return res.status(401).send("Unauthorized: Please log in");

        const currentDateTime = new Date();

        // Fetch different auction statistics
        const totalResult = await queryAsync("SELECT COUNT(*) AS total FROM products WHERE seller_id = ?", [userId]);
        const activeResult = await queryAsync("SELECT COUNT(*) AS total FROM products WHERE seller_id = ? AND auction_start_date <= ? AND auction_end_date >= ?", [userId, currentDateTime, currentDateTime]);
        const pastResult = await queryAsync("SELECT COUNT(*) AS total FROM products WHERE seller_id = ? AND auction_end_date < ?", [userId, currentDateTime]);

        // Fetch auctions user has participated in
        const participatedResult = await queryAsync(`SELECT COUNT(*) AS total FROM bids WHERE bidder_id = ?`, [userId]);

        // Fetch auction results including highest bid
        const auctionResults = await queryAsync(`
            SELECT p.product_name, p.starting_price, p.reserve_price, 
                   COALESCE(MAX(b.bid_amount), 0) AS highest_bid
            FROM products p
            LEFT JOIN bids b ON p.product_id = b.product_id
            WHERE p.seller_id = ?
            GROUP BY p.product_id
        `, [userId]);

        // Fetch user notifications
        const notifications = await queryAsync(`
            SELECT * FROM Notifications WHERE user_id = ? AND deleted = FALSE ORDER BY created_at DESC`, [userId]);

        // Render the user dashboard
        res.render("user/dashboard_user", {
            id: req.session.userId,
            name: req.session.userName,
            totalAuctions: totalResult[0]?.total || 0,
            activeAuctions: activeResult[0]?.total || 0,
            pastAuctions: pastResult[0]?.total || 0,
            participatedAuctions: participatedResult[0]?.total || 0, // 🆕 Added count
            auctionResults: auctionResults || [],
            notifications: notifications || [],
        });

    } catch (error) {
        console.error("Server error:", error);
        res.status(500).send("Internal Server Error");
    }
});


router.post("/mark_notification_read", async (req, res) => {
    if (!req.session.isUser) return res.status(401).json({ error: "Unauthorized" });

    const { notificationId } = req.body;
    if (!notificationId) return res.status(400).json({ error: "Notification ID is required" });

    try {
        const result = await queryAsync("UPDATE Notifications SET read_status = 1 WHERE notification_id = ?", [notificationId]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: "Notification not found or already read" });
        }

        res.redirect("/userDashboard/user/dashboard_user"); // ✅ Redirect back to the dashboard after marking as read
    } catch (err) {
        console.error("Database error:", err);
        return res.status(500).json({ error: "Database error" });
    }
});

router.post('/delete_notification', async (req, res) => {
    const { notificationId } = req.body;

    if (!notificationId) {
        return res.status(400).send("Invalid notification ID");
    }

    try {
        await queryAsync('UPDATE Notifications SET deleted = TRUE WHERE notification_id = ?', [notificationId]);
        res.redirect('/userDashboard/user/dashboard_user');
    } catch (err) {
        console.error('Error deleting notification:', err);
        res.status(500).send('Internal Server Error');
    }
});

//------------------------------------------------------------------------------------------------------------------------------------------------
// Fetch Categories Function (Promisified)
const fetchCategories = async () => {
    try {
        const categories = await queryAsync('SELECT category_id, category_name FROM categories');
        return categories;
    } catch (err) {
        console.error('Error fetching categories:', err);
        return [];
    }
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

// Set up storage for uploaded images
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.join(__dirname, '../img2')); // Specify folder to save images
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname)); // Set unique file name
    }
});

// File filter to allow only images
const fileFilter = (req, file, cb) => {
    const allowedTypes = ["image/jpeg", "image/png", "image/jpg"];
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error("Only JPEG, PNG, and JPG images are allowed"), false);
    }
};

// Initialize multer middleware
const upload = multer({ 
    storage: storage, 
    fileFilter: fileFilter 
});

// Render Make Auction Page
router.get('/user/make_auction', profileCheck, async (req, res) => {
    if (!req.session.isUser) return res.redirect('/authUser/login');

    try {
        const categories = await fetchCategories();
        res.render('user/make_auction', {
            id: req.session.userId,
            name: req.session.userName,
            categories: categories,
            message: undefined,
            error: undefined
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

// Handle Auction & Category Form Submission
router.post('/user/make_auction', profileCheck, upload.single('image'), async (req, res) => {
    if (!req.session.isUser) return res.redirect('/authUser/login');

    const { form_type } = req.body;

    if (form_type === 'category') {
        // Handle category form submission
        const { category_name, description } = req.body;

        try {
            await queryAsync('INSERT INTO categories (category_name, description) VALUES (?, ?)', [category_name, description]);
            res.render('user/make_auction', {
                id: req.session.userId,
                name: req.session.userName,
                categories: await fetchCategories(),
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
        // Extract auction details
        const { product_name, Product_description, starting_price, reserve_price, auction_start_date, auction_end_date, category_id, quantity, } = req.body;
        const image = req.file ? req.file.filename : null;
        const seller_id = req.session.userId;

        // Ensure the user uploaded an image
        if (!image) {
            return res.render('user/make_auction', {
                id: req.session.userId,
                name: req.session.userName,
                categories: await fetchCategories(),
                message: undefined,
                error: 'Product image is required!'
            });
        }

        // Validate auction dates
        const now = new Date();
        const startDate = new Date(auction_start_date);
        const endDate = new Date(auction_end_date);

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
            // Insert the new auction into the database
            const query = `
            INSERT INTO products 
            (product_name, description, starting_price, reserve_price, auction_start_date, 
            auction_end_date, category_id, image_url, seller_id, quantity) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

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
                quantity
            ]);

            console.log("✅ Auction created successfully!");

            res.render('user/make_auction', {
                id: req.session.userId,
                name: req.session.userName,
                categories: await fetchCategories(),
                message: 'Product added successfully!',
                error: undefined
            });

        } catch (err) {
            console.error('Error adding product:', err);
            res.render('user/make_auction', {
                id: req.session.userId,
                name: req.session.userName,
                categories: await fetchCategories(),
                message: undefined,
                error: 'An error occurred while adding the product. Please try again.'
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
                   c.category_name, p.created_at, p.quantity
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
router.get('/user/edit_auction/:productId', profileCheck, async (req, res) => {
    if (!req.session.isUser) return res.redirect('/authUser/login');

    const auctionId = req.params.productId;

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
router.post('/user/edit_auction/:productId', upload.single('image'), async (req, res) => {
    if (!req.session.isUser) return res.redirect('/authUser/login');

    const auctionId = req.params.productId;
    
    const { product_name, Product_description, quantity, starting_price, reserve_price, auction_start_date, auction_end_date, category_id } = req.body;
    const image = req.file ? req.file.filename : req.body.old_image; // Keep old image if no new one uploaded

    try {
        const query = `
            UPDATE products 
            SET product_name = ?, description = ?, starting_price = ?, reserve_price = ?,
                auction_start_date = ?, auction_end_date = ?, category_id = ?, image_url = ?, quantity = ?
            WHERE product_id = ? AND seller_id = ?
        `;

        await queryAsync(query, [
            product_name,
            Product_description, // Ensure this matches DB column name (`description`)
            starting_price,
            reserve_price,
            auction_start_date,
            auction_end_date,
            category_id,
            image,
            quantity, // Move quantity here before auctionId
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

router.get('/user/auction-result/:id', (req, res) => {
    if(!req.session.isUser) return res.redirect('/authUser/login');
    res.render('user/public_bid', {
        id: req.session.userId,
        name: req.session.userName
    });    
});

//------------------------------------------------------------------------------------------------------------------------------------------------
// Route to display logged-in user's auctions where at least one bidder participated
router.get('/user/public_bid', profileCheck, (req, res) => {
    const userId = req.session.userId; // Logged-in user ID

    // SQL query to get auctions created by the logged-in user that have at least one bid
    const auctionQuery = `
        SELECT DISTINCT p.product_id, p.product_name, p.description, p.starting_price, 
               p.reserve_price, p.quantity, p.auction_end_date, p.image_url, u.name AS seller_name
        FROM products p
        JOIN bids b ON p.product_id = b.product_id
        JOIN users u ON p.seller_id = u.id
        WHERE p.seller_id = ?`; // Only fetch auctions created by logged-in user

    db.query(auctionQuery, [userId], (err, auctions) => {
        if (err) {
            console.log(err);
            return res.status(500).send('Database Error');
        }

        if (auctions.length === 0) {
            return res.render('user/public_bid', { 
                id: userId, 
                name: req.session.userName,
                auctions: [], 
                bidsByAuction: {}  
            });
        }

        // Fetch all bids for these auctions
        const auctionIds = auctions.map(a => a.product_id);
        const bidQuery = `
            SELECT b.product_id, b.bid_amount, b.bid_time, u.id AS bidder_id, 
                   u.name AS bidder_name, u.email AS bidder_email
            FROM bids b
            JOIN users u ON b.bidder_id = u.id
            WHERE b.product_id IN (?) 
            ORDER BY b.bid_amount DESC`; // Highest bid first

        db.query(bidQuery, [auctionIds], (err, bidResults) => {
            if (err) {
                console.log(err);
                return res.status(500).send('Database Error');
            }

            // Group bids by auction
            const bidsByAuction = {};
            bidResults.forEach(bid => {
                if (!bidsByAuction[bid.product_id]) {
                    bidsByAuction[bid.product_id] = [];
                }
                bidsByAuction[bid.product_id].push(bid);
            });

            res.render('user/public_bid', {
                id: req.session.userId,
                name: req.session.userName,
                auctions: auctions,
                bidsByAuction: bidsByAuction
            });
        });
    });
});

//------------------------------------------------------------------------------------------------------------------------------------------------
// Route to display user's bid's
router.get('/user/auctions', profileCheck, (req, res) => {
    const userId = req.session.userId;
    const page = parseInt(req.query.page) || 1; // Get the page number, default to 1 if not provided
    const limit = 10; // Number of auctions per page
    const offset = (page - 1) * limit; // Calculate the offset for pagination

    // Query to count the total number of auctions
    const countQuery = `SELECT COUNT(*) AS total FROM products WHERE seller_id != ?`;
    
    // Query to fetch auctions for the current page
    const auctionQuery = `
    SELECT p.product_id, p.product_name, p.description, p.starting_price, p.reserve_price, 
           p.auction_end_date, p.image_url, p.quantity, u.name AS seller_name,
           EXISTS (
               SELECT 1 FROM bids b WHERE b.product_id = p.product_id AND b.bidder_id = ?
           ) AS has_bid
    FROM products p
    JOIN users u ON p.seller_id = u.id
    WHERE p.seller_id != ?
    ORDER BY p.auction_end_date ASC
    LIMIT ? OFFSET ?`;


    // First, get the total number of auctions
    db.query(countQuery, [userId], (err, countResults) => {
        if (err) {
            console.log(err);
            return res.status(500).send('Database Error');
        }

        const totalAuctions = countResults[0].total;
        const totalPages = Math.ceil(totalAuctions / limit); // Calculate total number of pages

        // Then, fetch the auctions for the current page
        db.query(auctionQuery, [userId, userId, limit, offset], (err, results) => {
            if (err) {
                console.log(err);
                return res.status(500).send('Database Error');
            }
        
            res.render('user/auctions', {
                id: userId,
                auctions: results,
                currentPage: page,
                totalPages: totalPages,
                name: req.session.userName
            });        
        });
    });
});

// Show bid form when the user clicks "Place a Bid"
router.get('/user/place-bid/:id', profileCheck, (req, res) => {
    const userId = req.session.userId;
    const auctionId = req.params.id;

    // Fetch auction details along with the highest bid
    const auctionQuery = `
        SELECT p.product_id, p.product_name, p.description, p.starting_price, p.reserve_price, 
               p.auction_end_date, p.image_url, p.quantity, u.name AS seller_name,
               (SELECT MAX(bid_amount) FROM Bids WHERE product_id = p.product_id) AS highest_bid
        FROM products p
        JOIN users u ON p.seller_id = u.id
        WHERE p.product_id = ?`;

    db.query(auctionQuery, [auctionId], (err, results) => {
        if (err) {
            console.log(err);
            return res.status(500).send('Database Error');
        }

        if (results.length === 0) {
            return res.status(404).send('Auction not found');
        }

        const auction = results[0];
        res.render('user/place-bid-form', {
            id: userId,
            auction: auction
        });
    });
});


// Handle Bid Form Submission
router.post('/user/place-bid/:id', profileCheck, (req, res) => {
    const userId = req.session.userId;
    const auctionId = req.params.id;
    const bidAmount = parseFloat(req.body.bid_amount); // Get bid amount from form

    // Ensure bid amount is greater than the current highest bid
    const currentBidQuery = `
        SELECT MAX(bid_amount) AS highest_bid
        FROM bids
        WHERE product_id = ?`;

    db.query(currentBidQuery, [auctionId], (err, result) => {
        if (err) {
            console.log(err);
            return res.status(500).send('Database Error');
        }

        const highestBid = result[0].highest_bid || 0; // If no bids, set highest bid to 0

        // Ensure the new bid is higher than the current highest bid
        if (bidAmount <= highestBid) {
            return res.status(400).send('Your bid must be higher than the current highest bid');
        }

        // Insert the new bid into the Bids table
        const insertBidQuery = `
            INSERT INTO bids (product_id, bidder_id, bid_amount)
            VALUES (?, ?, ?)`;

        db.query(insertBidQuery, [auctionId, userId, bidAmount], (err) => {
            if (err) {
                console.log(err);
                return res.status(500).send('Error placing your bid');
            }

            // Redirect to the auction page or show success message
            res.redirect(`/userDashboard/user/auctions`);
        });
    });
});

//-------------------------------------------------------------------------------------------------------------------------------------------------
// Route to display user's bids
router.get('/user/bids', profileCheck, (req, res) => {
    const userId = req.session.userId;

    // SQL query to get all bids made by the logged-in user, along with auction details and highest bid
    const bidQuery = `
        SELECT 
            b.bid_id, 
            p.product_id, 
            p.product_name, 
            p.description, 
            p.starting_price, 
            p.reserve_price, 
            b.bid_amount, 
            b.bid_time, 
            p.auction_end_date, 
            p.image_url, 
            p.quantity,
            u.name AS seller_name,
            (SELECT MAX(bid_amount) FROM bids WHERE product_id = p.product_id) AS highest_bid
        FROM bids b
        JOIN products p ON b.product_id = p.product_id
        JOIN users u ON p.seller_id = u.id
        WHERE b.bidder_id = ?  
        ORDER BY b.bid_time DESC`; 

    db.query(bidQuery, [userId], (err, results) => {
        if (err) {
            console.log(err);
            return res.status(500).send('Database Error');
        }

        res.render('user/bids', {
            id: userId,
            bids: results, // Pass the bids data
            name: req.session.userName
        });
    });
});

// Route to delete a bid
router.post('/user/bids/delete/:bid_id', profileCheck, (req, res) => {
    const bidId = req.params.bid_id;
    const userId = req.session.userId;

    // SQL query to check if the logged-in user owns the bid
    const checkBidOwnershipQuery = `SELECT * FROM bids WHERE bid_id = ? AND bidder_id = ?`;

    db.query(checkBidOwnershipQuery, [bidId, userId], (err, results) => {
        if (err) {
            console.log(err);
            return res.status(500).send('Database Error');
        }

        if (results.length === 0) {
            return res.status(403).send('You are not authorized to delete this bid');
        }

        // SQL query to delete the bid
        const deleteBidQuery = `DELETE FROM bids WHERE bid_id = ?`;

        db.query(deleteBidQuery, [bidId], (err) => {
            if (err) {
                console.log(err);
                return res.status(500).send('Database Error');
            }

            res.redirect('/userDashboard/user/bids'); // Redirect to the user's bids page after deletion
        });
    });
});
// Route to display edit bid form
router.get('/user/bids/edit/:bid_id', profileCheck, (req, res) => {
    const bidId = req.params.bid_id;
    const userId = req.session.userId;

    // Query to fetch the bid details for editing
    const editBidQuery = `
        SELECT b.bid_id, b.bid_amount, p.product_id, p.product_name
        FROM bids b
        JOIN products p ON b.product_id = p.product_id
        WHERE b.bid_id = ? AND b.bidder_id = ?`;

    db.query(editBidQuery, [bidId, userId], (err, results) => {
        if (err) {
            console.log(err);
            return res.status(500).send('Database Error');
        }

        if (results.length === 0) {
            return res.status(403).send('You are not authorized to edit this bid');
        }

        res.render('user/edit-bid', {
            bid: results[0], // Pass the bid details to the view
            id: userId,
            name: req.session.userName
        });
    });
});
// Route to update the bid
router.post('/user/bids/edit/:bid_id', profileCheck, (req, res) => {
    const bidId = req.params.bid_id;
    const newBidAmount = req.body.bid_amount; // Assuming you are sending the new bid amount via a POST form
    const userId = req.session.userId;

    // SQL query to check if the logged-in user owns the bid
    const checkBidOwnershipQuery = `SELECT * FROM bids WHERE bid_id = ? AND bidder_id = ?`;

    db.query(checkBidOwnershipQuery, [bidId, userId], (err, results) => {
        if (err) {
            console.log(err);
            return res.status(500).send('Database Error');
        }

        if (results.length === 0) {
            return res.status(403).send('You are not authorized to edit this bid');
        }

        // SQL query to update the bid amount
        const updateBidQuery = `UPDATE bids SET bid_amount = ? WHERE bid_id = ?`;

        db.query(updateBidQuery, [newBidAmount, bidId], (err) => {
            if (err) {
                console.log(err);
                return res.status(500).send('Database Error');
            }

            res.redirect('/userDashboard/user/bids'); // Redirect to the user's bids page after editing
        });
    });
});

//-------------------------------------------------------------------------------------------------------------------------------------------------
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
