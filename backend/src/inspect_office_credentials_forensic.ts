import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config({ path: "./backend/.env" });
dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL || "https://nyhnkftlkigoliyogwvp.supabase.co";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im55aG5rZnRsa2lnb2xpeW9nd3ZwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NTQ3NDY1MywiZXhwIjoyMTAxMDUwNjUzfQ.xsa3qLPf8jTe45x5x_-8TyTusbjnMiihtQse4IgjutQ";

const adminSupabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function testOfficeTeacherCredentialProvisioning() {
  console.log("==========================================================");
  console.log("🔍 FORENSIC BUG 2 INSPECTION: OFFICE STAFF CREDENTIAL LOGIN");
  console.log("==========================================================");

  const timestamp = Date.now();
  const testTeacherId = `TCH-AUTH-${timestamp.toString().slice(-4)}`;
  const testLoginId = `TCH${timestamp.toString().slice(-4)}`;
  const testTeacherName = `Test Teacher ${timestamp.toString().slice(-4)}`;
  const testEmail = `teacher.test.${timestamp}@sunshineschool.edu`;
  const testPassword = `TestPass@${timestamp.toString().slice(-4)}`;

  console.log(`[STEP 1] Simulating Office credential creation for ID: ${testTeacherId}...`);
  console.log(`  Login ID: ${testLoginId}`);
  console.log(`  Name: ${testTeacherName}`);
  console.log(`  Email: ${testEmail}`);
  console.log(`  Password: ${testPassword}`);

  // Test Supabase Auth signUp as performed in createTeacherAuthAccount
  console.log("\n[STEP 2] Calling Supabase Auth signUp...");
  const { data: authData, error: authErr } = await adminSupabase.auth.signUp({
    email: testEmail,
    password: testPassword,
    options: {
      data: {
        full_name: testTeacherName,
        role: "teacher",
        login_id: testLoginId,
      },
    },
  });

  if (authErr) {
    console.error("  ✗ Supabase Auth signUp error:", authErr.message);
  } else {
    console.log("  ✓ Supabase Auth user created ID:", authData.user?.id);
  }

  // Insert gv_users record as Office does
  const profilePayload = {
    id: authData.user?.id || testTeacherId,
    auth_user_id: authData.user?.id || null,
    login_id: testLoginId,
    role: "teacher",
    full_name: testTeacherName,
    email: testEmail,
    mobile: "9876543210",
    status: "active",
    must_change_password: false,
  };

  const { data: gvUser, error: gvErr } = await adminSupabase
    .from("gv_users")
    .upsert([profilePayload], { onConflict: "login_id" })
    .select();

  if (gvErr) {
    console.error("  ✗ gv_users upsert error:", gvErr.message);
  } else {
    console.log("  ✓ gv_users record inserted:", gvUser?.[0]);
  }

  // Now test client login simulation
  const anonSupabase = createClient(SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im55aG5rZnRsa2lnb2xpeW9nd3ZwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU0NzQ2NTMsImV4cCI6MjEwMTA1MDY1M30.b3m1Qx1m-qUe0a6d5952m5t91118151216");

  // Attempt A: Login with Email
  console.log("\n[TEST A] Attempting signInWithPassword using Email:", testEmail);
  const emailRes = await anonSupabase.auth.signInWithPassword({
    email: testEmail,
    password: testPassword,
  });

  if (emailRes.error) {
    console.error("  ✗ Email login failed:", emailRes.error.message);
  } else {
    console.log("  ✓ Email login SUCCESS! Auth User ID:", emailRes.data.user.id);
  }

  // Attempt B: Login with Login ID
  console.log("\n[TEST B] Attempting login using Login ID:", testLoginId);

  // Look up user profile by login_id as login() function does
  const { data: lookupUser, error: lookupErr } = await anonSupabase
    .from("gv_users")
    .select("email, login_id, role")
    .or(`login_id.ilike.${testLoginId},email.ilike.${testLoginId}`)
    .maybeSingle();

  if (lookupErr || !lookupUser) {
    console.error("  ✗ Lookup by login_id failed:", lookupErr?.message || "User profile not found");
  } else {
    console.log("  ✓ Profile resolved by login_id:", lookupUser);
    const resolvedEmail = lookupUser.email;
    const loginIdRes = await anonSupabase.auth.signInWithPassword({
      email: resolvedEmail,
      password: testPassword,
    });

    if (loginIdRes.error) {
      console.error("  ✗ Login ID login failed:", loginIdRes.error.message);
    } else {
      console.log("  ✓ Login ID login SUCCESS! Auth User ID:", loginIdRes.data.user.id);
    }
  }

  // Cleanup test user
  if (authData.user?.id) {
    await adminSupabase.auth.admin.deleteUser(authData.user.id);
  }
  await adminSupabase.from("gv_users").delete().eq("login_id", testLoginId);
}

testOfficeTeacherCredentialProvisioning().catch(console.error);
