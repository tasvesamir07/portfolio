const request = require('supertest');
const app = require('../server');

describe('Base API Route Tests', () => {
    it('GET /api/ping should return status ok', async () => {
        const res = await request(app)
            .get('/api/ping')
            .expect('Content-Type', /json/)
            .expect(200);

        expect(res.body.status).toBe('ok');
    });

    it('GET /api/health should return status ok', async () => {
        const res = await request(app)
            .get('/api/health')
            .expect('Content-Type', /json/)
            .expect(200);

        expect(res.body.status).toBe('ok');
    });
});
