const http = require('http');
const req = http.request({ hostname: '192.168.100.75', port: 3000, path: '/pos', method: 'GET', timeout: 15000 }, res => {
  let body = '';
  res.on('data', c => body += c);
  res.on('end', () => {
    console.log(`Status: ${res.statusCode}`);
    // Look for API URL in the HTML
    const hasApiUrl = body.includes('/api') || body.includes('localhost:3000');
    console.log(`Body length: ${body.length}`);
    console.log(`Contains /api: ${body.includes('/api')}`);
    console.log(`Contains localhost:3000: ${body.includes('localhost:3000')}`);
    // Find script src
    const scripts = body.match(/src="[^"]*"/g);
    if (scripts) console.log(`Scripts: ${scripts.slice(0, 5).join(', ')}`);
  });
});
req.on('error', e => console.error('Error:', e.message));
req.on('timeout', () => { console.error('Timeout'); req.destroy(); });
req.end();
