const http = require('http');
const data = JSON.stringify({ employeeNumber: 'EMP002', pin: '2345' });
const req = http.request({ hostname: 'localhost', port: 3001, path: '/api/auth/login', method: 'POST', headers: { 'Content-Type': 'application/json', 'Content-Length': data.length } }, res => {
  let body = '';
  res.on('data', c => body += c);
  res.on('end', () => console.log(`Status: ${res.statusCode}\nBody: ${body}`));
});
req.on('error', e => console.error('Error:', e.message));
req.write(data);
req.end();
