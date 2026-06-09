import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
    vus: 100, // 100 Virtual Users
    duration: '30s', // 30 seconds duration
    thresholds: {
        http_req_duration: ['p(95)<500'], // p95 response time must be under 500ms
    },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:5000/api/v1';

export default function () {
    // 1. Hit cached GET endpoint (e.g. academics)
    const resGet = http.get(`${BASE_URL}/academics`);
    check(resGet, {
        'GET status is 200': (r) => r.status === 200,
    });

    // 2. Hit translate endpoint with small payload
    const payload = JSON.stringify({
        texts: ['Hello world', 'Welcome to my portfolio'],
        language: 'ko'
    });
    const params = {
        headers: {
            'Content-Type': 'application/json',
        },
    };
    const resTranslate = http.post(`${BASE_URL}/translate`, payload, params);
    check(resTranslate, {
        'Translate status is 200': (r) => r.status === 200,
    });

    sleep(1);
}
