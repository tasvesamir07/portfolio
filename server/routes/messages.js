const validate = require('../middleware/validation');
const { messageSchema } = require('../utils/validation');
const express = require('express');
const router = express.Router();
const db = require('../db');
const authenticateToken = require('../auth');

router.post('/', validate(messageSchema), async (req, res) => {
    const { name, email, message } = req.body;
    try {
        await db.query('INSERT INTO messages (name, email, message) VALUES ($1, $2, $3)', [name, email, message]);
        res.status(201).json({ message: 'Message sent successfully' });
    } catch (err) {
        res.status(500).json({ error: process.env.NODE_ENV === 'production' ? 'An internal error occurred.' : err.message });
    }
});

router.get('/', authenticateToken, async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM messages ORDER BY created_at DESC');
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: process.env.NODE_ENV === 'production' ? 'An internal error occurred.' : err.message });
    }
});

router.delete('/:id', authenticateToken, async (req, res) => {
    try {
        await db.query('DELETE FROM messages WHERE id = $1', [req.params.id]);
        res.sendStatus(204);
    } catch (err) {
        res.status(500).json({ error: process.env.NODE_ENV === 'production' ? 'An internal error occurred.' : err.message });
    }
});

module.exports = router;
