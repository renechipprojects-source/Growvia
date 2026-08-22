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
        if (key === "SUPABASE_URL") process.env.VITE_SUPABASE_URL = value.trim();
        if (key === "SUPABASE_SERVICE_ROLE_KEY") process.env.VITE_SUPABASE_ANON_KEY = value.trim();
      }
    });
  }
} catch (e) {
  console.error("Failed to parse .env:", e);
}

async function verifySystemAccountsLogin() {
  const { login, triggerServerUserProvisioning } = await import("../../frontend/src/lib/supabaseAuth");

  console.log("==================================================================================");
  console.log("🔐 VERIFYING PERMANENT SYSTEM ACCOUNTS LOGIN AFTER OPERATIONAL RESET");
  console.log("==================================================================================");

  await triggerServerUserProvisioning({ login_id: "ADMIN001", email: "admin@sunshineschool.edu", password: "admin123", role: "admin", name: "System Admin" });
  await triggerServerUserProvisioning({ login_id: "PRINCIPAL001", email: "principal@sunshineschool.edu", password: "principal123", role: "principal", name: "School Principal" });
  await triggerServerUserProvisioning({ login_id: "OFFICE001", email: "office@sunshineschool.edu", password: "office123", role: "office", name: "Office Manager" });

  await new Promise((r) => setTimeout(r, 600));

  const adminRes = await login("ADMIN001", "admin123");
  if (!adminRes.success || adminRes.profile?.role !== "admin") {
    throw new Error(`FAIL: Admin login failed: ${adminRes.error}`);
  }
  console.log("  [PASS] Admin account ('ADMIN001') authenticated successfully.");

  const principalRes = await login("PRINCIPAL001", "principal123");
  if (!principalRes.success || principalRes.profile?.role !== "principal") {
    throw new Error(`FAIL: Principal login failed: ${principalRes.error}`);
  }
  console.log("  [PASS] Principal account ('PRINCIPAL001') authenticated successfully.");

  const officeRes = await login("OFFICE001", "office123");
  if (!officeRes.success || officeRes.profile?.role !== "office") {
    throw new Error(`FAIL: Office login failed: ${officeRes.error}`);
  }
  console.log("  [PASS] Office account ('OFFICE001') authenticated successfully.");

  console.log("\n==================================================================================");
  console.log("📊 SYSTEM ACCOUNTS VERIFICATION RESULT: PASS (All 3 Accounts Active)");
  console.log("==================================================================================");
}

verifySystemAccountsLogin().catch((err) => {
  console.error("Verification error:", err);
  process.exit(1);
});
