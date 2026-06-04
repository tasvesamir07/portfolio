const express = require('express');
const router = express.Router();
const db = require('../db');
const authenticateToken = require('../auth');

router.post('/', async (req, res) => {
    const { message, website } = req.body || {};
    
    // Honeypot check (website is a hidden field for bots)
    if (website && website.trim() !== '') {
        console.log('[Honeypot Triggered] Silently ignoring bot message submission');
        return res.status(201).json({ success: true, message: 'Message sent successfully' });
    }

    if (!message || typeof message !== 'string' || message.trim() === '') {
        return res.status(400).json({ error: 'Message cannot be empty.' });
    }

    try {
        const ipAddress = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
        await db.query(
            'INSERT INTO anonymous_messages (message, ip_address) VALUES ($1, $2)',
            [message.trim(), ipAddress]
        );
        res.status(201).json({ success: true, message: 'Message sent successfully' });
    } catch (err) {
        res.status(500).json({ error: process.env.NODE_ENV === 'production' ? 'An internal error occurred.' : err.message });
    }
});

router.get('/', authenticateToken, async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM anonymous_messages ORDER BY created_at DESC');
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: process.env.NODE_ENV === 'production' ? 'An internal error occurred.' : err.message });
    }
});

router.put('/:id', authenticateToken, async (req, res) => {
    const { is_read } = req.body || {};
    try {
        const result = await db.query(
            'UPDATE anonymous_messages SET is_read = $1 WHERE id = $2 RETURNING *',
            [is_read === true, req.params.id]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Message not found.' });
        }
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: process.env.NODE_ENV === 'production' ? 'An internal error occurred.' : err.message });
    }
});

router.delete('/:id', authenticateToken, async (req, res) => {
    try {
        const result = await db.query('DELETE FROM anonymous_messages WHERE id = $1 RETURNING *', [req.params.id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Message not found.' });
        }
        res.sendStatus(204);
    } catch (err) {
        res.status(500).json({ error: process.env.NODE_ENV === 'production' ? 'An internal error occurred.' : err.message });
    }
});

module.exports = router;
