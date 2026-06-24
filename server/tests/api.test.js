const request = require('supertest');
const app = require('../server');
const db = require('../db');
const jwt = require('jsonwebtoken');

// Mock db and audit logger
jest.mock('../db', () => ({
    query: jest.fn(),
    connect: jest.fn(),
}));

jest.mock('../utils/audit', () => ({
    logAuditActivity: jest.fn(),
}));

describe('Base API Route Tests', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        process.env.JWT_SECRET = 'test_secret_key_123456';
    });

    it('GET /api/v1/ping should return status ok', async () => {
        const res = await request(app)
            .get('/api/v1/ping')
            .expect('Content-Type', /json/)
            .expect(200);

        expect(res.body.status).toBe('ok');
    });

    it('GET /api/v1/health should return status ok and include checks', async () => {
        // Mock health check db query
        db.query.mockResolvedValueOnce({ rows: [{ 1: 1 }] });

        const res = await request(app)
            .get('/api/v1/health')
            .expect('Content-Type', /json/)
            .expect(200);

        expect(res.body.status).toBe('ok');
        expect(res.body).toHaveProperty('checks');
    });

    it('GET /api/v1/docs should return the OpenAPI specification', async () => {
        const res = await request(app)
            .get('/api/v1/docs')
            .expect('Content-Type', /json/)
            .expect(200);

        expect(res.body).toHaveProperty('openapi');
        expect(res.body.info.title).toContain('Portfolio API');
    });

    it('GET /api/v1/nonexistent should return 404 not found', async () => {
        const res = await request(app)
            .get('/api/v1/nonexistent')
            .expect('Content-Type', /json/)
            .expect(404);

        expect(res.body).toHaveProperty('message');
        expect(res.body.message).toContain('not found');
    });

    it('POST /api/v1/academics should reject with 401 when token is missing', async () => {
        await request(app)
            .post('/api/v1/academics')
            .send({ degree: 'PhD' })
            .expect(401);
    });

    it('POST /api/v1/academics should reject with 403 when token is invalid', async () => {
        const res = await request(app)
            .post('/api/v1/academics')
            .set('Authorization', 'Bearer invalid_token_value')
            .send({ degree: 'PhD' })
            .expect(403);

        expect(res.body.error).toBe('Forbidden');
        expect(res.body.message).toBe('Invalid token.');
    });

    it('POST /api/v1/anonymous-messages should fail with 400 on input validation error', async () => {
        const res = await request(app)
            .post('/api/v1/anonymous-messages')
            .send({ message: '' }) // Invalid message length
            .expect(400);

        expect(res.body.error).toBe('Validation failed');
        expect(res.body).toHaveProperty('details');
        expect(res.body.details[0].field).toBe('message');
    });

    it('POST /api/v1/messages should enforce rate limits after max requests', async () => {
        db.query.mockResolvedValue({ rows: [] });

        // The limit for messages is 3 per minute
        for (let i = 0; i < 3; i++) {
            await request(app)
                .post('/api/v1/messages')
                .send({ name: 'Samir', email: 'samir@test.com', message: 'Hello' })
                .expect(201);
        }

        // 4th request should get rate limited (429)
        const res = await request(app)
            .post('/api/v1/messages')
            .send({ name: 'Samir', email: 'samir@test.com', message: 'Hello' })
            .expect(429);

        expect(res.body.error).toContain('Too many messages sent');
    });
});
