process.env.UPSTASH_REDIS_URL = 'https://mock-redis.upstash.io';
process.env.UPSTASH_REDIS_TOKEN = 'mock-token';

const mockRedisInstance = {
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue(true),
    keys: jest.fn().mockResolvedValue([]),
    del: jest.fn().mockResolvedValue(1)
};

jest.mock('@upstash/redis', () => ({
    Redis: jest.fn().mockImplementation(() => mockRedisInstance)
}));

const request = require('supertest');
const app = require('../server');
const db = require('../db');
const jwt = require('jsonwebtoken');
const autoTranslate = require('../middleware/autoTranslate');

// Mock db and media cleaner
jest.mock('../db', () => ({
    query: jest.fn(),
    connect: jest.fn(),
}));

jest.mock('../utils/audit', () => ({
    logAuditActivity: jest.fn(),
}));

jest.mock('../utils/media', () => ({
    cleanMediaUrls: jest.fn().mockResolvedValue(true),
    diffRemovedMediaUrls: jest.fn().mockReturnValue([]),
}));

jest.mock('../translate', () => ({
    translateTexts: jest.fn().mockResolvedValue(['translated text']),
    getAllCachedTranslations: jest.fn().mockResolvedValue({ 'key': 'val' }),
    updateCachedTranslation: jest.fn().mockResolvedValue(true),
    deleteCachedTranslation: jest.fn().mockResolvedValue(true),
    clearRedisResponseCache: jest.fn().mockResolvedValue(true),
    getCacheStats: jest.fn().mockReturnValue({ l1Size: 10, maxEntries: 2000, redisConnected: false }),
    redis: null
}));

// Mock fetch globally
global.fetch = jest.fn().mockImplementation(() =>
    Promise.resolve({
        status: 200,
        json: () => Promise.resolve({ success: true }),
    })
);

describe('Server Routes Tests', () => {
    let validToken;

    beforeEach(() => {
        db.query.mockReset();
        db.connect.mockReset();
        jest.clearAllMocks();
        process.env.JWT_SECRET = 'test_secret_key_123456';
        validToken = jwt.sign(
            { id: 1, username: 'admin', email: 'admin@example.com' },
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
        );
    });

    describe('publications route', () => {
        it('GET /api/v1/publications should return publications', async () => {
            db.query
                .mockResolvedValueOnce({ rows: [{ total: '1' }] }) // count
                .mockResolvedValueOnce({ rows: [{ id: 1, title: 'Paper 1' }] }); // select
            
            const res = await request(app)
                .get('/api/v1/publications')
                .expect(200);

            expect(res.body).toEqual([{ id: 1, title: 'Paper 1' }]);
        });

        it('GET /api/v1/publications should support chunked streaming if rows >= 50', async () => {
            const mockRows = Array.from({ length: 55 }, (_, i) => ({ id: i, title: `Paper ${i}` }));
            db.query
                .mockResolvedValueOnce({ rows: [{ total: '55' }] })
                .mockResolvedValueOnce({ rows: mockRows });

            const res = await request(app)
                .get('/api/v1/publications?limit=100&offset=0')
                .expect(200);

            expect(res.body.length).toBe(55);
        });

        it('GET /api/v1/publications should handle DB errors', async () => {
            db.query.mockRejectedValueOnce(new Error('DB Fail'));
            const res = await request(app)
                .get('/api/v1/publications')
                .set('Authorization', `Bearer ${validToken}`)
                .expect(500);
            expect(res.body.error).toBe('DB Fail');
        });

        it('POST /api/v1/publications should insert a publication', async () => {
            db.query.mockResolvedValueOnce({ rows: [{ id: 1, title: 'New Paper' }] });
            
            const res = await request(app)
                .post('/api/v1/publications')
                .set('Authorization', `Bearer ${validToken}`)
                .send({ title: 'New Paper' })
                .expect(201);

            expect(res.body.title).toBe('New Paper');
        });

        it('PUT /api/v1/publications/:id should update publication', async () => {
            db.query.mockResolvedValueOnce({ rows: [{ id: 1, title: 'Updated Paper', old_thumbnail_url: '', old_file_url: '' }] }); // Update
            
            const res = await request(app)
                .put('/api/v1/publications/1')
                .set('Authorization', `Bearer ${validToken}`)
                .send({ title: 'Updated Paper' })
                .expect(200);

            expect(res.body.title).toBe('Updated Paper');
        });

        it('PUT /api/v1/publications/:id should skip media cleanup if not found', async () => {
            db.query.mockResolvedValueOnce({ rows: [] }); // Not found
            
            await request(app)
                .put('/api/v1/publications/999')
                .set('Authorization', `Bearer ${validToken}`)
                .send({ title: 'Nonexistent' })
                .expect(200);
        });

        it('DELETE /api/v1/publications/:id should delete publication', async () => {
            db.query.mockResolvedValueOnce({ rows: [{ thumbnail_url: 'pic.png', file_url: 'doc.pdf' }] }); // Delete
            
            await request(app)
                .delete('/api/v1/publications/1')
                .set('Authorization', `Bearer ${validToken}`)
                .expect(204);
        });
    });

    describe('research route', () => {
        it('GET /api/v1/research should return research items', async () => {
            db.query.mockResolvedValueOnce({ rows: [{ id: 1, title: 'Research X' }] });
            
            const res = await request(app)
                .get('/api/v1/research')
                .expect(200);

            expect(res.body).toEqual([{ id: 1, title: 'Research X' }]);
        });

        it('POST /api/v1/research should create research item', async () => {
            db.query.mockResolvedValueOnce({ rows: [{ id: 1, title: 'New Research' }] });
            
            const res = await request(app)
                .post('/api/v1/research')
                .set('Authorization', `Bearer ${validToken}`)
                .send({ title: 'New Research' })
                .expect(201);

            expect(res.body.title).toBe('New Research');
        });

        it('PUT /api/v1/research/:id should update research item', async () => {
            db.query.mockResolvedValueOnce({ rows: [{ id: 1, title: 'Updated Research', old_image_url: '', old_file_url: '' }] });
            
            const res = await request(app)
                .put('/api/v1/research/1')
                .set('Authorization', `Bearer ${validToken}`)
                .send({ title: 'Updated Research' })
                .expect(200);

            expect(res.body.title).toBe('Updated Research');
        });

        it('DELETE /api/v1/research/:id should delete research item', async () => {
            db.query.mockResolvedValueOnce({ rows: [{ image_url: '', file_url: '' }] });
            
            await request(app)
                .delete('/api/v1/research/1')
                .set('Authorization', `Bearer ${validToken}`)
                .expect(204);
        });
    });

    describe('skills route', () => {
        it('GET /api/v1/skills should return skills', async () => {
            db.query.mockResolvedValueOnce({ rows: [{ id: 1, category: 'Backend' }] });
            
            const res = await request(app)
                .get('/api/v1/skills')
                .expect(200);

            expect(res.body).toEqual([{ id: 1, category: 'Backend' }]);
        });

        it('POST /api/v1/skills should create skill', async () => {
            db.query.mockResolvedValueOnce({ rows: [{ id: 1, category: 'Frontend' }] });
            
            const res = await request(app)
                .post('/api/v1/skills')
                .set('Authorization', `Bearer ${validToken}`)
                .send({ category: 'Frontend' })
                .expect(201);

            expect(res.body.category).toBe('Frontend');
        });

        it('PUT /api/v1/skills/:id should update skill', async () => {
            db.query.mockResolvedValueOnce({ rows: [{ id: 1, category: 'Backend' }] });
            
            const res = await request(app)
                .put('/api/v1/skills/1')
                .set('Authorization', `Bearer ${validToken}`)
                .send({ category: 'Backend' })
                .expect(200);

            expect(res.body.category).toBe('Backend');
        });

        it('DELETE /api/v1/skills/:id should handle DB error', async () => {
            db.query.mockRejectedValueOnce(new Error('Delete Error'));
            
            await request(app)
                .delete('/api/v1/skills/1')
                .set('Authorization', `Bearer ${validToken}`)
                .expect(500);
        });
    });

    describe('experiences route', () => {
        it('GET /api/v1/experiences should return experiences', async () => {
            db.query.mockResolvedValueOnce({ rows: [{ id: 1, company: 'Google' }] });
            
            const res = await request(app)
                .get('/api/v1/experiences')
                .expect(200);

            expect(res.body).toEqual([{ id: 1, company: 'Google' }]);
        });

        it('POST /api/v1/experiences should create experience', async () => {
            db.query.mockResolvedValueOnce({ rows: [{ id: 1, company: 'Google' }] });
            
            const res = await request(app)
                .post('/api/v1/experiences')
                .set('Authorization', `Bearer ${validToken}`)
                .send({ company: 'Google' })
                .expect(201);

            expect(res.body.company).toBe('Google');
        });

        it('PUT /api/v1/experiences/:id should update experience', async () => {
            db.query.mockResolvedValueOnce({ rows: [{ id: 1, company: 'Apple', old_logo_url: '' }] });
            
            const res = await request(app)
                .put('/api/v1/experiences/1')
                .set('Authorization', `Bearer ${validToken}`)
                .send({ company: 'Apple' })
                .expect(200);

            expect(res.body.company).toBe('Apple');
        });

        it('DELETE /api/v1/experiences/:id should delete experience', async () => {
            db.query.mockResolvedValueOnce({ rows: [{ logo_url: '' }] });
            
            await request(app)
                .delete('/api/v1/experiences/1')
                .set('Authorization', `Bearer ${validToken}`)
                .expect(204);
        });
    });

    describe('trainings route', () => {
        it('GET /api/v1/trainings should return trainings', async () => {
            db.query.mockResolvedValueOnce({ rows: [{ id: 1, title: 'Deep Learning' }] });
            
            const res = await request(app)
                .get('/api/v1/trainings')
                .expect(200);

            expect(res.body).toEqual([{ id: 1, title: 'Deep Learning' }]);
        });

        it('POST /api/v1/trainings should create training', async () => {
            db.query.mockResolvedValueOnce({ rows: [{ id: 1, title: 'AI Training' }] });
            
            const res = await request(app)
                .post('/api/v1/trainings')
                .set('Authorization', `Bearer ${validToken}`)
                .send({ title: 'AI Training' })
                .expect(201);

            expect(res.body.title).toBe('AI Training');
        });

        it('PUT /api/v1/trainings/:id should update training', async () => {
            db.query.mockResolvedValueOnce({ rows: [{ id: 1, title: 'Advanced AI Training' }] });
            
            const res = await request(app)
                .put('/api/v1/trainings/1')
                .set('Authorization', `Bearer ${validToken}`)
                .send({ title: 'Advanced AI Training' })
                .expect(200);

            expect(res.body.title).toBe('Advanced AI Training');
        });

        it('DELETE /api/v1/trainings/:id should delete training', async () => {
            db.query.mockResolvedValueOnce({ rows: [] });
            
            await request(app)
                .delete('/api/v1/trainings/1')
                .set('Authorization', `Bearer ${validToken}`)
                .expect(204);
        });
    });

    describe('socialLinks route', () => {
        it('GET /api/v1/social-links should return social links', async () => {
            db.query.mockResolvedValueOnce({ rows: [{ id: 1, platform: 'GitHub', url: 'https://github.com' }] });
            
            const res = await request(app)
                .get('/api/v1/social-links')
                .expect(200);

            expect(res.body).toEqual([{ id: 1, platform: 'GitHub', url: 'https://github.com' }]);
        });

        it('POST /api/v1/social-links should create social link', async () => {
            db.query.mockResolvedValueOnce({ rows: [{ id: 1, platform: 'LinkedIn', url: 'https://linkedin.com' }] });
            
            const res = await request(app)
                .post('/api/v1/social-links')
                .set('Authorization', `Bearer ${validToken}`)
                .send({ platform: 'LinkedIn', url: 'https://linkedin.com' })
                .expect(201);

            expect(res.body.platform).toBe('LinkedIn');
        });

        it('PUT /api/v1/social-links/:id should update social link', async () => {
            db.query.mockResolvedValueOnce({ rows: [{ id: 1, platform: 'LinkedIn Updated', url: 'https://linkedin.com' }] });
            
            const res = await request(app)
                .put('/api/v1/social-links/1')
                .set('Authorization', `Bearer ${validToken}`)
                .send({ platform: 'LinkedIn Updated', url: 'https://linkedin.com' })
                .expect(200);

            expect(res.body.platform).toBe('LinkedIn Updated');
        });

        it('DELETE /api/v1/social-links/:id should delete social link', async () => {
            db.query.mockResolvedValueOnce({ rows: [] });
            
            await request(app)
                .delete('/api/v1/social-links/1')
                .set('Authorization', `Bearer ${validToken}`)
                .expect(204);
        });
    });

    describe('messages route', () => {
        it('POST /api/v1/messages should submit a message', async () => {
            db.query.mockResolvedValueOnce({ rows: [] });

            const res = await request(app)
                .post('/api/v1/messages')
                .send({ name: 'Samir', email: 'samir@test.com', message: 'Hello!' })
                .expect(201);

            expect(res.body.message).toBe('Message sent successfully');
        });

        it('GET /api/v1/messages should return messages if authorized', async () => {
            db.query.mockResolvedValueOnce({ rows: [{ id: 1, name: 'Samir', message: 'Hello!' }] });

            const res = await request(app)
                .get('/api/v1/messages')
                .set('Authorization', `Bearer ${validToken}`)
                .expect(200);

            expect(res.body).toEqual([{ id: 1, name: 'Samir', message: 'Hello!' }]);
        });

        it('DELETE /api/v1/messages/:id should delete a message', async () => {
            db.query.mockResolvedValueOnce({ rows: [] });

            await request(app)
                .delete('/api/v1/messages/1')
                .set('Authorization', `Bearer ${validToken}`)
                .expect(204);
        });
    });

    describe('anonymousMessages route', () => {
        it('POST /api/v1/anonymous-messages should submit a message', async () => {
            db.query.mockResolvedValueOnce({ rows: [] });

            const res = await request(app)
                .post('/api/v1/anonymous-messages')
                .send({ message: 'Secret message' })
                .expect(201);

            expect(res.body.success).toBe(true);
        });

        it('POST /api/v1/anonymous-messages should fail on empty message', async () => {
            await request(app)
                .post('/api/v1/anonymous-messages')
                .send({ message: '' })
                .expect(400);
        });

        it('GET /api/v1/anonymous-messages should return messages', async () => {
            db.query.mockResolvedValueOnce({ rows: [{ id: 1, message: 'Secret' }] });

            const res = await request(app)
                .get('/api/v1/anonymous-messages')
                .set('Authorization', `Bearer ${validToken}`)
                .expect(200);

            expect(res.body).toEqual([{ id: 1, message: 'Secret' }]);
        });

        it('PUT /api/v1/anonymous-messages/:id should update read status', async () => {
            db.query.mockResolvedValueOnce({ rows: [{ id: 1, message: 'Secret', is_read: true }] });

            const res = await request(app)
                .put('/api/v1/anonymous-messages/1')
                .set('Authorization', `Bearer ${validToken}`)
                .send({ is_read: true })
                .expect(200);

            expect(res.body.is_read).toBe(true);
        });

        it('PUT /api/v1/anonymous-messages/:id should return 404 if not found', async () => {
            db.query.mockResolvedValueOnce({ rows: [] });

            await request(app)
                .put('/api/v1/anonymous-messages/999')
                .set('Authorization', `Bearer ${validToken}`)
                .send({ is_read: true })
                .expect(404);
        });

        it('DELETE /api/v1/anonymous-messages/:id should delete message', async () => {
            db.query.mockResolvedValueOnce({ rows: [{ id: 1 }] });

            await request(app)
                .delete('/api/v1/anonymous-messages/1')
                .set('Authorization', `Bearer ${validToken}`)
                .expect(204);
        });

        it('DELETE /api/v1/anonymous-messages/:id should return 404 if not found', async () => {
            db.query.mockResolvedValueOnce({ rows: [] });

            await request(app)
                .delete('/api/v1/anonymous-messages/999')
                .set('Authorization', `Bearer ${validToken}`)
                .expect(404);
        });
    });

    describe('translate route', () => {
        it('POST /api/v1/translate should return translation', async () => {
            const res = await request(app)
                .post('/api/v1/translate')
                .send({ texts: ['hello'], targetLang: 'bn' })
                .expect(200);

            expect(res.body.translations).toEqual(['translated text']);
        });

        it('POST /api/v1/translate should fail if texts is not an array', async () => {
            await request(app)
                .post('/api/v1/translate')
                .send({ texts: 'hello', targetLang: 'bn' })
                .expect(400);
        });

        it('GET /api/v1/translate/cache should return translation cache', async () => {
            const res = await request(app)
                .get('/api/v1/translate/cache')
                .set('Authorization', `Bearer ${validToken}`)
                .expect(200);

            expect(res.body.cache).toEqual({ 'key': 'val' });
        });

        it('PUT /api/v1/translate/cache should update cache key', async () => {
            const res = await request(app)
                .put('/api/v1/translate/cache')
                .set('Authorization', `Bearer ${validToken}`)
                .send({ key: 'hello', translatedText: 'hola' })
                .expect(200);

            expect(res.body.success).toBe(true);
        });

        it('PUT /api/v1/translate/cache should fail with missing key', async () => {
            await request(app)
                .put('/api/v1/translate/cache')
                .set('Authorization', `Bearer ${validToken}`)
                .send({ translatedText: 'hola' })
                .expect(400);
        });

        it('DELETE /api/v1/translate/cache should delete cache key', async () => {
            const res = await request(app)
                .delete('/api/v1/translate/cache')
                .set('Authorization', `Bearer ${validToken}`)
                .send({ key: 'hello' })
                .expect(200);

            expect(res.body.success).toBe(true);
        });

        it('DELETE /api/v1/translate/cache should fail with missing key', async () => {
            await request(app)
                .delete('/api/v1/translate/cache')
                .set('Authorization', `Bearer ${validToken}`)
                .send({})
                .expect(400);
        });
    });

    describe('reorder route', () => {
        it('PUT /api/v1/reorder/:table should update sorting order', async () => {
            const mockClient = {
                query: jest.fn(),
                release: jest.fn()
            };
            db.connect.mockResolvedValueOnce(mockClient);

            const res = await request(app)
                .put('/api/v1/reorder/skills')
                .set('Authorization', `Bearer ${validToken}`)
                .send({ orders: [{ id: 1, sort_order: 2 }] })
                .expect(200);

            expect(res.body.message).toBe('Order updated successfully');
            expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
            expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
            expect(mockClient.release).toHaveBeenCalled();
        });

        it('PUT /api/v1/reorder/:table should roll back on transaction query error', async () => {
            const mockClient = {
                query: jest.fn().mockImplementation((queryStr) => {
                    if (queryStr.includes('UPDATE')) return Promise.reject(new Error('TX Fail'));
                    return Promise.resolve();
                }),
                release: jest.fn()
            };
            db.connect.mockResolvedValueOnce(mockClient);

            const res = await request(app)
                .put('/api/v1/reorder/skills')
                .set('Authorization', `Bearer ${validToken}`)
                .send({ orders: [{ id: 1, sort_order: 2 }] })
                .expect(500);

            expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
            expect(mockClient.release).toHaveBeenCalled();
        });
    });

    describe('webhooks route', () => {
        it('POST /api/v1/webhooks/content-changed should clear cache', async () => {
            const res = await request(app)
                .post('/api/v1/webhooks/content-changed')
                .expect(200);

            expect(res.body.success).toBe(true);
        });

        it('POST /api/v1/webhooks/content-changed should handle exceptions gracefully', async () => {
            // Mock clearResponseCache to throw error
            const originalClearCache = autoTranslate.clearResponseCache;
            autoTranslate.clearResponseCache = () => { throw new Error('Cache fail'); };

            await request(app)
                .post('/api/v1/webhooks/content-changed')
                .expect(500);

            autoTranslate.clearResponseCache = originalClearCache;
        });
    });

    describe('prewarm route', () => {
        let originalNodeEnv;
        let originalCronSecret;

        beforeEach(() => {
            originalNodeEnv = process.env.NODE_ENV;
            originalCronSecret = process.env.CRON_SECRET;
        });

        afterEach(() => {
            process.env.NODE_ENV = originalNodeEnv;
            process.env.CRON_SECRET = originalCronSecret;
        });

        it('GET /api/v1/prewarm should run prewarm flow', async () => {
            const res = await request(app)
                .get('/api/v1/prewarm')
                .expect(200);

            expect(res.body.message).toBe('Pre-warm complete');
        });

        it('GET /api/v1/prewarm should check authorization in production', async () => {
            process.env.NODE_ENV = 'production';
            process.env.CRON_SECRET = 'super-secret-key';

            // Unauthenticated
            await request(app)
                .get('/api/v1/prewarm')
                .expect(401);

            // Correct auth
            const res = await request(app)
                .get('/api/v1/prewarm')
                .set('Authorization', 'Bearer super-secret-key')
                .expect(200);

            expect(res.body.message).toBe('Pre-warm complete');
        });
    });

    describe('root route', () => {
        it('GET / should return api status and website url', async () => {
            const res = await request(app)
                .get('/')
                .expect(200);
            expect(res.body.status).toBe('healthy');
            expect(res.body.website).toBe('https://azizulhaque.vercel.app');
        });
    });
});
