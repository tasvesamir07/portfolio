const express = require('express');
const router = express.Router();
const db = require('../db');
const authenticateToken = require('../auth');

router.put('/:table', authenticateToken, async (req, res) => {
    const { table } = req.params;
    const { orders } = req.body; // Array of {id, sort_order}
    const allowedTables = ['academics', 'experiences', 'trainings', 'skills', 'research', 'publications', 'social_links', 'research_interests', 'gallery', 'gallery_categories', 'newspapers'];
    
    if (!allowedTables.includes(table)) {
        return res.status(400).json({ error: 'Invalid table' });
    }

    try {
        const client = await db.connect();
        try {
            await client.query('BEGIN');
            for (const item of orders) {
                const query = `UPDATE "${table}" SET "sort_order" = $1 WHERE "id" = $2`;
                await client.query(query, [item.sort_order, item.id]);
            }
            await client.query('COMMIT');
            res.json({ message: 'Order updated successfully' });
        } catch (err) {
            await client.query('ROLLBACK');
            throw err;
        } finally {
            client.release();
        }
    } catch (err) {
        console.error('Reorder Endpoint Error:', err);
        res.status(500).json({ error: process.env.NODE_ENV === 'production' ? 'An internal error occurred.' : err.message });
    }
});

module.exports = router;
