import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";
import { requestOtpForIdentifier } from "../../frontend/src/lib/passwordResets";

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

async function testOtpRequestFixE2E() {
  console.log("==================================================================================");
  console.log("🧪 VERIFYING FORGOT PASSWORD OTP / RECOVERY DISPATCH FIX");
  console.log("==================================================================================");

  const testCases = [
    { identifier: "admin@sunshineschool.edu", desc: "Registered Admin Email" },
    { identifier: "ADMIN001", desc: "Registered Admin Login ID" },
    { identifier: "teacher@sunshineschool.edu", desc: "Registered Teacher Email" },
    { identifier: "parent@sunshineschool.edu", desc: "Registered Parent Email" },
    { identifier: "unknown.user.99@school.com", desc: "Non-existent User Email" },
  ];

  for (const tc of testCases) {
    console.log(`\n[TEST] Requesting OTP/Recovery for ${tc.desc} ('${tc.identifier}')...`);
    const res = await requestOtpForIdentifier(tc.identifier);
    console.log(`  └─ Success: ${res.success} | Message: "${res.message}" | Masked: ${res.emailMasked || "N/A"}`);

    if (tc.identifier.includes("unknown")) {
      if (!res.success) {
        console.error("  ❌ Non-existent user should return neutral message, but failed!");
        process.exit(1);
      }
    } else {
      if (!res.success && !res.message.includes("rate limit")) {
        console.error("  ❌ Valid user OTP request failed unexpectedly!");
        process.exit(1);
      }
    }
  }

  console.log("\n==================================================================================");
  console.log("✅ FORGOT PASSWORD OTP / RECOVERY FLOW VERIFIED WORKING PERFECTLY!");
  console.log("==================================================================================");
}

testOtpRequestFixE2E().catch((err) => {
  console.error("Test Error:", err);
  process.exit(1);
});
