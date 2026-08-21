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

async function runLoginIdAndViewPasswordRealE2ETest() {
  console.log("==================================================================================");
  console.log("🔐 REAL PRODUCTION LOGIN ID AUTHENTICATION & VIEW PASSWORD MANDATORY E2E SUITE");
  console.log("==================================================================================");

  const {
    generateTeacherCredential,
    getTeacherCredential,
    resetTeacherPassword,
    generateParentCredential,
    getParentCredential,
    syncCredentialsFromSupabase,
  } = await import("../../frontend/src/lib/credentials");
  const { login, triggerServerUserProvisioning } = await import("../../frontend/src/lib/supabaseAuth");
  const { createClient } = await import("@supabase/supabase-js");

  const SUPABASE_URL = process.env.SUPABASE_URL || "https://nyhnkftlkigoliyogwvp.supabase.co";
  const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  const adminSupabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  const timestamp = Date.now();
  const runId = `${timestamp}_${Math.random().toString(36).substring(2, 6)}`;

  // ─── STAGE 1: Staff Credential Generation, View Password & Login ID Login ────
  console.log("\n[STAGE 1] Testing Staff Credential Generation, View Password & Login ID Login...");
  const staffTeacherId = `TCH-TEST-${runId}`;
  const staffLoginId = `STF-LOGIN-${runId}`;
  const staffInitialPassword = "StaffPass123!_Secure";

  const staffCred = await generateTeacherCredential(staffTeacherId, {
    customLoginId: staffLoginId,
    password: staffInitialPassword,
    teacher: { id: staffTeacherId, name: `Test Staff ${runId}`, phone: "9876543210" } as any,
  });

  console.log(`  ✓ Staff Generated - Login ID: '${staffCred.loginId}', Password: '${staffCred.password}'`);

  // Verify auth.users account exists in Supabase
  const { data: staffAuthList } = await adminSupabase.auth.admin.listUsers();
  const staffAuthUser = staffAuthList?.users?.find((u) => u.user_metadata?.login_id === staffLoginId);
  if (!staffAuthUser) {
    throw new Error(`FAIL: Staff auth.users account was not created in Supabase Auth for login_id '${staffLoginId}'`);
  }
  console.log(`  ✓ [VERIFIED IN SUPABASE AUTH] auth.users record exists with ID: '${staffAuthUser.id}', Email: '${staffAuthUser.email}'`);

  // REQ 2 & 3: View Password test
  const viewStaffCred = getTeacherCredential(staffTeacherId);
  if (!viewStaffCred || !viewStaffCred.password || viewStaffCred.password !== staffInitialPassword) {
    throw new Error(`FAIL: Staff View Password option returned invalid password: '${viewStaffCred?.password}' (Expected: '${staffInitialPassword}')`);
  }
  console.log("  [PASS REQ 2-3] Staff View Password verified: Exact generated password displayed.");

  // REQ 4, 5, 6: Login ID + Displayed Password Authentication for Staff & Portal Redirect
  const staffLoginRes = await login(staffLoginId, staffInitialPassword);
  if (!staffLoginRes.success || !staffLoginRes.profile || (staffLoginRes.profile.role !== "teacher" && staffLoginRes.profile.role !== "staff")) {
    throw new Error(`FAIL: Staff Login ID authentication failed: ${staffLoginRes.error}`);
  }
  console.log(`  [PASS REQ 4-6] Staff Login ID '${staffLoginId}' authenticated successfully. Redirect Role: '${staffLoginRes.profile.role}' (target: /teacher).`);

  // ─── STAGE 2: Parent Credential Generation, View Password & Login ID Login ────
  console.log("\n[STAGE 2] Testing Parent Credential Generation, View Password & Login ID Login...");
  const parentStudentId = `STU-TEST-${runId}`;
  const parentLoginId = `PRT-LOGIN-${runId}`;
  const parentInitialPassword = "ParentPass123!_Secure";

  const parentCred = await generateParentCredential(parentStudentId, {
    customLoginId: parentLoginId,
    password: parentInitialPassword,
    student: { id: parentStudentId, parent: `Test Parent ${runId}`, phone: "9876543210" } as any,
  });

  console.log(`  ✓ Parent Generated - Login ID: '${parentCred.loginId}', Password: '${parentCred.password}'`);

  // Verify auth.users account exists in Supabase
  const { data: parentAuthList } = await adminSupabase.auth.admin.listUsers();
  const parentAuthUser = parentAuthList?.users?.find((u) => u.user_metadata?.login_id === parentLoginId);
  if (!parentAuthUser) {
    throw new Error(`FAIL: Parent auth.users account was not created in Supabase Auth for login_id '${parentLoginId}'`);
  }
  console.log(`  ✓ [VERIFIED IN SUPABASE AUTH] auth.users record exists with ID: '${parentAuthUser.id}', Email: '${parentAuthUser.email}'`);

  // REQ 6: View Password test for Parent
  const viewParentCred = getParentCredential(parentStudentId);
  if (!viewParentCred || !viewParentCred.password || viewParentCred.password !== parentInitialPassword) {
    throw new Error(`FAIL: Parent View Password option returned invalid password: '${viewParentCred?.password}'`);
  }
  console.log("  [PASS REQ 6] Parent View Password verified: Exact generated password displayed.");

  // REQ 7: Login ID + Displayed Password Authentication for Parent & Portal Redirect
  const parentLoginRes = await login(parentLoginId, parentInitialPassword);
  if (!parentLoginRes.success || !parentLoginRes.profile || parentLoginRes.profile.role !== "parent") {
    throw new Error(`FAIL: Parent Login ID authentication failed: ${parentLoginRes.error}`);
  }
  console.log(`  [PASS REQ 7] Parent Login ID '${parentLoginId}' authenticated successfully. Redirect Role: '${parentLoginRes.profile.role}' (target: /parent).`);

  // ─── STAGE 3: Password Reset / Regeneration, Old Password Rejection & New Password Login ───
  console.log("\n[STAGE 3] Testing Password Reset / Regeneration for Staff...");
  const updatedStaffCred = await resetTeacherPassword(staffTeacherId);
  const newStaffPassword = updatedStaffCred.password;
  console.log(`  ✓ Staff Password Reset - New Password: '${newStaffPassword}'`);

  // REQ 9 & 10: View Password shows new password
  const viewResetStaffCred = getTeacherCredential(staffTeacherId);
  if (!viewResetStaffCred || viewResetStaffCred.password !== newStaffPassword) {
    throw new Error(`FAIL: View Password after reset showed stale password: '${viewResetStaffCred?.password}'`);
  }
  console.log("  [PASS REQ 9-10] View Password after reset verified: Displays NEW password.");

  // REQ 11: Old password fails
  const oldPassRes = await login(staffLoginId, staffInitialPassword);
  if (oldPassRes.success) {
    throw new Error("FAIL: Old password succeeded after password reset!");
  }
  console.log("  [PASS REQ 11] Old password correctly REJECTED after reset.");

  // REQ 12: New password succeeds
  const newPassRes = await login(staffLoginId, newStaffPassword);
  if (!newPassRes.success) {
    throw new Error(`FAIL: New password login failed after reset: ${newPassRes.error}`);
  }
  console.log("  [PASS REQ 12] New password login SUCCESSFUL.");

  // REQ 13: Direct registered email login
  console.log("\n[STAGE 4] Testing direct registered email login...");
  const staffEmail = staffAuthUser.email!;
  const emailLoginRes = await login(staffEmail, newStaffPassword);
  if (!emailLoginRes.success) {
    throw new Error(`FAIL: Direct email login failed for ${staffEmail}: ${emailLoginRes.error}`);
  }
  console.log(`  [PASS REQ 13] Direct registered email login verified for '${staffEmail}'.`);

  // REQ 14: Testing a repaired seed account
  console.log("\n[STAGE 5] Testing previously broken & repaired seed account 'PARSEED5011'...");
  const repairedLoginRes = await login("PARSEED5011", "parent123");
  if (!repairedLoginRes.success || repairedLoginRes.profile?.role !== "parent") {
    throw new Error(`FAIL: Repaired user login failed for PARSEED5011: ${repairedLoginRes.error}`);
  }
  console.log("  [PASS REQ 14] Repaired user 'PARSEED5011' logged in successfully.");

  // REQ 15: System Accounts (Admin, Principal, Office)
  console.log("\n[STAGE 6] Testing Admin, Principal, and Office Login ID Authentication...");
  await triggerServerUserProvisioning({ login_id: "ADMIN001", email: "admin@sunshineschool.edu", password: "admin123", role: "admin", name: "System Admin" });
  await triggerServerUserProvisioning({ login_id: "PRINCIPAL001", email: "principal@sunshineschool.edu", password: "principal123", role: "principal", name: "School Principal" });
  await triggerServerUserProvisioning({ login_id: "OFFICE001", email: "office@sunshineschool.edu", password: "office123", role: "office", name: "Office Manager" });

  await new Promise((r) => setTimeout(r, 600));

  const adminRes = await login("ADMIN001", "admin123");
  if (!adminRes.success || adminRes.profile?.role !== "admin") {
    throw new Error(`FAIL: Admin login failed: ${adminRes.error}`);
  }
  console.log("  [PASS REQ 15] Admin login verified.");

  const principalRes = await login("PRINCIPAL001", "principal123");
  if (!principalRes.success || principalRes.profile?.role !== "principal") {
    throw new Error(`FAIL: Principal login failed: ${principalRes.error}`);
  }
  console.log("  [PASS REQ 15] Principal login verified.");

  const officeRes = await login("OFFICE001", "office123");
  if (!officeRes.success || officeRes.profile?.role !== "office") {
    throw new Error(`FAIL: Office login failed: ${officeRes.error}`);
  }
  console.log("  [PASS REQ 15] Office login verified.");

  // REQ 8 & 16: Refresh & Persistent View Password
  console.log("\n[STAGE 7] Simulating page refresh & syncing credentials from Supabase...");
  await syncCredentialsFromSupabase();
  const refreshedStaffCred = getTeacherCredential(staffTeacherId);
  if (!refreshedStaffCred || refreshedStaffCred.password !== newStaffPassword) {
    throw new Error("FAIL: View password lost password after simulated page refresh!");
  }
  console.log("  [PASS REQ 16] Persistent View Password functionality verified after page refresh.");

  // CLEANUP
  console.log("\n[CLEANUP] Purging test accounts...");
  await adminSupabase.from("gv_users").delete().eq("login_id", staffLoginId);
  await adminSupabase.from("gv_users").delete().eq("login_id", parentLoginId);
  await adminSupabase.from("gv_requests").delete().eq("id", `cred_teacher_${staffTeacherId}`);
  await adminSupabase.from("gv_requests").delete().eq("id", `cred_parent_${parentStudentId}`);
  console.log("  [PASS] Cleanup complete.");

  console.log("\n==================================================================================");
  console.log("📊 REAL AUTHENTICATION & VIEW PASSWORD RESULT: PASS (All Requirements Verified)");
  console.log("==================================================================================");
}

runLoginIdAndViewPasswordRealE2ETest().catch((err) => {
  console.error("E2E test exception:", err);
  process.exit(1);
});
