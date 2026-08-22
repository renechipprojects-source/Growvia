import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";
import { login, triggerServerUserProvisioning } from "../../frontend/src/lib/supabaseAuth";
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

async function testOfficeGeneratedCredentialsE2E() {
  console.log("==================================================================================");
  console.log("🧪 VERIFYING OFFICE-GENERATED STAFF & PARENT CREDENTIALS AUTHENTICATION");
  console.log("==================================================================================");

  const timestamp = Date.now().toString().slice(-4);

  // ─────────────────────────────────────────────────────────────────────────────
  // 1. GENERATED STAFF CREDENTIAL TEST
  // ─────────────────────────────────────────────────────────────────────────────
  const staffLoginId = `TCH-Gen-${timestamp}`;
  const staffEmail = `staff.gen.${timestamp}@sunshineschool.edu`;
  const staffPassword = `StaffGenPass#${timestamp}`;

  console.log(`\n[STEP 1] Generating Office Staff Credential: Login ID '${staffLoginId}', Email '${staffEmail}'...`);
  const staffRes = await createTeacherAuthAccount({
    teacherId: staffLoginId,
    loginId: staffLoginId,
    password: staffPassword,
    name: "Generated Staff Member",
    email: staffEmail,
    mobile: "9876599001",
  });

  if (!staffRes || !staffRes.authUserId) {
    console.error("  ❌ [FAIL] Staff Auth creation failed!");
    process.exit(1);
  }
  console.log(`  └─ ✅ Created Auth User ID: ${staffRes.authUserId}`);

  // Verify in gv_users
  const { data: gvStaff } = await supabaseAdmin.from("gv_users").select("*").eq("login_id", staffLoginId).maybeSingle();
  if (!gvStaff || gvStaff.auth_user_id !== staffRes.authUserId) {
    console.error("  ❌ [FAIL] gv_users record mismatch for staff!");
    process.exit(1);
  }
  console.log(`  └─ ✅ gv_users record verified: auth_user_id=${gvStaff.auth_user_id}`);

  // Verify Email Login
  console.log(`  Testing Staff Email Login ('${staffEmail}')...`);
  const staffEmailLogin = await login(staffEmail, staffPassword);
  if (!staffEmailLogin.success || !staffEmailLogin.user) {
    console.error("  ❌ [FAIL] Staff Email login failed:", staffEmailLogin.error);
    process.exit(1);
  }
  console.log("  └─ ✅ Staff Email Login PASSED!");

  // Verify Login ID Login
  console.log(`  Testing Staff Login ID Login ('${staffLoginId}')...`);
  const staffIdLogin = await login(staffLoginId, staffPassword);
  if (!staffIdLogin.success || !staffIdLogin.user) {
    console.error("  ❌ [FAIL] Staff Login ID login failed:", staffIdLogin.error);
    process.exit(1);
  }
  console.log("  └─ ✅ Staff Login ID Login PASSED!");

  // ─────────────────────────────────────────────────────────────────────────────
  // 2. GENERATED PARENT CREDENTIAL TEST
  // ─────────────────────────────────────────────────────────────────────────────
  const parentLoginId = `26${timestamp}`; // Admission no style Login ID
  const parentEmail = `parent.gen.${timestamp}@growvia.edu`;
  const parentPassword = `ParentGenPass#${timestamp}`;

  console.log(`\n[STEP 2] Generating Office Parent Credential: Login ID '${parentLoginId}', Email '${parentEmail}'...`);
  const parentCred = await generateParentCredential(`STU-${timestamp}`, {
    customLoginId: parentLoginId,
    password: parentPassword,
    student: {
      id: `STU-${timestamp}`,
      admissionNo: parentLoginId,
      parent: "Generated Parent Member",
      phone: "9876599002",
      email: parentEmail,
    } as any,
  });

  if (!parentCred || !parentCred.loginId) {
    console.error("  ❌ [FAIL] Parent credential creation failed!");
    process.exit(1);
  }

  // Verify in gv_users
  const { data: gvParent } = await supabaseAdmin.from("gv_users").select("*").eq("login_id", parentLoginId).maybeSingle();
  if (!gvParent || !gvParent.auth_user_id) {
    console.error("  ❌ [FAIL] gv_users record missing or unlinked for parent!");
    process.exit(1);
  }
  console.log(`  └─ ✅ gv_users record verified: auth_user_id=${gvParent.auth_user_id}`);

  // Verify Email Login
  console.log(`  Testing Parent Email Login ('${parentEmail}')...`);
  const parentEmailLogin = await login(parentEmail, parentPassword);
  if (!parentEmailLogin.success || !parentEmailLogin.user) {
    console.error("  ❌ [FAIL] Parent Email login failed:", parentEmailLogin.error);
    process.exit(1);
  }
  console.log("  └─ ✅ Parent Email Login PASSED!");

  // Verify Login ID Login
  console.log(`  Testing Parent Login ID Login ('${parentLoginId}')...`);
  const parentIdLogin = await login(parentLoginId, parentPassword);
  if (!parentIdLogin.success || !parentIdLogin.user) {
    console.error("  ❌ [FAIL] Parent Login ID login failed:", parentIdLogin.error);
    process.exit(1);
  }
  console.log("  └─ ✅ Parent Login ID Login PASSED!");

  // ─────────────────────────────────────────────────────────────────────────────
  // CLEANUP
  // ─────────────────────────────────────────────────────────────────────────────
  console.log("\n[CLEANUP] Removing test generated accounts...");
  if (staffRes.authUserId) await supabaseAdmin.auth.admin.deleteUser(staffRes.authUserId);
  if (gvParent.auth_user_id) await supabaseAdmin.auth.admin.deleteUser(gvParent.auth_user_id);
  await supabaseAdmin.from("gv_users").delete().or(`login_id.eq.${staffLoginId},login_id.eq.${parentLoginId}`);
  console.log("  └─ ✅ Test accounts cleaned up.");

  console.log("\n==================================================================================");
  console.log("✅ ALL OFFICE-GENERATED CREDENTIALS VERIFIED WORKING 100% PERFECTLY!");
  console.log("==================================================================================");
}

testOfficeGeneratedCredentialsE2E().catch((err) => {
  console.error("E2E Test Error:", err);
  process.exit(1);
});
