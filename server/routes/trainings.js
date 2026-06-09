const validate = require('../middleware/validation');
const { trainingsSchema } = require('../utils/validation');
const express = require('express');
const router = express.Router();
const db = require('../db');
const authenticateToken = require('../auth');
const { localizeDataObject } = require('../middleware/autoTranslate');

const LANGUAGE_HEADER = 'x-translate-language';

router.get('/', async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM trainings ORDER BY sort_order ASC, created_at DESC');
        const language = req.headers[LANGUAGE_HEADER] || 'en';
        res.json(localizeDataObject(result.rows, language));
    } catch (err) {
        res.status(500).json({ error: process.env.NODE_ENV === 'production' ? 'An internal error occurred.' : err.message });
    }
});

router.post('/', authenticateToken, validate(trainingsSchema), async (req, res) => {
    const { title, topic, date_text, instructor, details_json } = req.body;
    try {
        const result = await db.query(
            'INSERT INTO trainings (title, topic, date_text, instructor, details_json) VALUES ($1, $2, $3, $4, $5) RETURNING *',
            [title || '', topic || '', date_text || '', instructor || '', details_json || '']
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: process.env.NODE_ENV === 'production' ? 'An internal error occurred.' : err.message });
    }
});

router.put('/:id', authenticateToken, validate(trainingsSchema), async (req, res) => {
    const { title, topic, date_text, instructor, details_json } = req.body;
    try {
        const result = await db.query(
            'UPDATE trainings SET title = $1, topic = $2, date_text = $3, instructor = $4, details_json = $5 WHERE id = $6 RETURNING *',
            [title || '', topic || '', date_text || '', instructor || '', details_json || '', req.params.id]
        );
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: process.env.NODE_ENV === 'production' ? 'An internal error occurred.' : err.message });
    }
});

router.delete('/:id', authenticateToken, async (req, res) => {
    try {
        await db.query('DELETE FROM trainings WHERE id = $1', [req.params.id]);
        res.sendStatus(204);
    } catch (err) {
        res.status(500).json({ error: process.env.NODE_ENV === 'production' ? 'An internal error occurred.' : err.message });
    }
});

module.exports = router;
