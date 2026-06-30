import type { Request, Response } from 'express';
const validate = require('../middleware/validation');
const { anonymousMessageSchema } = require('../utils/validation');
const express = require('express');
const router = express.Router();
const db = require('../db');
const authenticateToken = require('../auth');
const { anonymousLimiter } = require('../middleware/rateLimit');

router.get('/', authenticateToken, async (req: Request, res: Response) => {
    try {
        const result = await db.query('SELECT * FROM anonymous_messages ORDER BY created_at DESC');
        res.json(result.rows);
    } catch (err: any) {
        res.status(500).json({ error: process.env.NODE_ENV === 'production' ? 'An internal error occurred.' : err.message });
    }
});

router.post('/', anonymousLimiter, validate(anonymousMessageSchema), async (req: Request, res: Response) => {
    const { message } = req.body;
    const website = req.body?.website || '';
    if (website) {
        res.json({ success: true });
        return;
    }
    try {
        const ipAddress = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
        const result = await db.query(
            'INSERT INTO anonymous_messages (message, ip_address) VALUES ($1,$2) RETURNING *',
            [message||'', ipAddress]
        );
        res.status(201).json(result.rows[0]);
    } catch (err: any) {
        res.status(500).json({ error: process.env.NODE_ENV === 'production' ? 'An internal error occurred.' : err.message });
    }
});

router.put('/read/:id', authenticateToken, async (req: Request, res: Response) => {
    try {
        const result = await db.query('UPDATE anonymous_messages SET is_read = true WHERE id = $1 RETURNING *', [req.params.id]);
        if (result.rows.length === 0) {
            res.status(404).json({ error: 'Message not found' });
            return;
        }
        res.json(result.rows[0]);
    } catch (err: any) {
        res.status(500).json({ error: process.env.NODE_ENV === 'production' ? 'An internal error occurred.' : err.message });
    }
});

router.delete('/:id', authenticateToken, async (req: Request, res: Response) => {
    try {
        await db.query('DELETE FROM anonymous_messages WHERE id=$1', [req.params.id]);
        res.sendStatus(204);
    } catch (err: any) {
        res.status(500).json({ error: process.env.NODE_ENV === 'production' ? 'An internal error occurred.' : err.message });
    }
});

export = router;
