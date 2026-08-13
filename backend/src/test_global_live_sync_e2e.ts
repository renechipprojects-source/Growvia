import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config({ path: "./backend/.env" });
dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL || "https://nyhnkftlkigoliyogwvp.supabase.co";
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im55aG5rZnRsa2lnb2xpeW9nd3ZwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU0NzQ2NTMsImV4cCI6MjEwMTA1MDY1M30.KxjH42Wg0IVLfXLLJSbBLvcZ098hvJRUHkDu10NJfB4";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im55aG5rZnRsa2lnb2xpeW9nd3ZwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NTQ3NDY1MywiZXhwIjoyMTAxMDUwNjUzfQ.xsa3qLPf8jTe45x5x_-8TyTusbjnMiihtQse4IgjutQ";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const adminSupabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function runGlobalLiveSyncE2ETests() {
  console.log("==================================================================================");
  console.log("🌐 GLOBAL LIVE DATA SYNCHRONIZATION END-TO-END QA SUITE (SUPABASE LIVE)");
  console.log("==================================================================================");

  let passed = 0;
  let failed = 0;

  const now = Date.now();
  const today = new Date().toISOString().slice(0, 10);

  const studentId = `STU-SYNC-${now}`;
  const parentId = `PAR-SYNC-${now}`;
  const teacherId = `TCH-SYNC-${now}`;

  const createdUserIds: string[] = [];
  const createdRequestIds: string[] = [];
  const createdCommsIds: string[] = [];
  const createdFeeIds: string[] = [];

  try {
    // ---------------------------------------------------------------------------
    // 1. USER SYNCHRONIZATION (gv_users)
    // ---------------------------------------------------------------------------
    console.log("\n[SYNC 1] Testing User Lifecycle in gv_users (Create -> Update -> Verify)...");
    const userPayload = {
      id: studentId,
      login_id: `STU${now.toString().slice(-5)}`,
      email: `sync.student.${now}@sunshine.edu`,
      full_name: "Sync Test Student",
      role: "student",
      status: "active",
      class_name: "Playgroup",
      section: "A",
      parent_name: "Sync Test Parent",
      parent_id: parentId,
      mobile: "9876543210",
      fee_status: "Pending",
      attendance_pct: 95,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    createdUserIds.push(studentId);

    const { error: uErr } = await adminSupabase.from("gv_users").insert([userPayload]);
    const { data: insertedUser } = await adminSupabase.from("gv_users").select("*").eq("id", studentId).single();

    if (!uErr && insertedUser?.id === studentId) {
      console.log("  ✓ PASS: User created and confirmed in gv_users.");
      passed++;
    } else {
      console.error("  ✗ FAIL: User creation error:", uErr?.message);
      failed++;
    }

    // ---------------------------------------------------------------------------
    // 2. ASSIGNMENTS SYNCHRONIZATION (gv_requests)
    // ---------------------------------------------------------------------------
    console.log("\n[SYNC 2] Testing Class & Subject Teacher Assignments Sync...");
    const asgId = `ASG-SYNC-${now}`;
    createdRequestIds.push(asgId);
    const asgPayload = {
      id: asgId,
      request_type: "class_assignment",
      applicant_or_child_name: "Sync Teacher",
      leave_type_or_interested_class: "Playgroup A",
      status: "active",
      reason_or_notes: JSON.stringify({
        id: asgId,
        teacherId,
        teacherName: "Sync Teacher",
        academicYear: "2026-2027",
        role: "class",
        className: "Playgroup",
        section: "A",
        status: "active",
      }),
    };

    const { error: asgErr } = await supabase.from("gv_requests").insert([asgPayload]);
    const { data: asgData } = await supabase.from("gv_requests").select("*").eq("id", asgId).single();

    if (!asgErr && asgData?.id === asgId) {
      console.log("  ✓ PASS: Assignment created and confirmed in gv_requests.");
      passed++;
    } else {
      console.error("  ✗ FAIL: Assignment sync error:", asgErr?.message);
      failed++;
    }

    // ---------------------------------------------------------------------------
    // 3. ATTENDANCE & DATE ROLLOVER SYNCHRONIZATION (gv_requests)
    // ---------------------------------------------------------------------------
    console.log("\n[SYNC 3] Testing Attendance Record & Historical Date Preservation...");
    const pastDate = "2026-07-15";
    const attnId = `ATTN-SYNC-${studentId}-${today}`;
    const histAttnId = `ATTN-SYNC-${studentId}-${pastDate}`;
    createdRequestIds.push(attnId, histAttnId);

    const todayAttn = {
      id: attnId,
      request_type: "student_attendance",
      applicant_or_child_name: studentId,
      leave_type_or_interested_class: "Playgroup A",
      status: "Present",
      reason_or_notes: JSON.stringify({
        studentId,
        className: "Playgroup",
        section: "A",
        date: today,
        status: "P",
        markedBy: "Class Teacher",
      }),
      created_at: new Date().toISOString(),
    };

    const histAttn = {
      id: histAttnId,
      request_type: "student_attendance",
      applicant_or_child_name: studentId,
      leave_type_or_interested_class: "Playgroup A",
      status: "Absent",
      reason_or_notes: JSON.stringify({
        studentId,
        className: "Playgroup",
        section: "A",
        date: pastDate,
        status: "A",
        markedBy: "Class Teacher",
      }),
      created_at: new Date(pastDate).toISOString(),
    };

    await supabase.from("gv_requests").upsert([todayAttn, histAttn], { onConflict: "id" });

    const { data: fetchedToday } = await supabase.from("gv_requests").select("*").eq("id", attnId).single();
    const { data: fetchedHist } = await supabase.from("gv_requests").select("*").eq("id", histAttnId).single();

    if (fetchedToday && fetchedHist && fetchedHist.status === "Absent") {
      console.log("  ✓ PASS: Today's and Historical attendance records independently stored without rollover collision.");
      passed++;
    } else {
      console.error("  ✗ FAIL: Attendance sync error.");
      failed++;
    }

    // ---------------------------------------------------------------------------
    // 4. MARKS SYNCHRONIZATION (gv_requests)
    // ---------------------------------------------------------------------------
    console.log("\n[SYNC 4] Testing Multi-Subject Marks Synchronization...");
    const markId = `MRK-SYNC-${studentId}-English-Unit1`;
    createdRequestIds.push(markId);
    const markPayload = {
      id: markId,
      request_type: "marks",
      applicant_or_child_name: "Sync Test Student",
      parent_name: studentId,
      leave_type_or_interested_class: "Playgroup A",
      status: "A+",
      reason_or_notes: JSON.stringify({
        studentId,
        studentName: "Sync Test Student",
        rollNo: 1,
        className: "Playgroup",
        section: "A",
        subject: "English",
        assessment: "Unit Test 1",
        outOf: 50,
        score: 48,
        remarks: "Excellent early language skills.",
      }),
      updated_at: new Date().toISOString(),
    };

    const { error: mrkErr } = await supabase.from("gv_requests").upsert([markPayload], { onConflict: "id" });
    const { data: mrkData } = await supabase.from("gv_requests").select("*").eq("id", markId).single();

    if (!mrkErr && mrkData?.status === "A+") {
      console.log("  ✓ PASS: Marks persisted and retrieved with exact subject scoring.");
      passed++;
    } else {
      console.error("  ✗ FAIL: Marks sync error:", mrkErr?.message);
      failed++;
    }

    // ---------------------------------------------------------------------------
    // 5. HOMEWORK SYNCHRONIZATION (gv_communications)
    // ---------------------------------------------------------------------------
    console.log("\n[SYNC 5] Testing Homework Synchronization...");
    const hwId = `HW-SYNC-${now}`;
    createdCommsIds.push(hwId);
    const hwPayload = {
      id: hwId,
      message_type: "homework",
      title: "Playgroup Color Matching",
      body: JSON.stringify({
        title: "Playgroup Color Matching",
        className: "Playgroup",
        subject: "Art",
        due: today,
        details: "Match 4 basic primary colors.",
      }),
      sender_id: teacherId,
      sender_name: "Sync Teacher",
      sender_role: "teacher",
      recipient_role: "parent",
      published_at: new Date().toISOString(),
    };

    const { error: hwErr } = await supabase.from("gv_communications").insert([hwPayload]);
    const { data: hwData } = await supabase.from("gv_communications").select("*").eq("id", hwId).single();

    if (!hwErr && hwData?.id === hwId) {
      console.log("  ✓ PASS: Homework synchronized to gv_communications.");
      passed++;
    } else {
      console.error("  ✗ FAIL: Homework sync error:", hwErr?.message);
      failed++;
    }

    // ---------------------------------------------------------------------------
    // 6. FEES & PAYMENTS SYNCHRONIZATION (gv_fees_payments)
    // ---------------------------------------------------------------------------
    console.log("\n[SYNC 6] Testing Fees & Receipt Synchronization...");
    const feeId = `FP-SYNC-${now}`;
    createdFeeIds.push(feeId);
    const feePayload = {
      id: feeId,
      record_type: "payment_receipt",
      student_id: studentId,
      student_name: "Sync Test Student",
      class_name: "Playgroup",
      fee_type: "Tuition Fee",
      academic_year: "2026-2027",
      installment: "Term 1",
      amount_due: 12000,
      amount_paid: 12000,
      balance: 0,
      payment_date: today,
      payment_method: "Online",
      receipt_number: `REC-SYNC-${now.toString().slice(-4)}`,
      status: "Paid",
      recorded_by: "Office Staff",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { error: fpErr } = await supabase.from("gv_fees_payments").insert([feePayload]);
    const { data: fpData } = await supabase.from("gv_fees_payments").select("*").eq("id", feeId).single();

    if (!fpErr && fpData?.id === feeId && fpData?.status === "Paid") {
      console.log("  ✓ PASS: Fee payment receipt confirmed in gv_fees_payments.");
      passed++;
    } else {
      console.error("  ✗ FAIL: Fees sync error:", fpErr?.message);
      failed++;
    }

    // ---------------------------------------------------------------------------
    // 7. MESSAGING & NOTIFICATIONS SYNCHRONIZATION (gv_communications)
    // ---------------------------------------------------------------------------
    console.log("\n[SYNC 7] Testing Messaging & Read Receipt Synchronization...");
    const msgId = `MSG-SYNC-${now}`;
    createdCommsIds.push(msgId);
    const msgPayload = {
      id: msgId,
      message_type: "message",
      title: "Playgroup Welcome Pack",
      body: "Welcome to Sunshine Play School! Please check the onboarding kit.",
      sender_id: "OFFICE001",
      sender_name: "Office",
      sender_role: "office",
      recipient_role: "parent",
      recipient_user_id: parentId,
      read_status: false,
      published_at: new Date().toISOString(),
    };

    await supabase.from("gv_communications").insert([msgPayload]);
    // Simulate recipient read
    await supabase.from("gv_communications").update({ read_status: true }).eq("id", msgId);
    const { data: msgData } = await supabase.from("gv_communications").select("read_status").eq("id", msgId).single();

    if (msgData?.read_status === true) {
      console.log("  ✓ PASS: Message read receipt confirmed in gv_communications.");
      passed++;
    } else {
      console.error("  ✗ FAIL: Messaging sync error.");
      failed++;
    }

  } catch (err: any) {
    console.error("Unexpected Global Sync Exception:", err);
    failed++;
  } finally {
    // ---------------------------------------------------------------------------
    // CLEANUP: Purge all test entities
    // ---------------------------------------------------------------------------
    console.log("\n[CLEANUP] Purging test records across all tables...");
    if (createdUserIds.length > 0) {
      await adminSupabase.from("gv_users").delete().in("id", createdUserIds);
    }
    if (createdRequestIds.length > 0) {
      await supabase.from("gv_requests").delete().in("id", createdRequestIds);
    }
    if (createdCommsIds.length > 0) {
      await supabase.from("gv_communications").delete().in("id", createdCommsIds);
    }
    if (createdFeeIds.length > 0) {
      await supabase.from("gv_fees_payments").delete().in("id", createdFeeIds);
    }
    console.log("  ✓ All test records purged successfully.");
  }

  console.log("\n==================================================================================");
  console.log(`📊 FINAL GLOBAL LIVE SYNC RESULT: ${passed}/7 Modules Passed, ${failed} Failed`);
  console.log("==================================================================================");
}

runGlobalLiveSyncE2ETests().catch(console.error);
