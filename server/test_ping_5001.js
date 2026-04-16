const http = require('http');

http.get('http://localhost:5001/api/ping', (res) => {
    let data = '';
    res.on('data', (chunk) => data += chunk);
    res.on('end', () => console.log('Ping Result 5001:', data));
}).on('error', (err) => console.error('Ping Error 5001:', err.message));
