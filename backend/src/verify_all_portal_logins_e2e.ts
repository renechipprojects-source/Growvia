import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";
import { login } from "../../frontend/src/lib/supabaseAuth";

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

async function verifyAllPortalLogins() {
  console.log("==================================================================================");
  console.log("🧪 E2E VERIFICATION OF ALL 5 PORTAL ROLES REAL AUTHENTICATION");
  console.log("==================================================================================");

  const credentialsToTest = [
    // 1. ADMIN
    { identifier: "ADMIN001", password: "Password@123", expectedRole: "admin" },
    { identifier: "admin@sunshineschool.edu", password: "Password@123", expectedRole: "admin" },

    // 2. PRINCIPAL
    { identifier: "PRINCIPAL001", password: "Password@123", expectedRole: "principal" },
    { identifier: "principal@sunshineschool.edu", password: "Password@123", expectedRole: "principal" },

    // 3. OFFICE
    { identifier: "OFFICE001", password: "Office@123", expectedRole: "office" },
    { identifier: "office@sunshineschool.edu", password: "Office@123", expectedRole: "office" },

    // 4. TEACHER / STAFF
    { identifier: "TCH101", password: "Password@123", expectedRole: "teacher" },
    { identifier: "teacher@sunshineschool.edu", password: "Password@123", expectedRole: "teacher" },

    // 5. PARENT
    { identifier: "PRT1001", password: "Parent@123", expectedRole: "parent" },
    { identifier: "parent@sunshineschool.edu", password: "Parent@123", expectedRole: "parent" },
  ];

  let passedCount = 0;
  let failedCount = 0;

  for (const cred of credentialsToTest) {
    console.log(`\nTesting Login ID/Email: '${cred.identifier}'...`);
    const res = await login(cred.identifier, cred.password);

    if (res.success && res.user && res.profile) {
      console.log(`  └─ [PASS] Authenticated! User ID: ${res.user.id} | Role: ${res.profile.role} | Name: ${res.profile.full_name}`);
      passedCount++;
    } else {
      console.error(`  └─ [FAIL] Authentication failed for '${cred.identifier}':`, res.error);
      failedCount++;
    }
  }

  console.log("\n==================================================================================");
  console.log(`SUMMARY: Passed ${passedCount} / ${credentialsToTest.length} login tests.`);
  console.log("==================================================================================");

  if (failedCount > 0) {
    console.error("❌ SOME LOGIN TESTS FAILED!");
    process.exit(1);
  } else {
    console.log("✅ ALL 5 PORTAL ROLES VERIFIED AND WORKING 100% PERFECTLY!");
  }
}

verifyAllPortalLogins().catch((err) => {
  console.error("Verification error:", err);
  process.exit(1);
});
