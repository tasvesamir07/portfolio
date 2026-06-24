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

    describe('CRUD Lifecycle: /api/v1/academics', () => {
        it('should perform a full CREATE -> READ -> UPDATE -> DELETE lifecycle', async () => {
            const record = {
                degree: 'PhD Research',
                institution: 'State Univ',
                start_year: '2020',
                end_year: '2024',
                logo_url: 'http://pic.png',
                details_json: '[]'
            };

            // 1. CREATE (POST)
            db.query.mockResolvedValueOnce({ rows: [{ id: 10, ...record }] });
            const createRes = await request(app)
                .post('/api/v1/academics')
                .set('Authorization', `Bearer ${validToken}`)
                .send(record)
                .expect(201);

            expect(createRes.body.id).toBe(10);
            expect(createRes.body.degree).toBe('PhD Research');

            // 2. READ (GET)
            db.query.mockResolvedValueOnce({ rows: [{ id: 10, ...record }] });
            const readRes = await request(app)
                .get('/api/v1/academics')
                .expect(200);

            expect(readRes.body).toHaveLength(1);
            expect(readRes.body[0].id).toBe(10);

            // 3. UPDATE (PUT)
            const updatedRecord = { ...record, degree: 'PhD Research Updated' };
            db.query.mockResolvedValueOnce({ rows: [{ id: 10, ...updatedRecord }] });
            const updateRes = await request(app)
                .put('/api/v1/academics/10')
                .set('Authorization', `Bearer ${validToken}`)
                .send(updatedRecord)
                .expect(200);

            expect(updateRes.body.degree).toBe('PhD Research Updated');

            // 4. DELETE (DELETE)
            db.query.mockResolvedValueOnce({ rows: [{ logo_url: 'http://pic.png' }] }); // returns details and completes in 1 query
            await request(app)
                .delete('/api/v1/academics/10')
                .set('Authorization', `Bearer ${validToken}`)
                .expect(204);
        });
    });

    describe('CRUD Lifecycle: /api/v1/experiences', () => {
        it('should perform a full CREATE -> READ -> UPDATE -> DELETE lifecycle', async () => {
            const record = {
                company: 'Google LLC',
                position: 'SWE Intern',
                location: 'Mountain View',
                start_date: '2023-01-01',
                end_date: '2023-04-01',
                description: 'Coding Intern',
                logo_url: 'http://glogo.png',
                details_json: '[]'
            };

            // 1. CREATE (POST)
            db.query.mockResolvedValueOnce({ rows: [{ id: 20, ...record }] });
            const createRes = await request(app)
                .post('/api/v1/experiences')
                .set('Authorization', `Bearer ${validToken}`)
                .send(record)
                .expect(201);

            expect(createRes.body.id).toBe(20);
            expect(createRes.body.company).toBe('Google LLC');

            // 2. READ (GET)
            db.query.mockResolvedValueOnce({ rows: [{ id: 20, ...record }] });
            const readRes = await request(app)
                .get('/api/v1/experiences')
                .expect(200);

            expect(readRes.body).toHaveLength(1);
            expect(readRes.body[0].id).toBe(20);

            // 3. UPDATE (PUT)
            const updatedRecord = { ...record, company: 'Alphabet Google' };
            db.query.mockResolvedValueOnce({ rows: [{ id: 20, ...updatedRecord, old_logo_url: 'http://glogo.png' }] });
            const updateRes = await request(app)
                .put('/api/v1/experiences/20')
                .set('Authorization', `Bearer ${validToken}`)
                .send(updatedRecord)
                .expect(200);

            expect(updateRes.body.company).toBe('Alphabet Google');

            // 4. DELETE (DELETE)
            db.query.mockResolvedValueOnce({ rows: [{ logo_url: 'http://glogo.png' }] }); // returns details and completes in 1 query
            await request(app)
                .delete('/api/v1/experiences/20')
                .set('Authorization', `Bearer ${validToken}`)
                .expect(204);
        });
    });

    describe('CRUD Lifecycle: /api/v1/research-interests', () => {
        it('should perform a full CREATE -> READ -> UPDATE -> DELETE lifecycle', async () => {
            const record = {
                interest: 'Machine Learning',
                details: 'Deep neural networks study',
                icon_name: 'brain',
                details_json: '[]'
            };

            // 1. CREATE (POST)
            db.query.mockResolvedValueOnce({ rows: [{ id: 30, ...record }] });
            const createRes = await request(app)
                .post('/api/v1/research-interests')
                .set('Authorization', `Bearer ${validToken}`)
                .send(record)
                .expect(201);

            expect(createRes.body.id).toBe(30);
            expect(createRes.body.interest).toBe('Machine Learning');

            // 2. READ (GET)
            db.query.mockResolvedValueOnce({ rows: [{ id: 30, ...record }] });
            const readRes = await request(app)
                .get('/api/v1/research-interests')
                .expect(200);

            expect(readRes.body).toHaveLength(1);
            expect(readRes.body[0].id).toBe(30);

            // 3. UPDATE (PUT)
            const updatedRecord = { ...record, interest: 'ML & AI' };
            db.query.mockResolvedValueOnce({ rows: [{ id: 30, ...updatedRecord }] });
            const updateRes = await request(app)
                .put('/api/v1/research-interests/30')
                .set('Authorization', `Bearer ${validToken}`)
                .send(updatedRecord)
                .expect(200);

            expect(updateRes.body.interest).toBe('ML & AI');

            // 4. DELETE (DELETE)
            db.query.mockResolvedValueOnce({ rows: [] }); // delete query completes in 1 operation
            await request(app)
                .delete('/api/v1/research-interests/30')
                .set('Authorization', `Bearer ${validToken}`)
                .expect(204);
        });
    });
});
