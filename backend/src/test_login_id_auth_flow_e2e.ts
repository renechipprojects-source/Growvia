import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";
import { triggerServerUserProvisioning, resolveLoginIdViaServer, updateServerAuthPassword, updateServerAuthEmail } from "../../frontend/src/lib/supabaseAuth";

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

if (!serviceKey) {
  console.error("Missing SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, serviceKey);
const supabaseAnon = createClient(supabaseUrl, anonKey);

async function runLoginIdAuthFlowE2ETest() {
  console.log("==================================================================================");
  console.log("🧪 STARTING GENERATED LOGIN ID AUTHENTICATION & CREDENTIAL LIFECYCLE E2E TEST");
  console.log("==================================================================================");

  // ─────────────────────────────────────────────────────────────────────────────
  // TEST 1: CORE PORTAL ROLES AUTHENTICATION (ADMIN001, PRINCIPAL001, OFFICE001)
  // ─────────────────────────────────────────────────────────────────────────────
  console.log("\n[TEST 1] Testing Default Portal Roles Login ID Authentication...");

  const portalAccounts = [
    { loginId: "ADMIN001", expectedEmail: "admin@sunshineschool.edu", expectedRole: "admin" },
    { loginId: "PRINCIPAL001", expectedEmail: "principal@sunshineschool.edu", expectedRole: "principal" },
    { loginId: "OFFICE001", expectedEmail: "office@sunshineschool.edu", expectedRole: "office" },
  ];

  for (const acc of portalAccounts) {
    console.log(`  └─ Resolving Login ID '${acc.loginId}'...`);
    const resolved = await resolveLoginIdViaServer(acc.loginId);
    if (!resolved || !resolved.email) {
      console.error(`  └─ [FAIL] Could not resolve Login ID ${acc.loginId}`);
      process.exit(1);
    }

    console.log(`  └─ Authenticating as ${resolved.email}...`);
    const { data: authData, error: authErr } = await supabaseAnon.auth.signInWithPassword({
      email: resolved.email,
      password: "Password@123",
    });

    if (authErr || !authData?.user) {
      console.error(`  └─ [FAIL] Password auth failed for ${acc.loginId}:`, authErr?.message);
      process.exit(1);
    }

    console.log(`  └─ [PASS] ${acc.loginId} authenticated successfully (Role: ${resolved.role}).`);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // TEST 2: NEW STAFF GENERATED LOGIN ID AUTHENTICATION
  // ─────────────────────────────────────────────────────────────────────────────
  const staffLoginId = `TEA-Test-${Date.now().toString().slice(-4)}`;
  const staffEmail = `${staffLoginId.toLowerCase()}@sunshineschool.edu`;
  const initialPassword = "InitialPassword@123";

  console.log(`\n[TEST 2] Provisioning new Staff account with Login ID '${staffLoginId}'...`);
  const provRes = await triggerServerUserProvisioning({
    login_id: staffLoginId,
    email: staffEmail,
    password: initialPassword,
    role: "teacher",
    name: "Dr. Sunita Rao",
    mobile: "9876500441",
  });

  if (!provRes?.success) {
    console.error("  └─ [FAIL] Staff user provisioning failed.");
    process.exit(1);
  }
  console.log("  └─ [PASS] Staff account provisioned in auth.users and gv_users.");

  console.log(`  └─ Attempting login with Login ID '${staffLoginId}' and initial password...`);
  const resolvedStaff = await resolveLoginIdViaServer(staffLoginId);
  if (!resolvedStaff?.email) {
    console.error("  └─ [FAIL] Could not resolve staff Login ID.");
    process.exit(1);
  }

  const { data: staffAuth, error: staffAuthErr } = await supabaseAnon.auth.signInWithPassword({
    email: resolvedStaff.email,
    password: initialPassword,
  });

  if (staffAuthErr || !staffAuth?.user) {
    console.error("  └─ [FAIL] Staff login failed:", staffAuthErr?.message);
    process.exit(1);
  }
  console.log(`  └─ [PASS] Staff Login ID '${staffLoginId}' authenticated successfully.`);

  // ─────────────────────────────────────────────────────────────────────────────
  // TEST 3: PARENT GENERATED LOGIN ID AUTHENTICATION
  // ─────────────────────────────────────────────────────────────────────────────
  const parentLoginId = `PAR-Test-${Date.now().toString().slice(-4)}`;
  const parentEmail = `${parentLoginId.toLowerCase()}@growvia.edu`;

  console.log(`\n[TEST 3] Provisioning new Parent account with Login ID '${parentLoginId}'...`);
  const parentProvRes = await triggerServerUserProvisioning({
    login_id: parentLoginId,
    email: parentEmail,
    password: initialPassword,
    role: "parent",
    name: "Ramesh Chandra",
    mobile: "9876500442",
  });

  if (!parentProvRes?.success) {
    console.error("  └─ [FAIL] Parent user provisioning failed.");
    process.exit(1);
  }

  const resolvedParent = await resolveLoginIdViaServer(parentLoginId);
  const { data: parentAuth, error: parentAuthErr } = await supabaseAnon.auth.signInWithPassword({
    email: resolvedParent?.email || parentEmail,
    password: initialPassword,
  });

  if (parentAuthErr || !parentAuth?.user) {
    console.error("  └─ [FAIL] Parent login failed:", parentAuthErr?.message);
    process.exit(1);
  }
  console.log(`  └─ [PASS] Parent Login ID '${parentLoginId}' authenticated successfully.`);

  // ─────────────────────────────────────────────────────────────────────────────
  // TEST 4: PASSWORD CHANGE LIFECYCLE TEST
  // ─────────────────────────────────────────────────────────────────────────────
  const newPassword = "NewUpdatedPassword#99";
  console.log(`\n[TEST 4] Updating password for '${staffLoginId}' to new secret password...`);
  const pwdRes = await updateServerAuthPassword(staffLoginId, newPassword);

  if (!pwdRes?.success) {
    console.error("  └─ [FAIL] Password update failed.");
    process.exit(1);
  }

  console.log("  └─ Verifying OLD password fails...");
  const { error: oldPwdErr } = await supabaseAnon.auth.signInWithPassword({
    email: staffEmail,
    password: initialPassword,
  });

  if (!oldPwdErr) {
    console.error("  └─ [FAIL] Old password should have failed, but succeeded!");
    process.exit(1);
  }
  console.log("  └─ [PASS] Old password correctly rejected.");

  console.log("  └─ Verifying NEW password succeeds via Login ID resolution...");
  const { data: newPwdAuth, error: newPwdErr } = await supabaseAnon.auth.signInWithPassword({
    email: staffEmail,
    password: newPassword,
  });

  if (newPwdErr || !newPwdAuth?.user) {
    console.error("  └─ [FAIL] New password auth failed:", newPwdErr?.message);
    process.exit(1);
  }
  console.log("  └─ [PASS] New password authenticated successfully.");

  // ─────────────────────────────────────────────────────────────────────────────
  // TEST 5: EMAIL CHANGE LIFECYCLE TEST (LOGIN ID PERSISTENCE)
  // ─────────────────────────────────────────────────────────────────────────────
  const updatedEmail = `sunita.rao.updated.${Date.now().toString().slice(-4)}@sunshine.edu`;
  console.log(`\n[TEST 5] Changing user email to '${updatedEmail}'...`);
  const emailRes = await updateServerAuthEmail(staffLoginId, updatedEmail);

  if (!emailRes?.success) {
    console.error("  └─ [FAIL] Email update failed.");
    process.exit(1);
  }

  console.log("  └─ Resolving user by ORIGINAL Login ID after email change...");
  const resolvedAfterEmailChange = await resolveLoginIdViaServer(staffLoginId);
  console.log(`      Resolved Auth Email: ${resolvedAfterEmailChange?.email}`);

  if (resolvedAfterEmailChange?.email !== updatedEmail) {
    console.error(`  └─ [FAIL] Expected resolved email to be ${updatedEmail}, got ${resolvedAfterEmailChange?.email}`);
    process.exit(1);
  }

  console.log("  └─ Authenticating using original Login ID resolution + new email + new password...");
  const { data: afterEmailAuth, error: afterEmailErr } = await supabaseAnon.auth.signInWithPassword({
    email: resolvedAfterEmailChange.email,
    password: newPassword,
  });

  if (afterEmailErr || !afterEmailAuth?.user) {
    console.error("  └─ [FAIL] Login ID auth failed after email change:", afterEmailErr?.message);
    process.exit(1);
  }
  console.log("  └─ [PASS] Login ID authentication remained 100% functional after email change.");

  // ─────────────────────────────────────────────────────────────────────────────
  // CLEANUP
  // ─────────────────────────────────────────────────────────────────────────────
  console.log(`\n[CLEANUP] Deleting test users ${staffLoginId} and ${parentLoginId}...`);
  if (staffAuth?.user?.id) await supabaseAdmin.auth.admin.deleteUser(staffAuth.user.id);
  if (parentAuth?.user?.id) await supabaseAdmin.auth.admin.deleteUser(parentAuth.user.id);
  await supabaseAdmin.from("gv_users").delete().or(`login_id.eq.${staffLoginId},login_id.eq.${parentLoginId}`);
  console.log("  └─ [PASS] Test records cleaned up cleanly.");

  console.log("\n==================================================================================");
  console.log("✅ ALL GENERATED LOGIN ID AUTHENTICATION & LIFECYCLE E2E CHECKS PASSED!");
  console.log("==================================================================================");
}

runLoginIdAuthFlowE2ETest().catch((err) => {
  console.error("E2E Test Error:", err);
  process.exit(1);
});
