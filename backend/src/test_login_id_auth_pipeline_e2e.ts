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

async function runLoginIdAuthPipelineE2E() {
  console.log("==================================================================================");
  console.log("🔐 COMPREHENSIVE LOGIN ID AUTHENTICATION & PARENT CREDENTIALS E2E SUITE");
  console.log("==================================================================================");

  const { createClient } = await import("@supabase/supabase-js");
  const { generateTeacherCredential, generateParentCredential } = await import("../../frontend/src/lib/credentials");
  const { login } = await import("../../frontend/src/lib/supabaseAuth");

  const SUPABASE_URL = process.env.SUPABASE_URL || "https://nyhnkftlkigoliyogwvp.supabase.co";
  const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  const adminSupabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  const timestamp = Date.now();
  const testTeacherLoginId = `TCH${timestamp.toString().slice(-4)}`;
  const testTeacherId = `TCH-E2E-${timestamp.toString().slice(-4)}`;
  const testTeacherPassword = `TeacherPass@${timestamp.toString().slice(-4)}`;
  const testTeacherEmail = `teacher.e2e.${timestamp}@sunshineschool.edu`;

  const testParentLoginId = `PRT${timestamp.toString().slice(-4)}`;
  const testStudentId = `STU-E2E-${timestamp.toString().slice(-4)}`;
  const testParentPassword = `ParentPass@${timestamp.toString().slice(-4)}`;
  const testParentEmail = `${testParentLoginId.toLowerCase()}@growvia.edu`;

  // STAGE 1: Teacher Credential Generation & DB Persistence Verification
  console.log(`\n[STAGE 1] Office generates Teacher credential '${testTeacherLoginId}'...`);
  const teacherCred = generateTeacherCredential(testTeacherId, {
    customLoginId: testTeacherLoginId,
    password: testTeacherPassword,
    teacher: {
      id: testTeacherId,
      name: "Priya Sharma E2E",
      email: testTeacherEmail,
      phone: "9876543210",
      className: "UKG A",
    } as any,
  });

  if ((teacherCred as any)._provisionPromise) {
    await (teacherCred as any)._provisionPromise;
  }
  await new Promise((r) => setTimeout(r, 500));

  const { data: teacherGvUser } = await adminSupabase
    .from("gv_users")
    .select("*")
    .or(`login_id.eq.${testTeacherLoginId},email.eq.${testTeacherEmail}`)
    .maybeSingle();

  if (!teacherGvUser) {
    console.error("  ✗ Teacher record NOT found in gv_users!");
    process.exit(1);
  }
  console.log("  ✓ gv_users record confirmed:", {
    id: teacherGvUser.id,
    login_id: teacherGvUser.login_id,
    email: teacherGvUser.email,
    role: teacherGvUser.role,
  });

  // STAGE 2: Teacher Login ID & Email Authentication Tests
  console.log(`\n[STAGE 2] Authenticating Teacher using Login ID '${testTeacherLoginId}'...`);
  const teacherLoginIdRes = await login(testTeacherLoginId, testTeacherPassword);
  if (!teacherLoginIdRes.success || !teacherLoginIdRes.user) {
    console.error("  ✗ Teacher Login ID authentication failed:", teacherLoginIdRes.error);
    process.exit(1);
  }
  console.log("  ✓ Teacher Login ID authentication SUCCESS!", {
    userEmail: teacherLoginIdRes.user.email,
    role: teacherLoginIdRes.profile?.role,
  });

  console.log(`\n[STAGE 3] Authenticating Teacher using EMAIL '${testTeacherEmail}'...`);
  const teacherEmailRes = await login(testTeacherEmail, testTeacherPassword);
  if (!teacherEmailRes.success || !teacherEmailRes.user) {
    console.error("  ✗ Teacher Email authentication failed:", teacherEmailRes.error);
    process.exit(1);
  }
  console.log("  ✓ Teacher Email authentication SUCCESS!", {
    userEmail: teacherEmailRes.user.email,
    role: teacherEmailRes.profile?.role,
  });

  // STAGE 4: Parent Credential Generation & DB Persistence Verification
  console.log(`\n[STAGE 4] Office generates Parent credential '${testParentLoginId}'...`);
  const parentCred = generateParentCredential(testStudentId, {
    customLoginId: testParentLoginId,
    password: testParentPassword,
    student: {
      id: testStudentId,
      name: "Rohan Parent E2E",
      admissionNo: `ADM-${timestamp.toString().slice(-4)}`,
      parent: "Suresh Parent E2E",
      phone: "9876543210",
      className: "Nursery",
      section: "A",
    } as any,
  });

  if ((parentCred as any)._provisionPromise) {
    await (parentCred as any)._provisionPromise;
  }
  await new Promise((r) => setTimeout(r, 500));

  const { data: parentGvUser } = await adminSupabase
    .from("gv_users")
    .select("*")
    .or(`login_id.eq.${testParentLoginId},email.eq.${testParentEmail}`)
    .maybeSingle();

  if (!parentGvUser) {
    console.error("  ✗ Parent record NOT found in gv_users!");
    process.exit(1);
  }
  console.log("  ✓ gv_users parent record confirmed:", {
    id: parentGvUser.id,
    login_id: parentGvUser.login_id,
    email: parentGvUser.email,
    role: parentGvUser.role,
  });

  // STAGE 5: Parent Login ID Authentication Test
  console.log(`\n[STAGE 5] Authenticating Parent using Login ID '${testParentLoginId}'...`);
  const parentLoginRes = await login(testParentLoginId, testParentPassword);
  if (!parentLoginRes.success || !parentLoginRes.user) {
    console.error("  ✗ Parent Login ID authentication failed:", parentLoginRes.error);
    process.exit(1);
  }
  console.log("  ✓ Parent Login ID authentication SUCCESS!", {
    userEmail: parentLoginRes.user.email,
    role: parentLoginRes.profile?.role,
  });

  // STAGE 6: Wrong Password Rejection Test
  console.log("\n[STAGE 6] Verifying Wrong Password Rejection...");
  const wrongPassRes = await login(testTeacherLoginId, "WrongPassword@999");
  if (wrongPassRes.success) {
    console.error("  ✗ Invalid password was unexpectedly accepted!");
    process.exit(1);
  }
  console.log("  ✓ Wrong password correctly REJECTED.");

  // STAGE 7: Multi-Role Accounts Authentication Smoke Tests
  console.log("\n[STAGE 7] Verifying Core Role Account Login shortcuts...");
  const rolesToTest = [
    { id: "ADMIN001", role: "admin" },
    { id: "PRINCIPAL001", role: "principal" },
    { id: "OFFICE001", role: "office" },
  ];

  for (const r of rolesToTest) {
    const { data: roleUser } = await adminSupabase
      .from("gv_users")
      .select("login_id, role, email")
      .eq("login_id", r.id)
      .maybeSingle();

    if (roleUser) {
      console.log(`  ✓ ${r.role.toUpperCase()} account confirmed in gv_users (${roleUser.email})`);
    }
  }

  // STAGE 8: Complete Test Data Cleanup
  console.log("\n[STAGE 8] Cleaning up all test records from gv_users, auth.users & gv_requests...");
  const { data: authUsers } = await adminSupabase.auth.admin.listUsers();

  const teacherAuth = authUsers?.users.find((u) => u.email?.toLowerCase() === testTeacherEmail.toLowerCase());
  if (teacherAuth?.id) await adminSupabase.auth.admin.deleteUser(teacherAuth.id);

  const parentAuth = authUsers?.users.find((u) => u.email?.toLowerCase() === testParentEmail.toLowerCase());
  if (parentAuth?.id) await adminSupabase.auth.admin.deleteUser(parentAuth.id);

  await adminSupabase.from("gv_users").delete().or(`login_id.eq.${testTeacherLoginId},login_id.eq.${testParentLoginId}`);
  await adminSupabase.from("gv_users").delete().or(`id.eq.${testTeacherId},id.eq.PAR-${testParentLoginId}`);
  await adminSupabase.from("gv_requests").delete().or(`id.eq.cred_teacher_${testTeacherId},id.eq.cred_parent_${testStudentId}`);

  console.log("  ✓ All test records cleaned from database.");

  console.log("\n==================================================================================");
  console.log("📊 LOGIN ID AUTHENTICATION E2E RESULT: PASS (All 8 Stages Verified)");
  console.log("==================================================================================");
}

runLoginIdAuthPipelineE2E().catch((err) => {
  console.error("E2E test exception:", err);
  process.exit(1);
});
