const request = require('supertest');
const app = require('../server');
const db = require('../db');

jest.mock('../db', () => ({
    query: jest.fn(),
    connect: jest.fn(),
}));

jest.mock('../utils/audit', () => ({
    logAuditActivity: jest.fn(),
}));

describe('Rate Limiting Tests', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should enforce rate limits on login attempts', async () => {
        // Mock DB login query to return empty (invalid credentials)
        db.query.mockResolvedValue({ rows: [] });

        // Make 5 requests (the limit is 5)
        for (let i = 0; i < 5; i++) {
            await request(app)
                .post('/api/v1/admin-login')
                .send({ identifier: 'admin', password: 'wrong' })
                .expect(401);
        }

        // The 6th request should be rate limited (429)
        const res = await request(app)
            .post('/api/v1/admin-login')
            .send({ identifier: 'admin', password: 'wrong' })
            .expect(429);

        expect(res.body.error || res.body.message).toContain('Too many login attempts');
    });
});
