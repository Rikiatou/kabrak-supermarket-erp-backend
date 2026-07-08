const http = require('http');
const data = JSON.stringify({ employeeNumber: 'EMP002', pin: '2345' });
const req = http.request({ hostname: '192.168.100.75', port: 3000, path: '/api/auth/login', method: 'POST', headers: { 'Content-Type': 'application/json', 'Content-Length': data.length }, timeout: 15000 }, res => {
  let body = '';
  res.on('data', c => body += c);
  res.on('end', () => console.log(`Status: ${res.statusCode}\nBody: ${body.substring(0, 300)}`));
});
req.on('error', e => console.error('Error:', e.message));
req.on('timeout', () => { console.error('Timeout'); req.destroy(); });
req.write(data);
req.end();
