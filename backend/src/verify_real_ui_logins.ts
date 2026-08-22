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

async function verifyRealUILogins() {
  console.log("==================================================================================");
  console.log("🧪 REAL UI LOGIN VERIFICATION FOR ALL 5 PORTAL ROLES");
  console.log("==================================================================================");

  const realAccounts = [
    { roleName: "Admin", loginId: "ADMIN001", email: "admin@sunshineschool.edu", pass: "Password@123" },
    { roleName: "Principal", loginId: "PRINCIPAL001", email: "principal@sunshineschool.edu", pass: "Password@123" },
    { roleName: "Office", loginId: "OFFICE001", email: "office@sunshineschool.edu", pass: "Password@123" },
    { roleName: "Teacher (Staff)", loginId: "TCH101", email: "teacher@sunshineschool.edu", pass: "Password@123" },
    { roleName: "Parent", loginId: "PRT1001", email: "parent@sunshineschool.edu", pass: "Password@123" },
  ];

  for (const acc of realAccounts) {
    console.log(`\n--- Testing ${acc.roleName} Login ---`);
    console.log(`  1. Login with Login ID: '${acc.loginId}'`);
    const idRes = await login(acc.loginId, acc.pass);
    if (!idRes.success || !idRes.user) {
      console.error(`  └─ ❌ [FAIL] Login ID auth failed for ${acc.loginId}:`, idRes.error);
      process.exit(1);
    }
    console.log(`  └─ ✅ [PASS] Success! Auth User ID: ${idRes.user.id} | Role: ${idRes.profile?.role}`);

    console.log(`  2. Login with Email: '${acc.email}'`);
    const emailRes = await login(acc.email, acc.pass);
    if (!emailRes.success || !emailRes.user) {
      console.error(`  └─ ❌ [FAIL] Email auth failed for ${acc.email}:`, emailRes.error);
      process.exit(1);
    }
    console.log(`  └─ ✅ [PASS] Success! Auth User ID: ${emailRes.user.id} | Role: ${emailRes.profile?.role}`);
  }

  console.log("\n==================================================================================");
  console.log("✅ ALL REAL ACCOUNTS VERIFIED SUCCESSFUL FOR LOGIN ID AND EMAIL!");
  console.log("==================================================================================");
}

verifyRealUILogins().catch((err) => {
  console.error("UI Login Verification Error:", err);
  process.exit(1);
});
