const express = require('express');
const router = express.Router();

router.get('/', async (req, res) => {
    // Authenticate: check cron secret or allow bypass in dev if CRON_SECRET is not configured
    const authHeader = req.headers.authorization;
    const expectedSecret = process.env.CRON_SECRET;
    
    if (process.env.NODE_ENV === 'production' && expectedSecret) {
        if (!authHeader || authHeader !== `Bearer ${expectedSecret}`) {
            return res.status(401).json({ error: 'Unauthorized cron request.' });
        }
    }

    const targetLanguages = ['bn', 'ko'];
    
    const endpoints = [
        '/api/about',
        '/api/academics',
        '/api/publications',
        '/api/research',
        '/api/research-interests',
        '/api/gallery',
        '/api/gallery-categories',
        '/api/social-links',
        '/api/pages',
        '/api/trainings',
        '/api/skills',
        '/api/experiences'
    ];
    
    const host = req.headers.host || `localhost:${process.env.PORT || 5000}`;
    const protocol = req.headers['x-forwarded-proto'] || 'http';
    
    const results = [];
    
    try {
        const requests = [];
        for (const lang of targetLanguages) {
            for (const endpoint of endpoints) {
                const url = `${protocol}://${host}${endpoint}`;
                requests.push((async () => {
                    try {
                        const response = await fetch(url, {
                            method: 'GET',
                            headers: {
                                'x-translate-language': lang,
                                'x-skip-auto-translate': '0'
                            }
                        });
                        results.push({ endpoint, lang, status: response.status });
                    } catch (err) {
                        results.push({ endpoint, lang, error: err.message });
                    }
                })());
            }
        }
        
        await Promise.all(requests);
        res.json({ message: 'Pre-warm complete', results });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
