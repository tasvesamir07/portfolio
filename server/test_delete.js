const axios = require('axios');

async function test() {
    try {
        console.log('Testing Authentication and Deletion...');
        
        // 1. Login to get token
        const loginRes = await axios.post('http://localhost:5000/api/auth/login', {
            username: 'admin',
            password: 'admin123'
        });
        const token = loginRes.data.token;
        console.log('Login successful, token obtained.');

        // 2. Try to DELETE category (ID 3 as per user error)
        try {
            const delRes = await axios.delete('http://localhost:5000/api/gallery-categories/3', {
                headers: { Authorization: `Bearer ${token}` }
            });
            console.log('Delete Response:', delRes.status, delRes.data);
        } catch (err) {
            console.error('Delete Failed:', err.response?.status, err.response?.data || err.message);
        }

    } catch (err) {
        console.error('Test script failed:', err.message);
    }
}

test();
