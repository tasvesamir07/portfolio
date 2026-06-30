import type { Request, Response } from 'express';
const validate = require('../middleware/validation');
const { reorderSchema } = require('../utils/validation');
const express = require('express');
const router = express.Router();
const db = require('../db');
const authenticateToken = require('../auth');

router.put('/:table', authenticateToken, validate(reorderSchema), async (req: Request, res: Response) => {
    const table = req.params.table as string;
    const { orders } = req.body;
    const allowedTables = ['academics', 'experiences', 'trainings', 'skills', 'research', 'publications', 'social_links', 'research_interests', 'gallery', 'gallery_categories', 'newspapers'];

    if (!allowedTables.includes(table)) {
        res.status(400).json({ error: 'Invalid table' });
        return;
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
    } catch (err: any) {
        console.error('Reorder Endpoint Error:', err);
        res.status(500).json({ error: process.env.NODE_ENV === 'production' ? 'An internal error occurred.' : err.message });
    }
});

export = router;
