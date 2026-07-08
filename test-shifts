const http = require('http');

// Login
const loginData = JSON.stringify({ employeeNumber: 'EMP001', pin: '1234' });
const loginReq = http.request({ hostname: 'localhost', port: 3001, path: '/api/auth/login', method: 'POST', headers: { 'Content-Type': 'application/json', 'Content-Length': loginData.length } }, loginRes => {
  let loginBody = '';
  loginRes.on('data', c => loginBody += c);
  loginRes.on('end', () => {
    const { token } = JSON.parse(loginBody);
    console.log('Login OK');
    
    // Get all shifts
    const sReq = http.request({ hostname: 'localhost', port: 3001, path: '/api/shifts', method: 'GET', headers: { 'Authorization': `Bearer ${token}` } }, sRes => {
      let sBody = '';
      sRes.on('data', c => sBody += c);
      sRes.on('end', () => {
        console.log(`Shifts Status: ${sRes.statusCode}`);
        try {
          const shifts = JSON.parse(sBody);
          console.log(`Total shifts: ${shifts.length}`);
          for (const s of shifts.slice(0, 5)) {
            console.log(`  id=${s.id} status=${s.status} opened=${s.openedAt} closed=${s.closedAt} emp=${s.employeeId} reg=${s.registerId}`);
          }
        } catch(e) {
          console.log(`Parse error: ${e.message}`);
          console.log(`Body: ${sBody.substring(0, 500)}`);
        }
      });
    });
    sReq.on('error', e => console.error('Error:', e.message));
    sReq.end();
  });
});
loginReq.on('error', e => console.error('Login error:', e.message));
loginReq.write(loginData);
loginReq.end();
