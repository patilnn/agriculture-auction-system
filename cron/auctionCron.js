const cron = require('node-cron');
const db = require('../config/db');

// Promisified query function for MySQL
function queryAsync(sql, params) {
    return new Promise((resolve, reject) => {
        db.query(sql, params, (err, result) => {
            if (err) return reject(err);
            resolve(result);
        });
    });
}

cron.schedule('* * * * *', async () => {
    const now = new Date();

    try {
        // **1️⃣ Auction Start Notification** (Only if not notified before)
        const auctionsStarting = await queryAsync(
            `SELECT product_id, seller_id, product_name, quantity 
             FROM Products 
             WHERE auction_start_date <= ? 
             AND quantity > 0 
             AND auction_start_notified = FALSE`,
            [now]
        );

        for (let auction of auctionsStarting) {
            await queryAsync(
                'INSERT INTO Notifications (user_id, auction_id, message) VALUES (?, ?, ?)',
                [auction.seller_id, auction.product_id, `Auction for ${auction.product_name} (Quantity: ${auction.quantity}) has started`]
            );
            await queryAsync(
                'UPDATE Products SET auction_start_notified = TRUE WHERE product_id = ?',
                [auction.product_id]
            );
        }

        // **2️⃣ Auction Ending Soon (1 Day Before End) - No Change Needed**
        const auctionsEndingSoon = await queryAsync(
            `SELECT product_id, seller_id, product_name, quantity 
             FROM Products 
             WHERE auction_end_date <= ? 
             AND quantity > 0 
             AND product_id NOT IN 
                 (SELECT auction_id FROM Notifications WHERE message LIKE "Reminder:%ending soon%")`,
            [new Date(now.getTime() + 24 * 60 * 60 * 1000)]
        );

        for (let auction of auctionsEndingSoon) {
            await queryAsync(
                'INSERT INTO Notifications (user_id, auction_id, message) VALUES (?, ?, ?)',
                [auction.seller_id, auction.product_id, `Reminder: Your auction for ${auction.product_name} (Quantity: ${auction.quantity}) is ending soon.`]
            );
        }

        // **3️⃣ Auction End Notification** (Only if not notified before)
        const auctionsEnded = await queryAsync(
            `SELECT product_id, seller_id, product_name, quantity 
             FROM Products 
             WHERE auction_end_date <= ? 
             AND auction_end_notified = FALSE`,
            [now]
        );

        for (let auction of auctionsEnded) {
            await queryAsync(
                'INSERT INTO Notifications (user_id, auction_id, message) VALUES (?, ?, ?)',
                [auction.seller_id, auction.product_id, `${auction.product_name} (Quantity: ${auction.quantity}) auction has ended.`]
            );
            await queryAsync(
                'UPDATE Products SET auction_end_notified = TRUE WHERE product_id = ?',
                [auction.product_id]
            );
        }

    } catch (err) {
        console.error('🚨 Cron job error:', err);
    }
});

console.log("✅ Auction notification cron job scheduled to run every minute.");
