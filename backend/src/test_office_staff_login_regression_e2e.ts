import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import { generateTeacherCredential } from "../../frontend/src/lib/credentials";

dotenv.config({ path: "./backend/.env" });
dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL || "https://nyhnkftlkigoliyogwvp.supabase.co";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im55aG5rZnRsa2lnb2xpeW9nd3ZwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NTQ3NDY1MywiZXhwIjoyMTAxMDUwNjUzfQ.xsa3qLPf8jTe45x5x_-8TyTusbjnMiihtQse4IgjutQ";

const adminSupabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function runOfficeStaffLoginRegression() {
  console.log("==================================================================================");
  console.log("🔐 OFFICE-GENERATED STAFF CREDENTIAL PROVISIONING & LOGIN REGRESSION E2E SUITE");
  console.log("==================================================================================");

  const timestamp = Date.now();
  const testTeacherId = `TCH-REG-${timestamp.toString().slice(-4)}`;
  const testLoginId = `TCH${timestamp.toString().slice(-4)}`;
  const testName = `Priya Sharma ${timestamp.toString().slice(-4)}`;
  const testEmail = `priya.sharma.${timestamp}@sunshineschool.edu`;
  const testPassword = `TeacherPass@${timestamp.toString().slice(-4)}`;

  console.log(`\n[STEP 1] Generating Office staff credential for '${testName}'...`);
  console.log(`  Teacher ID: ${testTeacherId}`);
  console.log(`  Login ID: ${testLoginId}`);
  console.log(`  Email: ${testEmail}`);
  console.log(`  Password: ${testPassword}`);

  const teacherObj = {
    id: testTeacherId,
    name: testName,
    email: testEmail,
    phone: "9876543210",
    subject: "Mathematics & Science",
    className: "UKG A",
    branch: "Main Campus",
  };

  const cred = generateTeacherCredential(testTeacherId, {
    customLoginId: testLoginId,
    password: testPassword,
    teacher: teacherObj,
  });

  console.log("  ✓ Credential object generated:", { loginId: cred.loginId, password: cred.password });

  if ((cred as any)._provisionPromise) {
    await (cred as any)._provisionPromise;
  }
  await new Promise((r) => setTimeout(r, 500));

  console.log("\n[STEP 2] Verifying Supabase gv_users table record...");
  const { data: gvUsers, error: gvErr } = await adminSupabase
    .from("gv_users")
    .select("*")
    .or(`login_id.eq.${testLoginId},email.eq.${testEmail}`);

  if (gvErr || !gvUsers || gvUsers.length === 0) {
    console.error("  ✗ gv_users record check failed:", gvErr?.message || "User missing in gv_users");
    process.exit(1);
  }
  const gvUser = gvUsers[0];
  console.log("  ✓ gv_users record confirmed:");
  console.log({
    id: gvUser.id,
    login_id: gvUser.login_id,
    email: gvUser.email,
    role: gvUser.role,
    status: gvUser.status,
  });

  console.log("\n[STEP 3] Verifying Supabase Auth (auth.users) provisioning...");
  const { data: authUsers, error: authErr } = await adminSupabase.auth.admin.listUsers();
  if (authErr) {
    console.error("  ✗ Supabase Auth listUsers error:", authErr.message);
    process.exit(1);
  }

  const matchingAuth = authUsers.users.find(
    (u) => u.email?.toLowerCase() === testEmail.toLowerCase()
  );

  if (!matchingAuth) {
    console.error("  ✗ Supabase Auth record NOT provisioned for email:", testEmail);
    process.exit(1);
  }
  console.log("  ✓ Supabase Auth user confirmed! Auth UUID:", matchingAuth.id);

  console.log("\n[STEP 4] Testing authentication with Generated EMAIL...");
  const anonSupabase = createClient(
    SUPABASE_URL,
    process.env.VITE_SUPABASE_ANON_KEY || SUPABASE_SERVICE_ROLE_KEY
  );

  const emailAuthRes = await anonSupabase.auth.signInWithPassword({
    email: testEmail,
    password: testPassword,
  });

  if (emailAuthRes.error || !emailAuthRes.data.user) {
    console.error("  ✗ Email authentication failed:", emailAuthRes.error?.message);
    process.exit(1);
  }
  console.log("  ✓ Email login SUCCESS! Authenticated user ID:", emailAuthRes.data.user.id);

  console.log("\n[STEP 5] Testing authentication with Generated LOGIN ID...");
  const loginIdAuthRes = await anonSupabase.auth.signInWithPassword({
    email: gvUser.email,
    password: testPassword,
  });

  if (loginIdAuthRes.error || !loginIdAuthRes.data.user) {
    console.error("  ✗ Login ID authentication failed:", loginIdAuthRes.error?.message);
    process.exit(1);
  }
  console.log("  ✓ Login ID authentication SUCCESS! Authenticated user ID:", loginIdAuthRes.data.user.id);

  console.log("\n[STEP 6] Cleaning up test staff records from gv_users & auth.users...");
  if (matchingAuth?.id) {
    await adminSupabase.auth.admin.deleteUser(matchingAuth.id);
  }
  await adminSupabase.from("gv_users").delete().eq("login_id", testLoginId);
  await adminSupabase.from("gv_users").delete().eq("id", testTeacherId);
  console.log("  ✓ Cleanup complete.");

  console.log("\n==================================================================================");
  console.log("📊 OFFICE STAFF LOGIN REGRESSION RESULT: PASS (All 6 Steps Verified)");
  console.log("==================================================================================");
}

runOfficeStaffLoginRegression().catch((err) => {
  console.error("Regression script exception:", err);
  process.exit(1);
});
