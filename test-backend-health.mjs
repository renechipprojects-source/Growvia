import http from 'http';
import { spawn } from 'child_process';
import path from 'path';

async function testHealth() {
  console.log("==========================================================");
  console.log("VERIFYING EXPRESS BACKEND API FOUNDATION & GET /health");
  console.log("==========================================================");

  const serverProcess = spawn('node', ['backend/dist/index.js'], {
    env: { ...process.env, PORT: '5099' }
  });

  serverProcess.stdout.on('data', (d) => console.log(`Server stdout: ${d}`));
  serverProcess.stderr.on('data', (d) => console.log(`Server stderr: ${d}`));

  // Wait 2s for Express server to start
  await new Promise((resolve) => setTimeout(resolve, 2000));

  http.get('http://127.0.0.1:5099/health', (res) => {
    let body = '';
    res.on('data', (chunk) => body += chunk);
    res.on('end', () => {
      console.log("GET /health HTTP Status:", res.statusCode);
      console.log("Response Body:", body);
      serverProcess.kill();

      try {
        const parsed = JSON.parse(body);
        if (parsed.status === 'ok') {
          console.log("✅ API Health Verification PASSED: status = ok");
          process.exit(0);
        } else {
          console.error("❌ API Health Verification FAILED");
          process.exit(1);
        }
      } catch (e) {
        console.error("JSON Parse Error:", e.message);
        process.exit(1);
      }
    });
  }).on('error', (err) => {
    console.error("HTTP Request Error:", err.message);
    serverProcess.kill();
    process.exit(1);
  });
}

testHealth();
