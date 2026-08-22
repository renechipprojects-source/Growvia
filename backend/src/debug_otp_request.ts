import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";

try {
  const envPath = path.resolve(process.cwd(), "backend/.env");
  if (fs.existsSync(envPath)) {
    const envConfig = fs.readFileSync(envPath, "utf8");
    envConfig.split("\n").forEach((line) => {
      const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
      if (match) {
        const key = match[1];
        let value = match[2] || "";
        if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
        if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
        process.env[key] = value.trim();
      }
    });
  }
} catch {}

async function debugOtpRequest() {
  console.log("==================================================================================");
  console.log("🔍 DEBUGGING POST /api/auth/otp/request ON BACKEND");
  console.log("==================================================================================");

  const testIdentifiers = [
    "admin@sunshineschool.edu",
    "ADMIN001",
    "principal@sunshineschool.edu",
    "teacher@sunshineschool.edu",
    "parent@sunshineschool.edu",
    "nonexistent@domain.com",
  ];

  for (const identifier of testIdentifiers) {
    console.log(`\nTesting POST /api/auth/otp/request with identifier: '${identifier}'...`);
    try {
      const res = await fetch("http://localhost:5000/api/auth/otp/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier }),
      });

      const status = res.status;
      const data = await res.json();
      console.log(`  └─ Response Status: ${status} | Body:`, data);
    } catch (err: any) {
      console.error(`  └─ Fetch exception:`, err.message);
    }
  }
}

debugOtpRequest();
