const http = require('http');

const TOKEN_STORE = { token: null };

function request(method, path, body, port = 8080) {
  return new Promise((resolve) => {
    const bodyStr = body ? JSON.stringify(body) : null;
    const headers = {
      'Content-Type': 'application/json',
      ...(TOKEN_STORE.token ? { 'Authorization': `Bearer ${TOKEN_STORE.token}` } : {})
    };
    if (bodyStr) headers['Content-Length'] = Buffer.byteLength(bodyStr);

    const req = http.request({ hostname: 'localhost', port, path, method, headers }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    });
    req.on('error', e => resolve({ status: 'ERR', body: e.message }));
    if (bodyStr) req.write(bodyStr);
    req.end();
  });
}

async function main() {
  // 1. Login
  const loginRes = await request('POST', '/api/auth/login', { email: 'admin@school.com', password: 'Admin@123' });
  if (loginRes.status !== 200) {
    console.log('Login FAILED:', loginRes.status, loginRes.body);
    return;
  }
  const loginData = JSON.parse(loginRes.body);
  TOKEN_STORE.token = loginData.data?.token || loginData.token;
  console.log(`[OK] Login -> 200, got token\n`);

  // 2. GET all students
  const allStu = await request('GET', '/api/students');
  console.log(`[${allStu.status === 200 ? 'OK' : 'FAIL'}] GET /api/students -> ${allStu.status}`);
  let studentId = null;
  if (allStu.status === 200) {
    const data = JSON.parse(allStu.body);
    if (data.data && data.data.length > 0) {
      studentId = data.data[0].id;
      console.log(`     Found ${data.data.length} student(s). First ID = ${studentId}`);
    }
  } else {
    console.log('     Body:', allStu.body.substring(0, 200));
  }

  // 3. GET student by ID (was 500 before)
  if (studentId) {
    const getStu = await request('GET', `/api/students/${studentId}`);
    console.log(`[${getStu.status === 200 ? 'OK' : 'FAIL'}] GET /api/students/${studentId} -> ${getStu.status}`);
    if (getStu.status !== 200) console.log('     Body:', getStu.body.substring(0, 300));

    // 4. PUT student by ID (was 500 before)
    const body = JSON.parse(allStu.body).data[0];
    const putStu = await request('PUT', `/api/students/${studentId}`, {
      name: body.name, admissionNumber: body.admissionNumber,
      className: body.className, section: body.section
    });
    console.log(`[${putStu.status === 200 ? 'OK' : 'FAIL'}] PUT /api/students/${studentId} -> ${putStu.status}`);
    if (putStu.status !== 200) console.log('     Body:', putStu.body.substring(0, 300));

    // 5. GET fees by student (was 500 before)
    const fees = await request('GET', `/api/fees/student/${studentId}`);
    console.log(`[${fees.status === 200 ? 'OK' : 'FAIL'}] GET /api/fees/student/${studentId} -> ${fees.status}`);
    if (fees.status !== 200) console.log('     Body:', fees.body.substring(0, 300));
  }

  // 6. GET attendance/today (was 500 before - missing endpoint)
  const todayAtt = await request('GET', '/api/attendance/today');
  console.log(`[${todayAtt.status === 200 ? 'OK' : 'FAIL'}] GET /api/attendance/today -> ${todayAtt.status}`);
  if (todayAtt.status !== 200) console.log('     Body:', todayAtt.body.substring(0, 300));

  console.log('\nDone.');
}

main().catch(console.error);
