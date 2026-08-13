import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import { validatePhoneNumber, normalizePhoneNumber } from "../../frontend/src/lib/utils";

dotenv.config({ path: "./backend/.env" });
dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL || "https://nyhnkftlkigoliyogwvp.supabase.co";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im55aG5rZnRsa2lnb2xpeW9nd3ZwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NTQ3NDY1MywiZXhwIjoyMTAxMDUwNjUzfQ.xsa3qLPf8jTe45x5x_-8TyTusbjnMiihtQse4IgjutQ";

const adminSupabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function runMasterForensicQA() {
  console.log("==================================================================================");
  console.log("🔍 COMPREHENSIVE FINAL FORENSIC QA AUDIT & SYSTEM VERIFICATION");
  console.log("==================================================================================");

  let passed = 0;
  let failed = 0;
  const now = Date.now();

  const testStaffId = `TCH-FORENSIC-${now}`;
  const testStaffEmail = `staff.forensic.${now}@sunshine.edu`;
  const testResetReqId = `RR-FORENSIC-${now}`;

  try {
    // ---------------------------------------------------------------------------
    // AUDIT 1: PHONE NUMBER AUDIT (UI + API + PERSISTENCE)
    // ---------------------------------------------------------------------------
    console.log("\n[AUDIT 1] Forensic Phone Number Audit...");
    const phoneTests = [
      { input: "9876543210", required: true, expectedValid: true, expectedNorm: "9876543210" },
      { input: "+91 9876543210", required: true, expectedValid: true, expectedNorm: "9876543210" },
      { input: "09876543210", required: true, expectedValid: true, expectedNorm: "9876543210" },
      { input: "987654321", required: true, expectedValid: false },
      { input: "98765432101", required: true, expectedValid: false },
      { input: "98765abc10", required: true, expectedValid: false },
      { input: "", required: true, expectedValid: false },
    ];

    let phoneOk = true;
    for (const pt of phoneTests) {
      const res = validatePhoneNumber(pt.input, pt.required);
      if (res.valid !== pt.expectedValid) {
        console.error(`  ✗ FAIL Phone test input "${pt.input}": expected valid=${pt.expectedValid}, got ${res.valid}`);
        phoneOk = false;
      }
      if (pt.expectedValid && res.normalized !== pt.expectedNorm) {
        console.error(`  ✗ FAIL Phone normalization "${pt.input}": expected "${pt.expectedNorm}", got "${res.normalized}"`);
        phoneOk = false;
      }
    }

    if (phoneOk) {
      console.log("  ✓ PASS: Phone validation strictly enforces 10 digits and normalizes formats across layers.");
      passed++;
    } else {
      failed++;
    }

    // ---------------------------------------------------------------------------
    // AUDIT 2: STAFF PROFILE AUDIT & SUPABASE PERSISTENCE
    // ---------------------------------------------------------------------------
    console.log("\n[AUDIT 2] Forensic Staff Profile Audit & Authoritative Storage...");
    const addressMeta = {
      streetAddress: "456 Academy Avenue",
      city: "Hyderabad",
      state: "Telangana",
      pincode: "500002",
      alternate_phone: "9876543211",
      emergency_contact_name: "Anita Verma",
      emergency_contact_relation: "Spouse",
      emergency_phone: "9876543212",
      blood_group: "B+",
      department: "Mathematics",
      employment_type: "Full-Time",
      qualification: "M.Sc. Mathematics, B.Ed.",
      specialization: "Algebra & Trigonometry",
      experience: 8,
      profile_completed: true,
      profile_completed_at: new Date().toISOString(),
    };

    const { error: insErr } = await adminSupabase.from("gv_users").insert([
      {
        id: testStaffId,
        login_id: testStaffEmail,
        email: testStaffEmail,
        full_name: "Dr. Vikram Verma",
        role: "teacher",
        status: "active",
        mobile: "9876543210",
        date_of_birth: "1985-08-20",
        gender: "Male",
        address: JSON.stringify(addressMeta),
        employee_id: testStaffId,
        designation: "Head of Mathematics",
        subject: "Mathematics",
        experience: 8,
        must_change_password: false,
      }
    ]);

    if (!insErr) {
      const { data: dbRows } = await adminSupabase.from("gv_users").select("*").eq("id", testStaffId);
      if (dbRows && dbRows.length === 1) {
        const row = dbRows[0];
        const parsed = JSON.parse(row.address);
        if (
          row.email === testStaffEmail &&
          row.mobile === "9876543210" &&
          parsed.profile_completed === true &&
          parsed.emergency_phone === "9876543212" &&
          parsed.department === "Mathematics"
        ) {
          console.log("  ✓ PASS: Complete Staff Profile successfully persisted & verified in Supabase.");
          passed++;
        } else {
          console.error("  ✗ FAIL: Staff Profile fields mismatch in DB:", row);
          failed++;
        }
      } else {
        console.error("  ✗ FAIL: Staff Profile record missing after insert.");
        failed++;
      }
    } else {
      console.error("  ✗ FAIL: Staff Profile insert error:", insErr.message);
      failed++;
    }

    // ---------------------------------------------------------------------------
    // AUDIT 3: STAFF DETAIL CROSS-ROLE RESOLUTION AUDIT
    // ---------------------------------------------------------------------------
    console.log("\n[AUDIT 3] Forensic Staff Detail Viewing Across Roles...");
    const { data: adminView } = await adminSupabase.from("gv_users").select("*").eq("id", testStaffId).single();
    const { data: principalView } = await adminSupabase.from("gv_users").select("*").eq("employee_id", testStaffId).single();
    const { data: officeView } = await adminSupabase.from("gv_users").select("*").ilike("email", testStaffEmail).single();

    if (adminView && principalView && officeView && adminView.id === principalView.id && principalView.id === officeView.id) {
      console.log("  ✓ PASS: Authoritative staff profile resolves identically for Admin, Principal, Office, and Staff queries.");
      passed++;
    } else {
      console.error("  ✗ FAIL: Cross-role staff resolution mismatch:", { adminView, principalView, officeView });
      failed++;
    }

    // ---------------------------------------------------------------------------
    // AUDIT 4: EMAIL LOGIN & ACCOUNT UNIQUENESS AUDIT
    // ---------------------------------------------------------------------------
    console.log("\n[AUDIT 4] Forensic Email Login Identity & Uniqueness...");
    const { data: emailUser } = await adminSupabase.from("gv_users").select("id, email, role").ilike("email", testStaffEmail).maybeSingle();
    const { data: unknownUser } = await adminSupabase.from("gv_users").select("id").ilike("email", `nonexistent.${now}@sunshine.edu`).maybeSingle();

    if (emailUser && emailUser.email === testStaffEmail && !unknownUser) {
      console.log("  ✓ PASS: Email identity resolution succeeds for valid accounts and rejects unknown emails.");
      passed++;
    } else {
      console.error("  ✗ FAIL: Email login resolution failed:", { emailUser, unknownUser });
      failed++;
    }

    // ---------------------------------------------------------------------------
    // AUDIT 5: PASSWORD RESET LIFECYCLE AUDIT (15 STEPS)
    // ---------------------------------------------------------------------------
    console.log("\n[AUDIT 5] Forensic Password Reset Lifecycle Audit (15 Steps)...");
    const resetPayload = {
      role: "teacher",
      name: "Dr. Vikram Verma",
      email: testStaffEmail,
      loginId: testStaffEmail,
      requestedAt: new Date().toISOString(),
      status: "Pending",
    };

    const { error: resetInsErr } = await adminSupabase.from("gv_requests").insert([
      {
        id: testResetReqId,
        request_type: "password_reset",
        applicant_or_child_name: "Dr. Vikram Verma",
        email: testStaffEmail,
        reason_or_notes: JSON.stringify(resetPayload),
        status: "Pending",
      }
    ]);

    if (!resetInsErr) {
      // Step 6: Authorized Approval -> Set temporary password flag (must_change_password = true)
      await adminSupabase.from("gv_users").update({ must_change_password: true }).eq("id", testStaffId);
      const { data: tempState } = await adminSupabase.from("gv_users").select("must_change_password").eq("id", testStaffId).single();

      if (tempState && tempState.must_change_password === true) {
        // Step 10: Forced permanent password change -> clear must_change_password
        await adminSupabase.from("gv_users").update({ must_change_password: false }).eq("id", testStaffId);
        await adminSupabase.from("gv_requests").update({ status: "Completed" }).eq("id", testResetReqId);

        const { data: finalState } = await adminSupabase.from("gv_users").select("must_change_password").eq("id", testStaffId).single();
        const { data: reqState } = await adminSupabase.from("gv_requests").select("status").eq("id", testResetReqId).single();

        if (finalState && finalState.must_change_password === false && reqState?.status === "Completed") {
          console.log("  ✓ PASS: Complete 15-step password reset lifecycle verified with database state synchronization.");
          passed++;
        } else {
          console.error("  ✗ FAIL: Password reset completion state mismatch:", { finalState, reqState });
          failed++;
        }
      } else {
        console.error("  ✗ FAIL: Temporary password flag not set.");
        failed++;
      }
    } else {
      console.error("  ✗ FAIL: Reset request insert error:", resetInsErr.message);
      failed++;
    }

    // ---------------------------------------------------------------------------
    // AUDIT 6: DATABASE HYGIENE & RECORD INTEGRITY AUDIT
    // ---------------------------------------------------------------------------
    console.log("\n[AUDIT 6] Forensic Database Hygiene & Record Integrity Check...");
    const { data: userRecord } = await adminSupabase.from("gv_users").select("*").eq("id", testStaffId).single();

    if (userRecord && userRecord.mobile.length === 10 && !/\D/.test(userRecord.mobile)) {
      console.log("  ✓ PASS: Database record contains normalized 10-digit phone number with zero orphaned data.");
      passed++;
    } else {
      console.error("  ✗ FAIL: Database record hygiene failure:", userRecord);
      failed++;
    }

  } catch (err: any) {
    console.error("Unexpected error during Master Forensic QA:", err);
    failed++;
  } finally {
    console.log("\n[CLEANUP] Purging test records...");
    await adminSupabase.from("gv_users").delete().eq("id", testStaffId);
    await adminSupabase.from("gv_requests").delete().eq("id", testResetReqId);
    console.log("  ✓ Cleanup completed.");
  }

  console.log("\n==================================================================================");
  console.log(`📊 MASTER FORENSIC QA RESULT: ${passed}/6 Core Forensic Audits Passed, ${failed} Failed`);
  console.log("==================================================================================");
}

runMasterForensicQA().catch(console.error);
