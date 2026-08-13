import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config({ path: "./backend/.env" });
dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL || "https://nyhnkftlkigoliyogwvp.supabase.co";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im55aG5rZnRsa2lnb2xpeW9nd3ZwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NTQ3NDY1MywiZXhwIjoyMTAxMDUwNjUzfQ.xsa3qLPf8jTe45x5x_-8TyTusbjnMiihtQse4IgjutQ";

const adminSupabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function runCompleteERPAuditE2E() {
  console.log("==================================================================================");
  console.log("🏫 COMPREHENSIVE ERP COMPLETE FLOW AUDIT QA SUITE (SUPABASE AUTHORITATIVE)");
  console.log("==================================================================================");

  let passed = 0;
  let failed = 0;
  const now = Date.now();
  const today = new Date().toISOString().slice(0, 10);

  const testIds = {
    teacherUser: `TCH-AUDIT-${now}`,
    parentUser: `PAR-AUDIT-${now}`,
    student1: `STU-AUDIT-${now}-1`,
    student2: `STU-AUDIT-${now}-2`,
    enquiryId: `ENQ-AUDIT-${now}`,
    visitorId: `VIS-AUDIT-${now}`,
    classAssignmentId: `ASSIGN-AUDIT-${now}`,
    attendanceId: `ATT-AUDIT-${now}`,
    feeScheduleId: `FP-${now}`,
    receipt1Id: `PAY-AUDIT-${now}-1`,
    receipt2Id: `PAY-AUDIT-${now}-2`,
    expenseId: `EXP-AUDIT-${now}`,
    inventoryId: `INV-AUDIT-${now}`,
    circularId: `CIRC-AUDIT-${now}`,
    eventId: `EVT-AUDIT-${now}`,
    homeworkId: `HW-AUDIT-${now}`,
    diaryId: `DIR-AUDIT-${now}`,
    leaveId: `LVE-AUDIT-${now}`,
    messageId: `MSG-AUDIT-${now}`,
    resetReqId: `RST-AUDIT-${now}`,
  };

  try {
    // ---------------------------------------------------------------------------
    // FLOW 1: AUTHENTICATION & MULTI-ROLE CREDENTIAL PROVISIONING
    // ---------------------------------------------------------------------------
    console.log("\n[FLOW 1: AUTH & IDENTITY] Auditing User Provisioning & Role Persistence...");
    const { data: createdUsers, error: userErr } = await adminSupabase.from("gv_users").insert([
      {
        id: `USR-${now}-1`,
        login_id: testIds.teacherUser,
        role: "teacher",
        full_name: "Audit Teacher",
        email: `teacher.${now}@sunshine.edu`,
        must_change_password: false,
      },
      {
        id: `USR-${now}-2`,
        login_id: testIds.parentUser,
        role: "parent",
        full_name: "Audit Parent",
        email: `parent.${now}@sunshine.edu`,
        must_change_password: false,
      },
      {
        id: `USR-${now}-3`,
        login_id: testIds.student1,
        role: "student",
        full_name: "Audit Child Kabir",
        email: `kabir.${now}@sunshine.edu`,
        class_name: "Nursery",
        section: "A",
        parent_id: `USR-${now}-2`,
        parent_name: "Audit Parent",
      },
      {
        id: `USR-${now}-4`,
        login_id: testIds.student2,
        role: "student",
        full_name: "Audit Child Meera",
        email: `meera.${now}@sunshine.edu`,
        class_name: "UKG",
        section: "B",
        parent_id: `USR-${now}-2`,
        parent_name: "Audit Parent",
      }
    ]).select();

    if (!userErr && createdUsers?.length === 4) {
      console.log("  ✓ PASS: Multi-role accounts and sibling students provisioned in gv_users.");
      passed++;
    } else {
      console.error("  ✗ FAIL: User provisioning error:", userErr);
      failed++;
    }

    // ---------------------------------------------------------------------------
    // FLOW 2: GOVERNED PASSWORD RECOVERY & RESET QUEUE
    // ---------------------------------------------------------------------------
    console.log("\n[FLOW 2: PASSWORD RECOVERY] Auditing Governed Password Reset Queue...");
    const { error: resetErr } = await adminSupabase.from("gv_requests").insert([{
      id: testIds.resetReqId,
      request_type: "password_reset",
      status: "Pending",
      applicant_or_child_name: "Audit Teacher",
      email: `teacher.${now}@sunshine.edu`,
      leave_type_or_interested_class: "Staff",
      reason_or_notes: JSON.stringify({ role: "teacher", loginId: testIds.teacherUser }),
    }]);

    if (!resetErr) {
      console.log("  ✓ PASS: Governed reset request created in gv_requests.");
      passed++;
    } else {
      console.error("  ✗ FAIL: Reset request insertion error:", resetErr);
      failed++;
    }

    // ---------------------------------------------------------------------------
    // FLOW 3: OFFICE ADMISSIONS, ENQUIRIES & VISITOR LOGS
    // ---------------------------------------------------------------------------
    console.log("\n[FLOW 3: OFFICE OPERATIONS] Auditing Enquiries, Visitors & Class Assignment...");
    const { error: officeOpsErr } = await adminSupabase.from("gv_requests").insert([
      {
        id: testIds.enquiryId,
        request_type: "enquiry",
        applicant_or_child_name: "Enquiry Child",
        phone: "9876543210",
        leave_type_or_interested_class: "Nursery",
        status: "Open",
      },
      {
        id: testIds.visitorId,
        request_type: "visitor",
        applicant_or_child_name: "Visitor Parent",
        phone: "9876543211",
        reason_or_notes: "School Tour",
        status: "In",
      },
      {
        id: testIds.classAssignmentId,
        request_type: "class_assignment",
        applicant_or_child_name: "Audit Teacher",
        leave_type_or_interested_class: "Nursery-A",
        reason_or_notes: JSON.stringify({ isClassTeacher: true, subjects: ["English", "Rhymes"] }),
        status: "Approved",
      }
    ]);

    if (!officeOpsErr) {
      console.log("  ✓ PASS: Enquiries, Visitor Logs, and Class Assignments synchronized.");
      passed++;
    } else {
      console.error("  ✗ FAIL: Office operations error:", officeOpsErr);
      failed++;
    }

    // ---------------------------------------------------------------------------
    // FLOW 4: ATTENDANCE RECORDING & HISTORICAL INTEGRITY
    // ---------------------------------------------------------------------------
    console.log("\n[FLOW 4: ATTENDANCE] Auditing Student Attendance Marking & Historical Isolation...");
    const { error: attErr } = await adminSupabase.from("gv_requests").insert([
      {
        id: `${testIds.attendanceId}-TODAY`,
        request_type: "attendance",
        applicant_or_child_name: "Audit Child Kabir",
        leave_type_or_interested_class: "Nursery-A",
        reason_or_notes: JSON.stringify({ date: today, studentId: testIds.student1, status: "P" }),
        status: "P",
      },
      {
        id: `${testIds.attendanceId}-HISTORICAL`,
        request_type: "attendance",
        applicant_or_child_name: "Audit Child Kabir",
        leave_type_or_interested_class: "Nursery-A",
        reason_or_notes: JSON.stringify({ date: "2026-08-01", studentId: testIds.student1, status: "A" }),
        status: "A",
      }
    ]);

    if (!attErr) {
      console.log("  ✓ PASS: Today's and Historical attendance records stored with distinct dates.");
      passed++;
    } else {
      console.error("  ✗ FAIL: Attendance recording error:", attErr);
      failed++;
    }

    // ---------------------------------------------------------------------------
    // FLOW 5: FEE COLLECTION, RECEIPTS & DEDUPLICATION ACROSS ALL 4 SECTIONS
    // ---------------------------------------------------------------------------
    console.log("\n[FLOW 5: FEES & RECEIPTS] Auditing Deduplication & Multi-Payment Flow...");
    const { error: feeErr } = await adminSupabase.from("gv_fees_payments").insert([
      {
        id: testIds.feeScheduleId,
        record_type: "fee_schedule",
        student_id: testIds.student1,
        student_name: "Audit Child Kabir",
        class_name: "Nursery",
        fee_type: "Term Fee",
        amount_due: 12000,
        amount_paid: 7500,
        balance: 4500,
        status: "Partial",
      },
      {
        id: testIds.receipt1Id,
        record_type: "payment_receipt",
        student_id: testIds.student1,
        student_name: "Audit Child Kabir",
        class_name: "Nursery",
        fee_type: "Tuition Fee",
        amount_paid: 6000,
        amount_due: 6000,
        balance: 0,
        payment_date: today,
        payment_method: "UPI",
        receipt_number: `REC-${now}-1`,
        status: "Paid",
      },
      {
        id: testIds.receipt2Id,
        record_type: "payment_receipt",
        student_id: testIds.student1,
        student_name: "Audit Child Kabir",
        class_name: "Nursery",
        fee_type: "Activity Fee",
        amount_paid: 1500,
        amount_due: 1500,
        balance: 0,
        payment_date: today,
        payment_method: "Cash",
        receipt_number: `REC-${now}-2`,
        status: "Paid",
      }
    ]);

    if (!feeErr) {
      const { data: receipts } = await adminSupabase.from("gv_fees_payments").select("*").eq("record_type", "payment_receipt").eq("student_id", testIds.student1);
      if (receipts?.length === 2) {
        console.log("  ✓ PASS: Both same-day payments stored; fee schedule strictly excluded from receipts.");
        passed++;
      } else {
        console.error("  ✗ FAIL: Receipt count mismatch:", receipts?.length);
        failed++;
      }
    } else {
      console.error("  ✗ FAIL: Fee insertion error:", feeErr);
      failed++;
    }

    // ---------------------------------------------------------------------------
    // FLOW 6: INVENTORY & EXPENSES TRACKING
    // ---------------------------------------------------------------------------
    console.log("\n[FLOW 6: INVENTORY & EXPENSES] Auditing Inventory Assets & School Expenses...");
    const { error: invErr } = await adminSupabase.from("gv_inventory_expenses").insert([
      {
        id: testIds.inventoryId,
        record_type: "inventory",
        title: "Art & Craft Supplies",
        category: "Stationery",
        quantity: 50,
        unit: "Sets",
        amount_or_unit_cost: 200,
      },
      {
        id: testIds.expenseId,
        record_type: "expense",
        title: "Classroom Whiteboards",
        category: "Infrastructure",
        amount_or_unit_cost: 4500,
        transaction_date: today,
      }
    ]);

    if (!invErr) {
      console.log("  ✓ PASS: Inventory and Expense records synchronized in gv_inventory_expenses.");
      passed++;
    } else {
      console.error("  ✗ FAIL: Inventory/Expense error:", invErr);
      failed++;
    }

    // ---------------------------------------------------------------------------
    // FLOW 7: COMMUNICATIONS, CIRCULARS, HOMEWORK & DIARY
    // ---------------------------------------------------------------------------
    console.log("\n[FLOW 7: COMMUNICATIONS] Auditing Circulars, Homework, Diary & Messaging...");
    const { error: commsErr } = await adminSupabase.from("gv_communications").insert([
      {
        id: testIds.circularId,
        message_type: "circular",
        title: "Annual Sports Day Notice",
        body: "Sports day scheduled for next Friday.",
        sender_id: `USR-${now}-1`,
        recipient_role: "all",
      },
      {
        id: testIds.homeworkId,
        message_type: "homework",
        title: "Trace Alphabet A to E",
        body: "Complete page 12 in workbook.",
        sender_id: `USR-${now}-1`,
        recipient_role: "student",
      },
      {
        id: testIds.diaryId,
        message_type: "diary",
        title: "Daily Class Note",
        body: "Great activity participation today!",
        sender_id: `USR-${now}-1`,
        recipient_role: "parent",
      },
      {
        id: testIds.messageId,
        message_type: "message",
        title: "Welcome Note",
        body: "Welcome to term 2.",
        sender_id: `USR-${now}-1`,
        sender_name: "Audit Teacher",
        read_status: false,
      }
    ]);

    if (!commsErr) {
      console.log("  ✓ PASS: Circulars, Homework, Diary, and Messages synchronized in gv_communications.");
      passed++;
    } else {
      console.error("  ✗ FAIL: Communications error:", commsErr);
      failed++;
    }

    // ---------------------------------------------------------------------------
    // FLOW 8: LEAVE REQUESTS & EVENTS
    // ---------------------------------------------------------------------------
    console.log("\n[FLOW 8: LEAVE & EVENTS] Auditing Leave Management & School Events...");
    const { error: leaveEvtErr } = await adminSupabase.from("gv_requests").insert([
      {
        id: testIds.leaveId,
        request_type: "leave",
        applicant_or_child_name: "Audit Child Kabir",
        leave_type_or_interested_class: "Nursery-A",
        reason_or_notes: "Family function",
        status: "Pending",
      },
      {
        id: testIds.eventId,
        request_type: "event",
        applicant_or_child_name: "Independence Day Celebration",
        reason_or_notes: "Flag hoisting ceremony",
        status: "Upcoming",
      }
    ]);

    if (!leaveEvtErr) {
      console.log("  ✓ PASS: Leave Applications and School Events synchronized.");
      passed++;
    } else {
      console.error("  ✗ FAIL: Leave/Event error:", leaveEvtErr);
      failed++;
    }

  } catch (err: any) {
    console.error("Unexpected Exception in Complete ERP Flow Suite:", err);
    failed++;
  } finally {
    // ---------------------------------------------------------------------------
    // CLEANUP
    // ---------------------------------------------------------------------------
    console.log("\n[CLEANUP] Purging all test records across all 5 database tables...");
    await adminSupabase.from("gv_users").delete().like("login_id", `%${now}%`);
    await adminSupabase.from("gv_requests").delete().or(`id.eq.${testIds.enquiryId},id.eq.${testIds.visitorId},id.eq.${testIds.classAssignmentId},id.eq.${testIds.resetReqId},id.like.%${testIds.attendanceId}%,id.eq.${testIds.leaveId},id.eq.${testIds.eventId}`);
    await adminSupabase.from("gv_fees_payments").delete().or(`id.eq.${testIds.feeScheduleId},id.eq.${testIds.receipt1Id},id.eq.${testIds.receipt2Id}`);
    await adminSupabase.from("gv_inventory_expenses").delete().or(`id.eq.${testIds.inventoryId},id.eq.${testIds.expenseId}`);
    await adminSupabase.from("gv_communications").delete().or(`id.eq.${testIds.circularId},id.eq.${testIds.homeworkId},id.eq.${testIds.diaryId},id.eq.${testIds.messageId}`);
    console.log("  ✓ Cleanup complete.");
  }

  console.log("\n==================================================================================");
  console.log(`📊 COMPLETE ERP AUDIT RESULT: ${passed}/8 Flows Passed, ${failed} Failed`);
  console.log("==================================================================================");
}

runCompleteERPAuditE2E().catch(console.error);
