const request = require('supertest');
const app = require('../server');
const db = require('../db');

jest.mock('../db', () => ({
    query: jest.fn(),
    connect: jest.fn(),
}));

describe('Public API Routes Tests', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('GET /api/v1/newspapers', () => {
        it('should return a list of newspapers sorted correctly', async () => {
            const mockNewspapers = [
                { id: 1, title: 'Times', short_description: 'Daily', image_url: '', link_url: '', sort_order: 0 }
            ];
            db.query.mockResolvedValueOnce({ rows: mockNewspapers });

            const res = await request(app)
                .get('/api/v1/newspapers')
                .expect(200);

            expect(res.body).toEqual(mockNewspapers);
            expect(db.query).toHaveBeenCalledWith(
                expect.stringContaining('SELECT * FROM newspapers'),
                expect.any(Array)
            );
        });
    });

    describe('GET /api/v1/page-data', () => {
        it('should return combined data for requested resources', async () => {
            const mockAbout = { id: 1, name: 'Samir', title: 'Researcher' };
            const mockSkills = [{ id: 1, category: 'JS', items: 'React, Node', sort_order: 0 }];

            db.query.mockResolvedValueOnce({ rows: [mockAbout] }); // for about
            db.query.mockResolvedValueOnce({ rows: mockSkills }); // for skills

            const res = await request(app)
                .get('/api/v1/page-data?resources=about,skills')
                .expect(200);

            expect(res.body).toHaveProperty('about', mockAbout);
            expect(res.body).toHaveProperty('skills', mockSkills);
            expect(res.headers['cache-control']).toContain('no-cache');
            expect(res.headers['vary']).toContain('X-Translate-Language');
        });

        it('should handle empty/missing resources list gracefully', async () => {
            const res = await request(app)
                .get('/api/v1/page-data')
                .expect(200);

            expect(res.body).toEqual({});
        });
    });

    describe('GET /api/v1/gallery', () => {
        it('should return gallery images sorted correctly', async () => {
            const mockGallery = [{ id: 1, caption: 'Art', image_url: 'art.png', sort_order: 0 }];
            db.query.mockResolvedValueOnce({ rows: mockGallery }); // for select query

            const res = await request(app)
                .get('/api/v1/gallery')
                .expect(200);

            expect(res.body).toEqual(mockGallery);
        });
    });

    describe('GET /api/v1/gallery-categories', () => {
        it('should return category list', async () => {
            const mockCats = [{ id: 1, name: 'academic', sort_order: 0 }];
            db.query.mockResolvedValueOnce({ rows: mockCats });

            const res = await request(app)
                .get('/api/v1/gallery-categories')
                .expect(200);

            expect(res.body).toEqual(mockCats);
        });
    });
});
