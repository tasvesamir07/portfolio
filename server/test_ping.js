const http = require('http');

http.get('http://localhost:5000/api/ping', (res) => {
    let data = '';
    res.on('data', (chunk) => data += chunk);
    res.on('end', () => console.log('Ping Result:', data));
}).on('error', (err) => console.error('Ping Error:', err.message));
