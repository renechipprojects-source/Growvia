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

interface RoleTestResult {
  role: string;
  loginId: string;
  step1_provision: boolean;
  step2_email_sync: boolean;
  step3_new_email_login: boolean;
  step4_old_email_rejected: boolean;
  step5_pwd_change: boolean;
  step6_old_pwd_rejected: boolean;
  step7_new_pwd_login: boolean;
  step8_login_id_auth: boolean;
  step9_portal_session: boolean;
  step10_no_secrets_exposed: boolean;
  cleanup: boolean;
}

async function testAllRolesAuthE2E() {
  const { createClient } = await import("@supabase/supabase-js");
  const SUPABASE_URL = process.env.SUPABASE_URL || "https://nyhnkftlkigoliyogwvp.supabase.co";
  const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  const { triggerServerUserProvisioning, updateServerAuthEmail, updateServerAuthPassword, login } = await import("../../frontend/src/lib/supabaseAuth");

  console.log("==================================================================================");
  console.log("🔐 FINAL ROLE-BY-ROLE REAL SUPABASE AUTH & DATA VERIFICATION SUITE");
  console.log("==================================================================================");

  const rolesToTest = [
    { role: "admin", prefix: "ADM" },
    { role: "principal", prefix: "PRN" },
    { role: "office", prefix: "OFC" },
    { role: "teacher", prefix: "TCH" },
    { role: "parent", prefix: "PAR" },
  ];

  const results: RoleTestResult[] = [];

  for (const { role, prefix } of rolesToTest) {
    const testSuffix = Date.now().toString().slice(-4);
    const loginId = `${prefix}-TEST-${testSuffix}`;
    const initialEmail = `${role}-init-${testSuffix}@growvia.edu`;
    const newEmail = `${role}-new-${testSuffix}@growvia.edu`;
    const initialPwd = `Init#${role}#${testSuffix}!`;
    const newPwd = `New#${role}#${testSuffix}!`;

    console.log(`\n----------------------------------------------------------------------------------`);
    console.log(`👤 TESTING ROLE: ${role.toUpperCase()} (Login ID: ${loginId})`);
    console.log(`----------------------------------------------------------------------------------`);

    const result: RoleTestResult = {
      role: role.toUpperCase(),
      loginId,
      step1_provision: false,
      step2_email_sync: false,
      step3_new_email_login: false,
      step4_old_email_rejected: false,
      step5_pwd_change: false,
      step6_old_pwd_rejected: false,
      step7_new_pwd_login: false,
      step8_login_id_auth: false,
      step9_portal_session: false,
      step10_no_secrets_exposed: false,
      cleanup: false,
    };

    let authUserId: string | null = null;

    try {
      const delay = async () => {
        const { supabase: client } = await import("../../frontend/src/lib/supabase");
        await client.auth.signOut().catch(() => {});
        await new Promise((r) => setTimeout(r, 300));
      };

      // 1. Provision user
      const provRes = await triggerServerUserProvisioning({
        login_id: loginId,
        email: initialEmail,
        password: initialPwd,
        role: role,
        name: `Test ${role} ${testSuffix}`,
      });
      await delay();

      const { data: usersList } = await admin.auth.admin.listUsers();
      const authUser = usersList?.users?.find((u) => u.email?.toLowerCase() === initialEmail.toLowerCase());
      if (provRes.success && authUser) {
        authUserId = authUser.id;
        result.step1_provision = true;
        console.log(`  [PASS 1] Provisioned user in auth.users (${authUser.id}) and gv_users.`);
      } else {
        console.error(`  [FAIL 1] Failed to provision ${role}`);
      }

      // 2. Email sync & update
      const emailUpdateRes = await updateServerAuthEmail(loginId, newEmail);
      await delay();
      const { data: updatedUsers } = await admin.auth.admin.listUsers();
      const updatedAuthUser = updatedUsers?.users?.find((u) => u.id === authUserId);
      const { data: gvRow } = await admin.from("gv_users").select("email").eq("login_id", loginId).single();

      if (
        emailUpdateRes.success &&
        updatedAuthUser?.email?.toLowerCase() === newEmail.toLowerCase() &&
        gvRow?.email?.toLowerCase() === newEmail.toLowerCase()
      ) {
        result.step2_email_sync = true;
        console.log(`  [PASS 2] Email updated & synchronized to '${newEmail}' in auth.users and gv_users.`);
      } else {
        console.error(`  [FAIL 2] Email update failed or desynchronized for ${role}`);
      }

      // 3. Login with NEW email
      await delay();
      const newEmailLoginRes = await login(newEmail, initialPwd);
      if (newEmailLoginRes.success && newEmailLoginRes.user) {
        result.step3_new_email_login = true;
        console.log(`  [PASS 3] Login with NEW email '${newEmail}' succeeded.`);
      } else {
        console.error(`  [FAIL 3] Login with NEW email failed: ${newEmailLoginRes.error}`);
      }

      // 4. Login with OLD email (rejected)
      await delay();
      const oldEmailLoginRes = await login(initialEmail, initialPwd);
      if (!oldEmailLoginRes.success) {
        result.step4_old_email_rejected = true;
        console.log(`  [PASS 4] Login with OLD email '${initialEmail}' correctly rejected.`);
      } else {
        console.error(`  [FAIL 4] Login with OLD email succeeded (Security Violation!)`);
      }

      // 5. Password change
      await delay();
      const pwdUpdateRes = await updateServerAuthPassword(loginId, newPwd);
      if (pwdUpdateRes.success) {
        result.step5_pwd_change = true;
        console.log(`  [PASS 5] Password updated in Supabase Auth & gv_users.`);
      } else {
        console.error(`  [FAIL 5] Password update failed for ${role}`);
      }

      // 6. Login with OLD password (rejected)
      await delay();
      const oldPwdLoginRes = await login(loginId, initialPwd);
      if (!oldPwdLoginRes.success) {
        result.step6_old_pwd_rejected = true;
        console.log(`  [PASS 6] Login with OLD password correctly rejected.`);
      } else {
        console.error(`  [FAIL 6] Login with OLD password succeeded (Security Violation!)`);
      }

      // 7. Login with NEW password
      await delay();
      const newPwdLoginRes = await login(newEmail, newPwd);
      if (newPwdLoginRes.success && newPwdLoginRes.profile?.role === role) {
        result.step7_new_pwd_login = true;
        console.log(`  [PASS 7] Login with NEW password succeeded.`);
      } else {
        console.error(`  [FAIL 7] Login with NEW password failed: ${newPwdLoginRes.error}`);
      }

      // 8. Login ID authentication after changes
      await delay();
      const loginIdAuthRes = await login(loginId, newPwd);
      if (loginIdAuthRes.success && loginIdAuthRes.profile?.role === role) {
        result.step8_login_id_auth = true;
        console.log(`  [PASS 8] Login ID '${loginId}' + new password authenticated successfully.`);
      } else {
        console.error(`  [FAIL 8] Login ID authentication failed: ${loginIdAuthRes.error}`);
      }

      // 9. Portal Session verification
      if (loginIdAuthRes.profile && loginIdAuthRes.profile.role === role) {
        result.step9_portal_session = true;
        console.log(`  [PASS 9] Portal session verified for role '${role}'.`);
      }

      // 10. Secrets leakage audit
      const rawProfileJson = JSON.stringify(loginIdAuthRes.profile || {});
      const hasSecretsLeak =
        rawProfileJson.includes('"password":') ||
        rawProfileJson.includes("password_hash") ||
        rawProfileJson.includes("encrypted_password") ||
        rawProfileJson.includes("service_role");

      if (!hasSecretsLeak) {
        result.step10_no_secrets_exposed = true;
        console.log(`  [PASS 10] No sensitive passwords or keys exposed in authentication response.`);
      } else {
        console.error(`  [FAIL 10] Sensitive keys detected in profile object!`);
      }

    } catch (err: any) {
      console.error(`Error testing role ${role}:`, err);
    } finally {
      // Clean up test account
      if (authUserId) {
        await admin.auth.admin.deleteUser(authUserId);
      }
      await admin.from("gv_users").delete().eq("login_id", loginId);
      result.cleanup = true;
      console.log(`  [CLEANUP] Deleted test account ${loginId} (${authUserId})`);
    }

    results.push(result);
  }

  console.log("\n==================================================================================");
  console.log("📊 SUMMARY MATRIX: FIVE-ROLE AUTHENTICATION AUDIT");
  console.log("==================================================================================");
  console.table(
    results.map((r) => ({
      Role: r.role,
      "Provision & DB Sync": r.step1_provision ? "PASS" : "FAIL",
      "Email Update Sync": r.step2_email_sync ? "PASS" : "FAIL",
      "New Email Auth": r.step3_new_email_login ? "PASS" : "FAIL",
      "Old Email Rejection": r.step4_old_email_rejected ? "PASS" : "FAIL",
      "Password Update": r.step5_pwd_change ? "PASS" : "FAIL",
      "Old Pwd Rejection": r.step6_old_pwd_rejected ? "PASS" : "FAIL",
      "New Pwd Auth": r.step7_new_pwd_login ? "PASS" : "FAIL",
      "Login ID Auth": r.step8_login_id_auth ? "PASS" : "FAIL",
      "Portal Role Match": r.step9_portal_session ? "PASS" : "FAIL",
      "Secrets Safe": r.step10_no_secrets_exposed ? "PASS" : "FAIL",
      Cleaned: r.cleanup ? "YES" : "NO",
    }))
  );

  const allPassed = results.every(
    (r) =>
      r.step1_provision &&
      r.step2_email_sync &&
      r.step3_new_email_login &&
      r.step4_old_email_rejected &&
      r.step5_pwd_change &&
      r.step6_old_pwd_rejected &&
      r.step7_new_pwd_login &&
      r.step8_login_id_auth &&
      r.step9_portal_session &&
      r.step10_no_secrets_exposed &&
      r.cleanup
  );

  if (!allPassed) {
    throw new Error("FAIL: One or more role authentication tests failed!");
  }

  console.log("\n==================================================================================");
  console.log("✅ ALL 5 ROLES PASSED ALL 10 AUTHENTICATION & SECURITY REQUIREMENTS");
  console.log("==================================================================================");
}

testAllRolesAuthE2E().catch((err) => {
  console.error("Test Error:", err);
  process.exit(1);
});
