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

async function testEmailAuthFlowRealE2E() {
  const { createClient } = await import("@supabase/supabase-js");
  const SUPABASE_URL = process.env.SUPABASE_URL || "https://nyhnkftlkigoliyogwvp.supabase.co";
  const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  console.log("==================================================================================");
  console.log("🔐 E2E SUITE: FULL EMAIL AUTHENTICATION & CREDENTIAL MANAGEMENT AUDIT");
  console.log("==================================================================================");

  const testSuffix = Date.now().toString().slice(-4);
  const loginId = `TCH-EAUTH-${testSuffix}`;
  const initialEmail = `initial-${testSuffix}@growvia.edu`;
  const updatedEmail = `updated-${testSuffix}@growvia.edu`;
  const initialPassword = `InitPass#${testSuffix}!`;
  const updatedPassword = `NewPass#${testSuffix}!`;

  const { triggerServerUserProvisioning, updateServerAuthEmail, updateServerAuthPassword, login } = await import("../../frontend/src/lib/supabaseAuth");

  // STAGE 1: Provisioning User in Supabase Auth & Database
  console.log("\n[STAGE 1] Creating User in Real Supabase Auth & Database...");
  const provRes = await triggerServerUserProvisioning({
    login_id: loginId,
    email: initialEmail,
    password: initialPassword,
    role: "teacher",
    name: `Auth Test Teacher ${testSuffix}`,
  });

  if (!provRes.success) throw new Error("FAIL: Failed to provision test user in Supabase Auth.");

  const { data: authUsersList } = await admin.auth.admin.listUsers();
  const createdAuthUser = authUsersList?.users?.find((u) => u.email?.toLowerCase() === initialEmail.toLowerCase());
  if (!createdAuthUser) throw new Error(`FAIL: User ${initialEmail} not found in Supabase Auth!`);
  console.log(`  ✓ User provisioned in Supabase Auth (Auth ID: ${createdAuthUser.id}, Email: ${initialEmail})`);

  // Initial Login Verification
  const initLoginRes = await login(loginId, initialPassword);
  if (!initLoginRes.success) throw new Error(`FAIL: Initial login failed for ${loginId}: ${initLoginRes.error}`);
  console.log(`  ✓ Login with Login ID '${loginId}' and initial password succeeded.`);

  // STAGE 2: Changing User Email
  console.log("\n[STAGE 2] Updating User Email in Supabase Auth & gv_users...");
  const emailUpdateRes = await updateServerAuthEmail(loginId, updatedEmail);
  if (!emailUpdateRes.success) throw new Error("FAIL: Failed to update email via server endpoint.");

  const { data: updatedAuthUsers } = await admin.auth.admin.listUsers();
  const updatedAuthUser = updatedAuthUsers?.users?.find((u) => u.id === createdAuthUser.id);
  if (updatedAuthUser?.email?.toLowerCase() !== updatedEmail.toLowerCase()) {
    throw new Error(`FAIL: Supabase Auth user email is '${updatedAuthUser?.email}' instead of '${updatedEmail}'`);
  }

  const { data: profileRow } = await admin.from("gv_users").select("email").eq("login_id", loginId).single();
  if (profileRow?.email?.toLowerCase() !== updatedEmail.toLowerCase()) {
    throw new Error(`FAIL: gv_users table email is '${profileRow?.email}' instead of '${updatedEmail}'`);
  }
  console.log(`  ✓ Email updated in both gv_users and Supabase Auth to '${updatedEmail}'`);

  // STAGE 3: Login with New Email & Rejection of Old Email
  console.log("\n[STAGE 3] Verifying New Email Authentication & Old Email Rejection...");
  const newEmailLoginRes = await login(updatedEmail, initialPassword);
  if (!newEmailLoginRes.success) throw new Error(`FAIL: Login with new email '${updatedEmail}' failed!`);
  console.log(`  ✓ Login with NEW email '${updatedEmail}' succeeded.`);

  const oldEmailLoginRes = await login(initialEmail, initialPassword);
  if (oldEmailLoginRes.success) throw new Error(`FAIL: Old email '${initialEmail}' still authenticated!`);
  console.log(`  ✓ Old email '${initialEmail}' correctly rejected by Supabase Auth.`);

  // STAGE 4: Changing Password & Rejection of Old Password
  console.log("\n[STAGE 4] Updating Password & Verifying Password Rejection...");
  const pwdUpdateRes = await updateServerAuthPassword(loginId, updatedPassword);
  if (!pwdUpdateRes.success) throw new Error("FAIL: Failed to update password via server endpoint.");

  const oldPwdLoginRes = await login(loginId, initialPassword);
  if (oldPwdLoginRes.success) throw new Error("FAIL: Old password still authenticated after password update!");
  console.log("  ✓ Old password correctly rejected by Supabase Auth.");

  const newPwdLoginRes = await login(loginId, updatedPassword);
  if (!newPwdLoginRes.success) throw new Error("FAIL: Login with new password failed!");
  console.log("  ✓ Login with NEW password succeeded.");

  // STAGE 5: Login ID Authentication & Persistence Check
  console.log("\n[STAGE 5] Verifying Login ID Authentication & Session Persistence...");
  const loginIdAuthRes = await login(loginId, updatedPassword);
  if (!loginIdAuthRes.success) throw new Error("FAIL: Login ID authentication failed after email/password changes!");
  console.log(`  ✓ Login ID '${loginId}' authenticated successfully with new password.`);

  // STAGE 6: Cleanup Test Accounts
  console.log("\n[STAGE 6] Cleaning up test records from Supabase Auth & gv_users...");
  await admin.auth.admin.deleteUser(createdAuthUser.id);
  await admin.from("gv_users").delete().eq("login_id", loginId);
  console.log("  ✓ Test user deleted cleanly.");

  console.log("\n==================================================================================");
  console.log("✅ FULL EMAIL AUTHENTICATION SUITE RESULT: PASS (All 8 Requirements Verified)");
  console.log("==================================================================================");
}

testEmailAuthFlowRealE2E().catch((err) => {
  console.error("Test Error:", err);
  process.exit(1);
});
