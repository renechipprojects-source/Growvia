import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config({ path: "./backend/.env" });
dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL || "https://nyhnkftlkigoliyogwvp.supabase.co";
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im55aG5rZnRsa2lnb2xpeW9nd3ZwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU0NzQ2NTMsImV4cCI6MjEwMTA1MDY1M30.KxjH42Wg0IVLfXLLJSbBLvcZ098hvJRUHkDu10NJfB4";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im55aG5rZnRsa2lnb2xpeW9nd3ZwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NTQ3NDY1MywiZXhwIjoyMTAxMDUwNjUzfQ.xsa3qLPf8jTe45x5x_-8TyTusbjnMiihtQse4IgjutQ";

const adminSupabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
const clientSupabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

interface RoleTestCase {
  roleName: string;
  role: string;
  loginId: string;
  email: string;
  initialPassword: string;
  newPassword: string;
}

async function runPasswordAuditE2E() {
  console.log("==================================================================================");
  console.log("🔐 MULTI-ROLE PASSWORD CHANGE, LOGIN & CONSISTENCY FORENSIC AUDIT");
  console.log("==================================================================================");

  let passed = 0;
  let failed = 0;

  const now = Date.now();

  const testCases: RoleTestCase[] = [
    {
      roleName: "Parent",
      role: "parent",
      loginId: `PRT-AUDIT-${now}`,
      email: `parent_audit_${now}@sunshineschool.edu`,
      initialPassword: "Initial@Parent123",
      newPassword: "NewSecure@Parent2026!",
    },
    {
      roleName: "Teacher/Staff",
      role: "teacher",
      loginId: `TCH-AUDIT-${now}`,
      email: `teacher_audit_${now}@sunshineschool.edu`,
      initialPassword: "Initial@Teacher123",
      newPassword: "NewSecure@Teacher2026!",
    },
    {
      roleName: "Office",
      role: "office",
      loginId: `OFF-AUDIT-${now}`,
      email: `office_audit_${now}@sunshineschool.edu`,
      initialPassword: "Initial@Office123",
      newPassword: "NewSecure@Office2026!",
    },
    {
      roleName: "Principal",
      role: "principal",
      loginId: `PRIN-AUDIT-${now}`,
      email: `principal_audit_${now}@sunshineschool.edu`,
      initialPassword: "Initial@Principal123",
      newPassword: "NewSecure@Principal2026!",
    },
    {
      roleName: "Admin",
      role: "super-admin",
      loginId: `ADM-AUDIT-${now}`,
      email: `admin_audit_${now}@sunshineschool.edu`,
      initialPassword: "Initial@Admin123",
      newPassword: "NewSecure@Admin2026!",
    },
  ];

  const createdAuthUserIds: string[] = [];
  const createdGvUserIds: string[] = [];

  for (const tc of testCases) {
    console.log(`\n----------------------------------------------------------------------------------`);
    console.log(`▶ AUDITING ROLE: [${tc.roleName.toUpperCase()}] (${tc.loginId})`);
    console.log(`----------------------------------------------------------------------------------`);

    try {
      // 1. Provision User in Supabase Auth & gv_users
      const { data: authData, error: authCreateErr } = await adminSupabase.auth.admin.createUser({
        email: tc.email,
        password: tc.initialPassword,
        email_confirm: true,
        user_metadata: {
          login_id: tc.loginId,
          role: tc.role,
          full_name: `${tc.roleName} Test User`,
        },
      });

      if (authCreateErr || !authData.user) {
        console.error(`  ✗ FAIL [${tc.roleName}]: Could not create auth user:`, authCreateErr?.message);
        failed++;
        continue;
      }

      const authUserId = authData.user.id;
      createdAuthUserIds.push(authUserId);

      const gvUserId = `USR-${tc.loginId}`;
      createdGvUserIds.push(gvUserId);

      const { error: gvInsertErr } = await adminSupabase.from("gv_users").insert([
        {
          id: gvUserId,
          auth_user_id: authUserId,
          login_id: tc.loginId,
          email: tc.email,
          full_name: `${tc.roleName} Test User`,
          role: tc.role,
          status: "active",
          must_change_password: true,
        },
      ]);

      if (gvInsertErr) {
        console.error(`  ✗ FAIL [${tc.roleName}]: Could not create gv_users record:`, gvInsertErr.message);
        failed++;
        continue;
      }

      console.log(`  ✓ 1. User created in Supabase Auth & gv_users (ID: ${authUserId})`);

      // 2. Test Initial Login with Initial Password
      const { data: initialLogin, error: initialLoginErr } = await clientSupabase.auth.signInWithPassword({
        email: tc.email,
        password: tc.initialPassword,
      });

      if (initialLoginErr || !initialLogin.user || !initialLogin.session) {
        console.error(`  ✗ FAIL [${tc.roleName}]: Initial login failed with initial password:`, initialLoginErr?.message);
        failed++;
        continue;
      }

      console.log(`  ✓ 2. Initial login successful with initial password.`);

      // 3. Perform Password Change while authenticated
      // (Using the authenticated user client context matching changePasswordForCurrentUser)
      const userAuthClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        auth: {
          persistSession: false,
        },
      });
      await userAuthClient.auth.setSession({
        access_token: initialLogin.session.access_token,
        refresh_token: initialLogin.session.refresh_token,
      });

      const { error: changeErr } = await userAuthClient.auth.updateUser({
        password: tc.newPassword,
      });

      if (changeErr) {
        console.error(`  ✗ FAIL [${tc.roleName}]: Password update failed:`, changeErr.message);
        failed++;
        continue;
      }

      // Update must_change_password in gv_users
      await adminSupabase.from("gv_users").update({ must_change_password: false }).eq("login_id", tc.loginId);

      console.log(`  ✓ 3. Password changed to new password; must_change_password updated in gv_users.`);

      // 4. Test that OLD PASSWORD now fails immediately
      const { data: oldAttempt, error: oldAttemptErr } = await clientSupabase.auth.signInWithPassword({
        email: tc.email,
        password: tc.initialPassword,
      });

      if (!oldAttempt.user && oldAttemptErr) {
        console.log(`  ✓ 4. Old password immediately REJECTED by authentication layer.`);
      } else {
        console.error(`  ✗ FAIL [${tc.roleName}]: Old password was unexpectedly accepted after change!`);
        failed++;
        continue;
      }

      // 5. Test that NEW PASSWORD succeeds immediately
      const { data: newAttempt, error: newAttemptErr } = await clientSupabase.auth.signInWithPassword({
        email: tc.email,
        password: tc.newPassword,
      });

      if (newAttempt.user && newAttempt.session && !newAttemptErr) {
        console.log(`  ✓ 5. New password immediately ACCEPTED without refresh or delay.`);
      } else {
        console.error(`  ✗ FAIL [${tc.roleName}]: New password login failed:`, newAttemptErr?.message);
        failed++;
        continue;
      }

      // 6. Sign out and test fresh session on simulated new device
      await clientSupabase.auth.signOut();

      const freshClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        auth: { persistSession: false },
      });

      const { data: freshLogin, error: freshErr } = await freshClient.auth.signInWithPassword({
        email: tc.email,
        password: tc.newPassword,
      });

      if (freshLogin.user && !freshErr) {
        console.log(`  ✓ 6. Fresh device / session login with new password verified.`);
      } else {
        console.error(`  ✗ FAIL [${tc.roleName}]: Fresh login failed:`, freshErr?.message);
        failed++;
        continue;
      }

      // 7. Verify Supabase Auth vs gv_users Consistency
      const { data: profileCheck } = await adminSupabase
        .from("gv_users")
        .select("*")
        .eq("login_id", tc.loginId)
        .single();

      if (profileCheck && profileCheck.auth_user_id === authUserId && profileCheck.must_change_password === false) {
        console.log(`  ✓ 7. Consistency verified between auth.users and gv_users.`);
        passed++;
      } else {
        console.error(`  ✗ FAIL [${tc.roleName}]: Consistency mismatch:`, profileCheck);
        failed++;
      }

    } catch (err: any) {
      console.error(`  ✗ EXCEPTION [${tc.roleName}]:`, err);
      failed++;
    }
  }

  // ---------------------------------------------------------------------------
  // CLEANUP
  // ---------------------------------------------------------------------------
  console.log("\n==================================================================================");
  console.log("[CLEANUP] Purging test users from gv_users and Supabase Auth...");
  if (createdGvUserIds.length > 0) {
    await adminSupabase.from("gv_users").delete().in("id", createdGvUserIds);
  }
  for (const uid of createdAuthUserIds) {
    await adminSupabase.auth.admin.deleteUser(uid);
  }
  console.log(`  ✓ Cleaned up ${createdGvUserIds.length} gv_users and ${createdAuthUserIds.length} auth.users records.`);

  console.log("\n==================================================================================");
  console.log(`📊 PASSWORD AUDIT RESULT: ${passed}/5 Roles Passed, ${failed} Failed`);
  console.log("==================================================================================");
}

runPasswordAuditE2E().catch(console.error);
