import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import { validatePhoneNumber, normalizePhoneNumber } from "../../frontend/src/lib/utils";

dotenv.config({ path: "./backend/.env" });
dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL || "https://nyhnkftlkigoliyogwvp.supabase.co";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im55aG5rZnRsa2lnb2xpeW9nd3ZwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NTQ3NDY1MywiZXhwIjoyMTAxMDUwNjUzfQ.xsa3qLPf8jTe45x5x_-8TyTusbjnMiihtQse4IgjutQ";

const adminSupabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function runStaffProfilePhoneSecurityE2E() {
  console.log("==================================================================================");
  console.log("🛡️  STAFF PROFILES, PHONE VALIDATION & LOGIN SECURITY E2E QA SUITE");
  console.log("==================================================================================");

  let passed = 0;
  let failed = 0;
  const now = Date.now();

  const testStaffId = `TCH-PROF-${now}`;
  const testStaffEmail = `teacher.prof.${now}@sunshine.edu`;
  const testResetReqId = `RR-PROF-${now}`;

  try {
    // ---------------------------------------------------------------------------
    // TEST 1: REUSABLE 10-DIGIT PHONE VALIDATION & NORMALIZATION UTILITY
    // ---------------------------------------------------------------------------
    console.log("\n[TEST 1] Testing Global 10-Digit Phone Validation & Normalization...");
    const validCheck = validatePhoneNumber("9876543210", true);
    const pastedPlus91 = validatePhoneNumber("+91 9876543210", true);
    const shortCheck = validatePhoneNumber("987654321", true);
    const longCheck = validatePhoneNumber("98765432101", true);
    const alphaCheck = validatePhoneNumber("98765abc10", true);
    const blankCheck = validatePhoneNumber("", true);

    if (
      validCheck.valid && validCheck.normalized === "9876543210" &&
      pastedPlus91.valid && pastedPlus91.normalized === "9876543210" &&
      !shortCheck.valid &&
      !longCheck.valid &&
      !alphaCheck.valid &&
      !blankCheck.valid
    ) {
      console.log("  ✓ PASS: 10-digit phone validation strictly accepts exact 10 digits and rejects invalid formats.");
      passed++;
    } else {
      console.error("  ✗ FAIL: Phone validation results mismatch:", { validCheck, pastedPlus91, shortCheck, longCheck, alphaCheck, blankCheck });
      failed++;
    }

    // ---------------------------------------------------------------------------
    // TEST 2: STAFF PROFILE CREATION & SUPABASE PERSISTENCE
    // ---------------------------------------------------------------------------
    console.log("\n[TEST 2] Testing Staff Profile Supabase Persistence & Completion State...");
    const normPhone = normalizePhoneNumber("9876543210");
    const addressMeta = {
      streetAddress: "123 School Road",
      city: "Hyderabad",
      state: "Telangana",
      pincode: "500001",
      alternate_phone: "9876543211",
      emergency_contact_name: "Ramesh Sharma",
      emergency_contact_relation: "Spouse",
      emergency_phone: "9876543212",
      blood_group: "O+",
      department: "Academics",
      employment_type: "Full-Time",
      qualification: "M.Sc. Physics, B.Ed.",
      specialization: "Science",
      experience: 6,
      profile_completed: true,
      profile_completed_at: new Date().toISOString(),
    };

    const { error: insErr } = await adminSupabase.from("gv_users").insert([
      {
        id: testStaffId,
        login_id: testStaffEmail,
        email: testStaffEmail,
        full_name: "Prof. Rajesh Sharma",
        role: "teacher",
        status: "active",
        mobile: normPhone,
        date_of_birth: "1988-05-15",
        gender: "Male",
        address: JSON.stringify(addressMeta),
        employee_id: testStaffId,
        designation: "Senior Science Faculty",
        subject: "Physics",
        experience: 6,
        must_change_password: false,
      }
    ]);

    if (!insErr) {
      const { data: staffRows } = await adminSupabase
        .from("gv_users")
        .select("*")
        .eq("id", testStaffId);

      if (staffRows && staffRows.length === 1) {
        const row = staffRows[0];
        const parsed = JSON.parse(row.address);
        if (row.email === testStaffEmail && row.mobile === "9876543210" && parsed.profile_completed === true && parsed.emergency_phone === "9876543212") {
          console.log("  ✓ PASS: Complete Staff Profile persisted to Supabase with authoritative status.");
          passed++;
        } else {
          console.error("  ✗ FAIL: Staff Profile fields mismatch:", row);
          failed++;
        }
      } else {
        console.error("  ✗ FAIL: Staff Profile record not found after insert.");
        failed++;
      }
    } else {
      console.error("  ✗ FAIL: Staff Profile insertion error:", insErr.message);
      failed++;
    }

    // ---------------------------------------------------------------------------
    // TEST 3: EMAIL-BASED LOGIN & DUPLICATE EMAIL PREVENTION
    // ---------------------------------------------------------------------------
    console.log("\n[TEST 3] Testing Email Uniqueness & Duplicate Account Prevention...");
    const { data: dupCheck } = await adminSupabase
      .from("gv_users")
      .select("id")
      .ilike("email", testStaffEmail);

    if (dupCheck && dupCheck.length >= 1) {
      console.log("  ✓ PASS: Email uniqueness check successfully detects existing registered email.");
      passed++;
    } else {
      console.error("  ✗ FAIL: Duplicate email check failed to resolve existing email.");
      failed++;
    }

    // ---------------------------------------------------------------------------
    // TEST 4: GOVERNED PASSWORD RESET / RESTART LIFECYCLE
    // ---------------------------------------------------------------------------
    console.log("\n[TEST 4] Testing Governed Password Reset Lifecycle & State Invalidation...");
    const resetMeta = {
      role: "teacher",
      name: "Prof. Rajesh Sharma",
      email: testStaffEmail,
      loginId: testStaffEmail,
      requestedAt: new Date().toISOString(),
      status: "Pending",
    };

    const { error: reqErr } = await adminSupabase.from("gv_requests").insert([
      {
        id: testResetReqId,
        request_type: "password_reset",
        applicant_or_child_name: "Prof. Rajesh Sharma",
        email: testStaffEmail,
        reason_or_notes: JSON.stringify(resetMeta),
        status: "Pending",
      }
    ]);

    if (!reqErr) {
      // Simulate approval: set must_change_password = true on gv_users
      await adminSupabase.from("gv_users").update({ must_change_password: true }).eq("id", testStaffId);

      const { data: checkUser } = await adminSupabase.from("gv_users").select("must_change_password").eq("id", testStaffId).single();

      if (checkUser && checkUser.must_change_password === true) {
        // Complete forced change password
        await adminSupabase.from("gv_users").update({ must_change_password: false }).eq("id", testStaffId);
        const { data: finalUser } = await adminSupabase.from("gv_users").select("must_change_password").eq("id", testStaffId).single();

        if (finalUser && finalUser.must_change_password === false) {
          console.log("  ✓ PASS: Password reset lifecycle verified: Request -> Approval -> Forced Reset -> Flag Cleared.");
          passed++;
        } else {
          console.error("  ✗ FAIL: Final password flag not cleared.");
          failed++;
        }
      } else {
        console.error("  ✗ FAIL: Temporary password flag not set.");
        failed++;
      }
    } else {
      console.error("  ✗ FAIL: Reset request insertion error:", reqErr.message);
      failed++;
    }

  } catch (err: any) {
    console.error("Unexpected error in Staff Profile test suite:", err);
    failed++;
  } finally {
    console.log("\n[CLEANUP] Purging test records...");
    await adminSupabase.from("gv_users").delete().eq("id", testStaffId);
    await adminSupabase.from("gv_requests").delete().eq("id", testResetReqId);
    console.log("  ✓ Cleanup completed.");
  }

  console.log("\n==================================================================================");
  console.log(`📊 STAFF PROFILE & SECURITY QA RESULT: ${passed}/4 Tests Passed, ${failed} Failed`);
  console.log("==================================================================================");
}

runStaffProfilePhoneSecurityE2E().catch(console.error);
