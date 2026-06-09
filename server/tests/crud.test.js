const request = require('supertest');
const app = require('../server');
const db = require('../db');
const jwt = require('jsonwebtoken');

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

describe('CRUD API Routes Tests', () => {
    let validToken;

    beforeEach(() => {
        jest.clearAllMocks();
        process.env.JWT_SECRET = 'test_secret_key_123456';
        validToken = jwt.sign(
            { id: 1, username: 'admin', email: 'admin@example.com' },
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
        );
    });

    describe('GET & POST /api/v1/academics', () => {
        it('GET should return list of academics', async () => {
            const mockAcademics = [
                { id: 1, degree: 'BSc', institution: 'University X' }
            ];
            db.query.mockResolvedValueOnce({ rows: mockAcademics });

            const res = await request(app)
                .get('/api/v1/academics')
                .expect(200);

            expect(res.body).toEqual(mockAcademics);
        });

        it('POST should create academic record if authorized', async () => {
            const newRecord = {
                degree: 'PhD',
                institution: 'University Y',
                start_year: '2020',
                end_year: '2024',
                logo_url: '',
                details_json: ''
            };
            db.query.mockResolvedValueOnce({ rows: [{ id: 2, ...newRecord }] });

            const res = await request(app)
                .post('/api/v1/academics')
                .set('Authorization', `Bearer ${validToken}`)
                .send(newRecord)
                .expect(201);

            expect(res.body.degree).toBe('PhD');
        });

        it('POST should fail if unauthorized', async () => {
            await request(app)
                .post('/api/v1/academics')
                .send({ degree: 'PhD' })
                .expect(401);
        });
    });

    describe('GET & PUT /api/v1/about', () => {
        it('GET should return about details', async () => {
            const mockAbout = { name: 'Samir', title: 'Researcher' };
            db.query.mockResolvedValueOnce({ rows: [mockAbout] });

            const res = await request(app)
                .get('/api/v1/about')
                .expect(200);

            expect(res.body.name).toBe('Samir');
        });

        it('PUT should update about details if authorized', async () => {
            db.query.mockResolvedValueOnce({ rows: [{ id: 1 }] }); // Select row
            db.query.mockResolvedValueOnce({ rows: [{ name: 'Samir Updated' }] }); // Update row

            const res = await request(app)
                .put('/api/v1/about')
                .set('Authorization', `Bearer ${validToken}`)
                .send({ name: 'Samir Updated' })
                .expect(200);

            expect(res.body.name).toBe('Samir Updated');
        });
    });
});
