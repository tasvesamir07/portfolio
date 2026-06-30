import type { Request, Response } from 'express';
const validate = require('../middleware/validation');
const { messageSchema } = require('../utils/validation');
const express = require('express');
const router = express.Router();
const db = require('../db');
const authenticateToken = require('../auth');
const { messageLimiter } = require('../middleware/rateLimit');

router.get('/', authenticateToken, async (req: Request, res: Response) => {
    try {
        const result = await db.query('SELECT * FROM messages ORDER BY created_at DESC');
        res.json(result.rows);
    } catch (err: any) {
        res.status(500).json({ error: process.env.NODE_ENV === 'production' ? 'An internal error occurred.' : err.message });
    }
});

router.post('/', messageLimiter, validate(messageSchema), async (req: Request, res: Response) => {
    const { name, email, message } = req.body;
    try {
        const result = await db.query(
            'INSERT INTO messages (name, email, message) VALUES ($1,$2,$3) RETURNING *',
            [name||'', email||'', message||'']
        );
        res.status(201).json(result.rows[0]);
    } catch (err: any) {
        res.status(500).json({ error: process.env.NODE_ENV === 'production' ? 'An internal error occurred.' : err.message });
    }
});

router.delete('/:id', authenticateToken, async (req: Request, res: Response) => {
    try {
        await db.query('DELETE FROM messages WHERE id=$1', [req.params.id]);
        res.sendStatus(204);
    } catch (err: any) {
        res.status(500).json({ error: process.env.NODE_ENV === 'production' ? 'An internal error occurred.' : err.message });
    }
});

export = router;
