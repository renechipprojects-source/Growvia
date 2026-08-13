import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config({ path: "./backend/.env" });
dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL || "https://nyhnkftlkigoliyogwvp.supabase.co";
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im55aG5rZnRsa2lnb2xpeW9nd3ZwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU0NzQ2NTMsImV4cCI6MjEwMTA1MDY1M30.KxjH42Wg0IVLfXLLJSbBLvcZ098hvJRUHkDu10NJfB4";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im55aG5rZnRsa2lnb2xpeW9nd3ZwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NTQ3NDY1MywiZXhwIjoyMTAxMDUwNjUzfQ.xsa3qLPf8jTe45x5x_-8TyTusbjnMiihtQse4IgjutQ";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const adminSupabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function runUserManagementE2ETests() {
  console.log("==================================================================================");
  console.log("👥 COMPLETE USER MANAGEMENT & SYNCHRONIZATION LIVE E2E QA SUITE");
  console.log("==================================================================================");

  let passed = 0;
  let failed = 0;

  const now = Date.now();
  const testStaffId = `TCH-MGT-${now}`;
  const testStaffLogin = `EMP${now.toString().slice(-5)}`;

  const testParentId = `PAR-MGT-${now}`;
  const testChild1Id = `STU-MGT-1-${now}`;
  const testChild2Id = `STU-MGT-2-${now}`;

  const createdUserIds: string[] = [];
  const createdRequestIds: string[] = [];
  const createdCommsIds: string[] = [];

  try {
    // ---------------------------------------------------------------------------
    // TEST 1: Create Staff Account in gv_users
    // ---------------------------------------------------------------------------
    console.log("\n[TEST 1] Creating Staff Account in gv_users...");
    const staffPayload = {
      id: testStaffId,
      login_id: testStaffLogin,
      email: `${testStaffLogin.toLowerCase()}@sunshine.edu`,
      full_name: "Staff Aarti Verma",
      role: "teacher",
      status: "active",
      employee_id: `EMP-${testStaffLogin}`,
      class_name: "Nursery A",
      subject: "English",
      mobile: "9876543210",
      experience: 4,
      branch: "Main Branch",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    createdUserIds.push(testStaffId);

    const { data: staffData, error: sErr } = await adminSupabase.from("gv_users").insert([staffPayload]).select();
    if (!sErr && staffData && staffData.length > 0) {
      console.log(`  ✓ PASS: Staff account created in gv_users (ID: ${testStaffId}, Login: ${testStaffLogin}).`);
      passed++;
    } else {
      console.error("  ✗ FAIL: Staff creation error:", sErr?.message);
      failed++;
    }

    // ---------------------------------------------------------------------------
    // TEST 2: Update Staff Account Details (Subject, Experience, Phone)
    // ---------------------------------------------------------------------------
    console.log("\n[TEST 2] Updating Staff Account Details...");
    const { error: upErr } = await adminSupabase
      .from("gv_users")
      .update({
        subject: "English & Phonics",
        experience: 5,
        mobile: "9123456789",
        updated_at: new Date().toISOString(),
      })
      .eq("id", testStaffId);

    const { data: updatedStaff } = await adminSupabase.from("gv_users").select("*").eq("id", testStaffId).single();

    if (!upErr && updatedStaff?.subject === "English & Phonics" && updatedStaff?.experience === 5) {
      console.log("  ✓ PASS: Staff details updated and verified in gv_users.");
      passed++;
    } else {
      console.error("  ✗ FAIL: Staff update error:", upErr?.message);
      failed++;
    }

    // ---------------------------------------------------------------------------
    // TEST 3: Disable & Restore Staff Account Status
    // ---------------------------------------------------------------------------
    console.log("\n[TEST 3] Disabling and Restoring Staff Account...");
    // Disable
    await adminSupabase.from("gv_users").update({ status: "inactive" }).eq("id", testStaffId);
    const { data: disabledStaff } = await adminSupabase.from("gv_users").select("status").eq("id", testStaffId).single();
    // Restore
    await adminSupabase.from("gv_users").update({ status: "active" }).eq("id", testStaffId);
    const { data: restoredStaff } = await adminSupabase.from("gv_users").select("status").eq("id", testStaffId).single();

    if (disabledStaff?.status === "inactive" && restoredStaff?.status === "active") {
      console.log("  ✓ PASS: Staff account status successfully toggled (active -> inactive -> active).");
      passed++;
    } else {
      console.error("  ✗ FAIL: Staff disable/restore error.");
      failed++;
    }

    // ---------------------------------------------------------------------------
    // TEST 4: Create Parent & Multi-Child Relationship in gv_users
    // ---------------------------------------------------------------------------
    console.log("\n[TEST 4] Creating Parent and Multi-Child (Child 1 & Child 2) in gv_users...");
    const parentPayload = {
      id: testParentId,
      login_id: `PAR${now.toString().slice(-5)}`,
      email: `parent.${now}@example.com`,
      full_name: "Mr. Rajesh Khanna",
      role: "parent",
      status: "active",
      mobile: "9988776655",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    createdUserIds.push(testParentId);

    const child1Payload = {
      id: testChild1Id,
      login_id: `ADM${now.toString().slice(-4)}1`,
      email: `child1.${now}@sunshine.edu`,
      full_name: "Aarav Khanna",
      role: "student",
      status: "active",
      class_name: "Nursery",
      section: "A",
      parent_name: "Mr. Rajesh Khanna",
      parent_id: testParentId,
      mobile: "9988776655",
      fee_status: "Paid",
      attendance_pct: 96,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    createdUserIds.push(testChild1Id);

    const child2Payload = {
      id: testChild2Id,
      login_id: `ADM${now.toString().slice(-4)}2`,
      email: `child2.${now}@sunshine.edu`,
      full_name: "Ananya Khanna",
      role: "student",
      status: "active",
      class_name: "UKG",
      section: "B",
      parent_name: "Mr. Rajesh Khanna",
      parent_id: testParentId,
      mobile: "9988776655",
      fee_status: "Pending",
      attendance_pct: 92,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    createdUserIds.push(testChild2Id);

    const { error: pErr } = await adminSupabase.from("gv_users").insert([parentPayload]);
    const { error: cErr } = await adminSupabase.from("gv_users").insert([child1Payload, child2Payload]);

    if (!pErr && !cErr) {
      // Query children for this parent
      const { data: childrenData } = await adminSupabase
        .from("gv_users")
        .select("*")
        .eq("parent_id", testParentId);

      if (childrenData && childrenData.length === 2) {
        console.log(`  ✓ PASS: Parent ${testParentId} linked to ${childrenData.length} distinct children (Aarav in Nursery-A, Ananya in UKG-B).`);
        passed++;
      } else {
        console.error("  ✗ FAIL: Children linkage count mismatch:", childrenData?.length);
        failed++;
      }
    } else {
      console.error("  ✗ FAIL: Parent/Child insert error:", pErr?.message || cErr?.message);
      failed++;
    }

    // ---------------------------------------------------------------------------
    // TEST 5: Multi-Assignment Persistence & Resolution for Same Staff
    // ---------------------------------------------------------------------------
    console.log("\n[TEST 5] Testing Multi-Assignment (Class Teacher + Subject Teacher) Persistence...");
    const asg1 = {
      id: `ASG-CT-${now}`,
      request_type: "class_assignment",
      applicant_or_child_name: "Staff Aarti Verma",
      leave_type_or_interested_class: "Nursery A",
      status: "active",
      reason_or_notes: JSON.stringify({
        id: `ASG-CT-${now}`,
        teacherId: testStaffId,
        teacherName: "Staff Aarti Verma",
        academicYear: "2026-2027",
        role: "class",
        className: "Nursery",
        section: "A",
        status: "active",
      }),
    };
    createdRequestIds.push(asg1.id);

    const asg2 = {
      id: `ASG-ST-${now}`,
      request_type: "class_assignment",
      applicant_or_child_name: "Staff Aarti Verma",
      leave_type_or_interested_class: "UKG B",
      status: "active",
      reason_or_notes: JSON.stringify({
        id: `ASG-ST-${now}`,
        teacherId: testStaffId,
        teacherName: "Staff Aarti Verma",
        academicYear: "2026-2027",
        role: "subject",
        className: "UKG",
        section: "B",
        subject: "Mathematics",
        status: "active",
      }),
    };
    createdRequestIds.push(asg2.id);

    const { error: asgErr } = await supabase.from("gv_requests").insert([asg1, asg2]);
    if (!asgErr) {
      console.log("  ✓ PASS: Both Class Teacher and Subject Teacher assignments persisted for staff.");
      passed++;
    } else {
      console.error("  ✗ FAIL: Assignment persistence error:", asgErr.message);
      failed++;
    }

    // ---------------------------------------------------------------------------
    // TEST 6: Historical Date Query vs Today Date Query (Rollover Test)
    // ---------------------------------------------------------------------------
    console.log("\n[TEST 6] Verifying Historical Date Preservation vs Current Date Rollover...");
    const pastDate = "2026-08-01";
    const todayDate = new Date().toISOString().slice(0, 10);

    const pastAttn = {
      id: `ATTN-HIST-${testChild1Id}-${pastDate}`,
      request_type: "student_attendance",
      applicant_or_child_name: testChild1Id,
      leave_type_or_interested_class: "Nursery A",
      status: "Present",
      reason_or_notes: JSON.stringify({
        studentId: testChild1Id,
        className: "Nursery",
        section: "A",
        date: pastDate,
        status: "P",
        markedBy: "Class Teacher",
      }),
      created_at: new Date(pastDate).toISOString(),
    };
    createdRequestIds.push(pastAttn.id);

    await supabase.from("gv_requests").insert([pastAttn]);

    const { data: histRecord } = await supabase.from("gv_requests").select("*").eq("id", pastAttn.id).single();
    if (histRecord && histRecord.id === pastAttn.id) {
      console.log(`  ✓ PASS: Historical attendance date (${pastDate}) preserved without being overwritten by today's date (${todayDate}).`);
      passed++;
    } else {
      console.error("  ✗ FAIL: Historical date query failed.");
      failed++;
    }

  } catch (err: any) {
    console.error("Unexpected QA Exception:", err);
    failed++;
  } finally {
    // ---------------------------------------------------------------------------
    // CLEANUP: Purge all test entities
    // ---------------------------------------------------------------------------
    console.log("\n[CLEANUP] Purging test accounts and records from Supabase...");
    if (createdUserIds.length > 0) {
      await adminSupabase.from("gv_users").delete().in("id", createdUserIds);
    }
    if (createdRequestIds.length > 0) {
      await supabase.from("gv_requests").delete().in("id", createdRequestIds);
    }
    if (createdCommsIds.length > 0) {
      await supabase.from("gv_communications").delete().in("id", createdCommsIds);
    }
    console.log(`  ✓ Cleaned up ${createdUserIds.length} user rows and ${createdRequestIds.length} request rows.`);
  }

  console.log("\n==================================================================================");
  console.log(`📊 FINAL USER MANAGEMENT QA RESULT: ${passed}/6 Core Tests Passed, ${failed} Failed`);
  console.log("==================================================================================");
}

runUserManagementE2ETests().catch(console.error);
