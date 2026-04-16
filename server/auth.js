const jwt = require('jsonwebtoken');
require('dotenv').config();

const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.sendStatus(401);

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) {
            console.error('JWT Verification Error:', err.name, err.message);
            return res.status(403).json({ 
                error: 'Forbidden', 
                message: err.name === 'TokenExpiredError' ? 'Session expired. Please log in again.' : 'Invalid token.' 
            });
        }
        req.user = user;
        next();
    });
};

module.exports = authenticateToken;
