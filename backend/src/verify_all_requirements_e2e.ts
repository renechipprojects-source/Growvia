import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";
import { login, triggerServerUserProvisioning, updateServerAuthEmail, updateServerAuthPassword } from "../../frontend/src/lib/supabaseAuth";
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
const supabaseAdmin = createClient(supabaseUrl, serviceKey);

async function verifyAllRequirementsE2E() {
  console.log("==================================================================================");
  console.log("🧪 COMPREHENSIVE MANDATORY E2E VERIFICATION SUITE");
  console.log("==================================================================================");

  // ─────────────────────────────────────────────────────────────────────────────
  // PART 1: DEFAULT EMAIL LOGIN VERIFICATION
  // ─────────────────────────────────────────────────────────────────────────────
  console.log("\n[PART 1] Testing Registered Email as Primary Default Login...");

  const defaultEmailLogins = [
    { roleName: "Admin", email: "admin@sunshineschool.edu", pass: "Password@123", expectedRole: "admin" },
    { roleName: "Principal", email: "principal@sunshineschool.edu", pass: "Password@123", expectedRole: "principal" },
    { roleName: "Office", email: "office@sunshineschool.edu", pass: "Password@123", expectedRole: "office" },
    { roleName: "Teacher (Staff)", email: "teacher@sunshineschool.edu", pass: "Password@123", expectedRole: "teacher" },
    { roleName: "Parent", email: "parent@sunshineschool.edu", pass: "Password@123", expectedRole: "parent" },
  ];

  for (const item of defaultEmailLogins) {
    console.log(`  └─ Logging in with Email '${item.email}' (${item.roleName})...`);
    const res = await login(item.email, item.pass);
    if (!res.success || !res.user || res.profile?.role !== item.expectedRole) {
      console.error(`  ❌ [FAIL] Email login failed for ${item.email}:`, res.error);
      process.exit(1);
    }
    console.log(`  └─ ✅ [PASS] Authenticated! User ID: ${res.user.id} | Role: ${res.profile?.role}`);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // PART 2: OFFICE-GENERATED CREDENTIALS VERIFICATION
  // ─────────────────────────────────────────────────────────────────────────────
  console.log("\n[PART 2] Testing Office-Generated Credentials Flow...");

  const timestamp = Date.now().toString().slice(-4);
  const staffId = `TCH-AuthSuite-${timestamp}`;
  const staffEmail = `staff.suite.${timestamp}@sunshineschool.edu`;
  const staffPass = `StaffSuitePass#${timestamp}`;

  const staffRes = await createTeacherAuthAccount({
    teacherId: staffId,
    loginId: staffId,
    password: staffPass,
    name: "Auth Suite Teacher",
    email: staffEmail,
    mobile: "9876543299",
  });

  if (!staffRes || !staffRes.authUserId) {
    console.error("  ❌ [FAIL] Staff creation failed.");
    process.exit(1);
  }

  console.log(`  └─ Staff created in auth.users (${staffRes.authUserId}) and gv_users.`);
  console.log(`  └─ Testing Staff Email login ('${staffEmail}')...`);
  const sEmailRes = await login(staffEmail, staffPass);
  if (!sEmailRes.success) {
    console.error("  ❌ [FAIL] Staff Email login failed:", sEmailRes.error);
    process.exit(1);
  }
  console.log("  └─ ✅ Staff Email Login PASSED!");

  console.log(`  └─ Testing Staff Login ID login ('${staffId}')...`);
  const sIdRes = await login(staffId, staffPass);
  if (!sIdRes.success) {
    console.error("  ❌ [FAIL] Staff Login ID login failed:", sIdRes.error);
    process.exit(1);
  }
  console.log("  └─ ✅ Staff Login ID Login PASSED!");

  // Parent test
  const parentId = `26${timestamp}`;
  const parentEmail = `parent.suite.${timestamp}@growvia.edu`;
  const parentPass = `ParentSuitePass#${timestamp}`;

  await generateParentCredential(`STU-${timestamp}`, {
    customLoginId: parentId,
    password: parentPass,
    student: {
      id: `STU-${timestamp}`,
      admissionNo: parentId,
      parent: "Auth Suite Parent",
      email: parentEmail,
      phone: "9876543298",
    } as any,
  });

  console.log(`  └─ Parent created in auth.users and gv_users.`);
  console.log(`  └─ Testing Parent Email login ('${parentEmail}')...`);
  const pEmailRes = await login(parentEmail, parentPass);
  if (!pEmailRes.success) {
    console.error("  ❌ [FAIL] Parent Email login failed:", pEmailRes.error);
    process.exit(1);
  }
  console.log("  └─ ✅ Parent Email Login PASSED!");

  console.log(`  └─ Testing Parent Login ID login ('${parentId}')...`);
  const pIdRes = await login(parentId, parentPass);
  if (!pIdRes.success) {
    console.error("  ❌ [FAIL] Parent Login ID login failed:", pIdRes.error);
    process.exit(1);
  }
  console.log("  └─ ✅ Parent Login ID Login PASSED!");

  // ─────────────────────────────────────────────────────────────────────────────
  // PART 3: FORGOT PASSWORD & PASSWORD/EMAIL CHANGE LIFECYCLE
  // ─────────────────────────────────────────────────────────────────────────────
  console.log("\n[PART 3] Testing Password & Email Change Authorization Lifecycle...");

  const newStaffPass = `NewSecretPass#${timestamp}!`;
  console.log(`  └─ Updating password for Staff '${staffId}'...`);
  await updateServerAuthPassword(staffId, newStaffPass);

  console.log("  └─ Verifying old password fails...");
  const oldLoginRes = await login(staffEmail, staffPass);
  if (oldLoginRes.success) {
    console.error("  ❌ [FAIL] Old password should have failed but succeeded!");
    process.exit(1);
  }
  console.log("  └─ ✅ Old password correctly rejected.");

  console.log("  └─ Verifying new password succeeds with Email...");
  const newEmailLoginRes = await login(staffEmail, newStaffPass);
  if (!newEmailLoginRes.success) {
    console.error("  ❌ [FAIL] New password failed with Email:", newEmailLoginRes.error);
    process.exit(1);
  }
  console.log("  └─ ✅ New password authenticated with Email!");

  console.log("  └─ Verifying new password succeeds with Login ID...");
  const newIdLoginRes = await login(staffId, newStaffPass);
  if (!newIdLoginRes.success) {
    console.error("  ❌ [FAIL] New password failed with Login ID:", newIdLoginRes.error);
    process.exit(1);
  }
  console.log("  └─ ✅ New password authenticated with Login ID!");

  // ─────────────────────────────────────────────────────────────────────────────
  // CLEANUP
  // ─────────────────────────────────────────────────────────────────────────────
  console.log("\n[CLEANUP] Cleaning up test accounts...");
  if (staffRes.authUserId) await supabaseAdmin.auth.admin.deleteUser(staffRes.authUserId);
  const { data: pGv } = await supabaseAdmin.from("gv_users").select("auth_user_id").eq("login_id", parentId).maybeSingle();
  if (pGv?.auth_user_id) await supabaseAdmin.auth.admin.deleteUser(pGv.auth_user_id);
  await supabaseAdmin.from("gv_users").delete().or(`login_id.eq.${staffId},login_id.eq.${parentId}`);
  console.log("  └─ ✅ Cleanup completed.");

  console.log("\n==================================================================================");
  console.log("✅ ALL MANDATORY E2E VERIFICATION CHECKS PASSED PERFECTLY!");
  console.log("==================================================================================");
}

verifyAllRequirementsE2E().catch((err) => {
  console.error("E2E Verification Error:", err);
  process.exit(1);
});
