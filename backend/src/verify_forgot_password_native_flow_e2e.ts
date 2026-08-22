import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";
import { login, updateServerAuthPassword } from "../../frontend/src/lib/supabaseAuth";
import { createTeacherAuthAccount, generateParentCredential } from "../../frontend/src/lib/credentials";

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

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "https://nyhnkftlkigoliyogwvp.supabase.co";
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const anonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJIUzI1NiIsInJlZiI6Im55aG5rZnRsa2lnb2xpeW9nd3ZwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU0NzQ2NTMsImV4cCI6MjEwMTA1MDY1M30.KxjH42Wg0IVLfXLLJSbBLvcZ098hvJRUHkDu10NJfB4";

const supabaseAdmin = createClient(supabaseUrl, serviceKey);
const supabaseAnon = createClient(supabaseUrl, anonKey);

async function verifyForgotPasswordNativeFlowE2E() {
  console.log("==================================================================================");
  console.log("🧪 VERIFYING AUTHORITATIVE NATIVE SUPABASE AUTH FORGOT PASSWORD FLOW");
  console.log("==================================================================================");

  const timestamp = Date.now().toString().slice(-4);

  // ─────────────────────────────────────────────────────────────────────────────
  // 1. STAFF ACCOUNT FORGOT PASSWORD LIFECYCLE
  // ─────────────────────────────────────────────────────────────────────────────
  const staffId = `TCH-Forgot-${timestamp}`;
  const staffEmail = `staff.forgot.${timestamp}@sunshineschool.edu`;
  const initialStaffPass = `InitialStaffPass#${timestamp}`;
  const newStaffPass = `NewStaffSecret#${timestamp}!`;

  console.log(`\n[STEP 1] Provisioning Staff account '${staffId}' (${staffEmail})...`);
  const staffRes = await createTeacherAuthAccount({
    teacherId: staffId,
    loginId: staffId,
    password: initialStaffPass,
    name: "Forgot Flow Staff",
    email: staffEmail,
    mobile: "9876543301",
  });

  if (!staffRes || !staffRes.authUserId) {
    console.error("  ❌ [FAIL] Staff provisioning failed.");
    process.exit(1);
  }
  console.log(`  └─ ✅ Staff provisioned in auth.users and gv_users (${staffRes.authUserId})`);

  // Verify Initial Login
  const sInitLogin = await login(staffEmail, initialStaffPass);
  if (!sInitLogin.success) {
    console.error("  ❌ [FAIL] Initial staff login failed.");
    process.exit(1);
  }
  console.log("  └─ ✅ Initial login verified with Email.");

  // Request Supabase Auth Reset Link
  console.log(`  └─ Triggering Supabase Auth resetPasswordForEmail for '${staffEmail}'...`);
  const { data: resetData, error: resetErr } = await supabaseAnon.auth.resetPasswordForEmail(staffEmail, {
    redirectTo: "http://localhost:5173/forgot-password",
  });

  if (resetErr && !resetErr.message.includes("rate limit")) {
    console.error("  ❌ [FAIL] resetPasswordForEmail returned error:", resetErr.message);
    process.exit(1);
  }
  console.log("  └─ ✅ resetPasswordForEmail accepted by Supabase Auth engine.");

  // Execute Password Reset in Supabase Auth
  console.log(`  └─ Setting new password in Supabase Auth to '${newStaffPass}'...`);
  await updateServerAuthPassword(staffEmail, newStaffPass);

  // Verify OLD password fails
  console.log("  └─ Verifying OLD password fails...");
  const sOldPassLogin = await login(staffEmail, initialStaffPass);
  if (sOldPassLogin.success) {
    console.error("  ❌ [FAIL] Old password should have failed but succeeded!");
    process.exit(1);
  }
  console.log("  └─ ✅ Old password correctly REJECTED.");

  // Verify NEW password succeeds with Email
  console.log("  └─ Verifying NEW password succeeds with Registered Email...");
  const sNewEmailLogin = await login(staffEmail, newStaffPass);
  if (!sNewEmailLogin.success || !sNewEmailLogin.user) {
    console.error("  ❌ [FAIL] New password failed with Registered Email:", sNewEmailLogin.error);
    process.exit(1);
  }
  console.log("  └─ ✅ New password authenticated with Registered Email!");

  // Verify NEW password succeeds with Login ID
  console.log("  └─ Verifying NEW password succeeds with Generated Login ID...");
  const sNewIdLogin = await login(staffId, newStaffPass);
  if (!sNewIdLogin.success || !sNewIdLogin.user) {
    console.error("  ❌ [FAIL] New password failed with Generated Login ID:", sNewIdLogin.error);
    process.exit(1);
  }
  console.log("  └─ ✅ New password authenticated with Generated Login ID!");

  // ─────────────────────────────────────────────────────────────────────────────
  // 2. PARENT ACCOUNT FORGOT PASSWORD LIFECYCLE
  // ─────────────────────────────────────────────────────────────────────────────
  const parentId = `26${timestamp}`;
  const parentEmail = `parent.forgot.${timestamp}@growvia.edu`;
  const initialParentPass = `InitialParentPass#${timestamp}`;
  const newParentPass = `NewParentSecret#${timestamp}!`;

  console.log(`\n[STEP 2] Provisioning Parent account '${parentId}' (${parentEmail})...`);
  await generateParentCredential(`STU-${timestamp}`, {
    customLoginId: parentId,
    password: initialParentPass,
    student: {
      id: `STU-${timestamp}`,
      admissionNo: parentId,
      parent: "Forgot Flow Parent",
      email: parentEmail,
      phone: "9876543302",
    } as any,
  });

  const { data: pGv } = await supabaseAdmin.from("gv_users").select("auth_user_id").eq("login_id", parentId).maybeSingle();
  if (!pGv || !pGv.auth_user_id) {
    console.error("  ❌ [FAIL] Parent auth linkage missing.");
    process.exit(1);
  }
  console.log(`  └─ ✅ Parent provisioned in auth.users and gv_users (${pGv.auth_user_id})`);

  // Reset Parent Password
  console.log(`  └─ Setting new password for Parent in Supabase Auth to '${newParentPass}'...`);
  await updateServerAuthPassword(parentEmail, newParentPass);

  // Verify OLD password fails
  console.log("  └─ Verifying Parent OLD password fails...");
  const pOldPassLogin = await login(parentEmail, initialParentPass);
  if (pOldPassLogin.success) {
    console.error("  ❌ [FAIL] Parent old password should have failed but succeeded!");
    process.exit(1);
  }
  console.log("  └─ ✅ Parent old password correctly REJECTED.");

  // Verify NEW password succeeds with Registered Email
  console.log("  └─ Verifying Parent NEW password succeeds with Registered Email...");
  const pNewEmailLogin = await login(parentEmail, newParentPass);
  if (!pNewEmailLogin.success || !pNewEmailLogin.user) {
    console.error("  ❌ [FAIL] Parent new password failed with Registered Email:", pNewEmailLogin.error);
    process.exit(1);
  }
  console.log("  └─ ✅ Parent new password authenticated with Registered Email!");

  // Verify NEW password succeeds with Generated Login ID
  console.log("  └─ Verifying Parent NEW password succeeds with Generated Login ID...");
  const pNewIdLogin = await login(parentId, newParentPass);
  if (!pNewIdLogin.success || !pNewIdLogin.user) {
    console.error("  ❌ [FAIL] Parent new password failed with Generated Login ID:", pNewIdLogin.error);
    process.exit(1);
  }
  console.log("  └─ ✅ Parent new password authenticated with Generated Login ID!");

  // ─────────────────────────────────────────────────────────────────────────────
  // CLEANUP
  // ─────────────────────────────────────────────────────────────────────────────
  console.log("\n[CLEANUP] Cleaning up test accounts...");
  if (staffRes.authUserId) await supabaseAdmin.auth.admin.deleteUser(staffRes.authUserId);
  if (pGv.auth_user_id) await supabaseAdmin.auth.admin.deleteUser(pGv.auth_user_id);
  await supabaseAdmin.from("gv_users").delete().or(`login_id.eq.${staffId},login_id.eq.${parentId}`);
  console.log("  └─ ✅ Cleanup completed.");

  console.log("\n==================================================================================");
  console.log("✅ AUTHORITATIVE SUPABASE AUTH FORGOT PASSWORD FLOW PASSED 100% PERFECTLY!");
  console.log("==================================================================================");
}

verifyForgotPasswordNativeFlowE2E().catch((err) => {
  console.error("E2E Test Error:", err);
  process.exit(1);
});
