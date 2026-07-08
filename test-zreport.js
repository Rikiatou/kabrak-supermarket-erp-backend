const http = require('http');

// Step 1: Login
const loginData = JSON.stringify({ employeeNumber: 'EMP002', pin: '2345' });
const loginReq = http.request({ hostname: 'localhost', port: 3001, path: '/api/auth/login', method: 'POST', headers: { 'Content-Type': 'application/json', 'Content-Length': loginData.length } }, loginRes => {
  let loginBody = '';
  loginRes.on('data', c => loginBody += c);
  loginRes.on('end', () => {
    const { token } = JSON.parse(loginBody);
    console.log('Login OK, token obtained');
    
    // Step 2: Get Z-Report for today's shift
    const shiftId = 'cmr7ihwnq0001lesrt3zkm05w';
    const zReq = http.request({ hostname: 'localhost', port: 3001, path: `/api/shifts/${shiftId}/z-report`, method: 'GET', headers: { 'Authorization': `Bearer ${token}` } }, zRes => {
      let zBody = '';
      zRes.on('data', c => zBody += c);
      zRes.on('end', () => {
        console.log(`Z-Report Status: ${zRes.statusCode}`);
        if (zRes.statusCode === 200) {
          const data = JSON.parse(zBody);
          console.log(`Total sales: ${data.totalSales || data.netSales}`);
          console.log(`Transactions: ${data.transactionCount || data.totalTransactions}`);
          console.log(`Cash: ${data.paymentBreakdown?.cash || data.cashSales}`);
          console.log(`Card: ${data.paymentBreakdown?.card || data.cardSales}`);
          console.log(`Mobile: ${data.paymentBreakdown?.mobile || data.mobileSales}`);
          console.log(`Invoice payments: ${JSON.stringify(data.invoicePayments)}`);
        } else {
          console.log(`Error: ${zBody.substring(0, 500)}`);
        }
      });
    });
    zReq.on('error', e => console.error('Z-Report error:', e.message));
    zReq.end();
  });
});
loginReq.on('error', e => console.error('Login error:', e.message));
loginReq.write(loginData);
loginReq.end();
