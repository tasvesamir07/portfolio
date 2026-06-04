const express = require('express');
const router = express.Router();
const db = require('../db');
const authenticateToken = require('../auth');
const { cleanMediaUrls } = require('../utils/media');

router.get('/', async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM "gallery_categories" ORDER BY "sort_order" ASC, "name" ASC');
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: process.env.NODE_ENV === 'production' ? 'An internal error occurred.' : err.message });
    }
});

router.post('/', authenticateToken, async (req, res) => {
    try {
        const { name } = req.body;
        const result = await db.query(
            'INSERT INTO gallery_categories (name) VALUES ($1) RETURNING *',
            [name]
        );
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: process.env.NODE_ENV === 'production' ? 'An internal error occurred.' : err.message });
    }
});

router.put('/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { name } = req.body;
        const result = await db.query(
            'UPDATE gallery_categories SET name = $1 WHERE id = $2 RETURNING *',
            [name, id]
        );
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: process.env.NODE_ENV === 'production' ? 'An internal error occurred.' : err.message });
    }
});

router.delete('/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        
        const catRes = await db.query('SELECT name FROM gallery_categories WHERE id = $1', [id]);
        if (catRes.rows.length === 0) return res.status(404).json({ error: 'Category not found' });
        
        const catName = catRes.rows[0].name;
        const galleryRows = await db.query('SELECT image_url FROM gallery WHERE category = $1', [catName]);

        await db.query('BEGIN');
        
        await db.query('DELETE FROM gallery WHERE category = $1', [catName]);
        await db.query('DELETE FROM gallery_categories WHERE id = $1', [id]);
        
        await db.query('COMMIT');
        await cleanMediaUrls(galleryRows.rows.map((row) => row.image_url));
        
        res.json({ message: 'Category and all associated images deleted successfully' });
    } catch (err) {
        await db.query('ROLLBACK');
        console.error('Delete Category Error:', err);
        res.status(500).json({ error: process.env.NODE_ENV === 'production' ? 'An internal error occurred.' : err.message });
    }
});

module.exports = router;
