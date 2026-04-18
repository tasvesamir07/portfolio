const bcrypt = require('bcryptjs');
require('dotenv').config();
const db = require('../db');

async function resetPassword() {
    try {
        const newPassword = 'admin';
        const saltRounds = 10;
        const passwordHash = await bcrypt.hash(newPassword, saltRounds);
        
        const result = await db.query(
            'UPDATE users SET password_hash = $1 WHERE username = $2',
            [passwordHash, 'admin']
        );
        
        if (result.rowCount > 0 || (result.rows && result.rows.length === 0 && result.command === 'UPDATE')) {
             console.log("Successfully reset 'admin' password to 'admin'");
        } else {
            console.log("User 'admin' not found or update failed.");
        }
    } catch (err) {
        console.error('Error resetting password:', err);
    } finally {
        process.exit();
    }
}

resetPassword();
