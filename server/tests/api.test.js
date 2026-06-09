const request = require('supertest');
const app = require('../server');

describe('Base API Route Tests', () => {
    it('GET /api/v1/ping should return status ok', async () => {
        const res = await request(app)
            .get('/api/v1/ping')
            .expect('Content-Type', /json/)
            .expect(200);

        expect(res.body.status).toBe('ok');
    });

    it('GET /api/v1/health should return status ok and include checks', async () => {
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
});
