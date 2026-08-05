import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL || "https://nyhnkftlkigoliyogwvp.supabase.co";
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || "";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

console.log("=========================================================");
console.log("🚀 GROWVIA SCHOOL ERP — COMPREHENSIVE END-TO-END AUDIT 🚀");
console.log("=========================================================\n");

const auditResults: { module: string; test: string; status: "PASS" | "FAIL"; details: string }[] = [];

function recordTest(module: string, test: string, passed: boolean, details: string) {
  auditResults.push({
    module,
    test,
    status: passed ? "PASS" : "FAIL",
    details
  });
  console.log(`[${passed ? "PASS ✅" : "FAIL ❌"}] ${module} -> ${test}: ${details}`);
}

async function runFullAudit() {
  const ts = Date.now().toString();

  // ---------------------------------------------------------------------------
  // 1. ENQUIRY MODULE TEST
  // ---------------------------------------------------------------------------
  try {
    const enqId = `REQ-AUDIT-${ts.slice(-6)}`;
    const enqPayload = {
      id: enqId,
      request_type: "enquiry",
      applicant_or_child_name: "Audit Test Child",
      parent_name: "Audit Test Parent",
      phone: "9876543210",
      email: "audit.parent@growvia.edu",
      address: "123 Test Street, Bengaluru",
      gender: "Boy",
      dob: "2022-05-10",
      leave_type_or_interested_class: "Nursery",
      source: "Walk-in",
      status: "New",
      reason_or_notes: "Automated QA Audit Enquiry"
    };

    const { data: createdEnq, error: createEnqErr } = await supabase
      .from("gv_requests")
      .insert([enqPayload])
      .select();

    if (createEnqErr) {
      recordTest("Enquiries Module", "Create Enquiry", false, createEnqErr.message);
    } else {
      recordTest("Enquiries Module", "Create Enquiry", true, `Created Enquiry ID ${enqId}`);
    }

    const { data: fetchedEnqs, error: fetchEnqErr } = await supabase
      .from("gv_requests")
      .select("*")
      .eq("request_type", "enquiry");

    if (fetchEnqErr) {
      recordTest("Enquiries Module", "Fetch Enquiries", false, fetchEnqErr.message);
    } else {
      recordTest("Enquiries Module", "Fetch Enquiries", true, `Retrieved ${fetchedEnqs?.length || 0} enquiries from Supabase`);
    }
  } catch (err: any) {
    recordTest("Enquiries Module", "Execution Exception", false, err.message);
  }

  // ---------------------------------------------------------------------------
  // 2. ADMISSIONS & STUDENTS MODULE TEST
  // ---------------------------------------------------------------------------
  try {
    const stuId = `STU-AUDIT-${ts.slice(-6)}`;
    const stuPayload = {
      id: stuId,
      login_id: stuId,
      email: `${stuId.toLowerCase()}@growvia.edu`,
      full_name: "Audit Test Student",
      role: "student",
      status: "active",
      admission_no: `ADM-${stuId}`,
      class_name: "Nursery",
      section: "A",
      parent_name: "Audit Parent",
      parent_id: `PAR-${stuId}`,
      mobile: "9876543210",
      date_of_birth: "2022-04-12",
      gender: "Boy",
      house: "Red",
      fee_status: "Pending",
      attendance_pct: 96.5,
      branch: "Main Branch"
    };

    const { data: createdStu, error: createStuErr } = await supabase
      .from("gv_users")
      .upsert([stuPayload], { onConflict: "id" })
      .select();

    if (createStuErr) {
      recordTest("Student Admissions", "Create Student", false, createStuErr.message);
    } else {
      recordTest("Student Admissions", "Create Student", true, `Created Student ${stuId} (${stuPayload.full_name})`);
    }

    const { data: fetchedStus, error: fetchStuErr } = await supabase
      .from("gv_users")
      .select("*")
      .in("role", ["student", "Student"]);

    if (fetchStuErr) {
      recordTest("Student Directory", "Fetch Students", false, fetchStuErr.message);
    } else {
      recordTest("Student Directory", "Fetch Students", true, `Retrieved ${fetchedStus?.length || 0} active students from Supabase`);
    }
  } catch (err: any) {
    recordTest("Student Directory", "Execution Exception", false, err.message);
  }

  // ---------------------------------------------------------------------------
  // 3. TEACHERS & STAFF MODULE TEST
  // ---------------------------------------------------------------------------
  try {
    const tchId = `TCH-AUDIT-${ts.slice(-6)}`;
    const tchPayload = {
      id: tchId,
      login_id: tchId,
      email: `teacher.${tchId.toLowerCase()}@growvia.edu`,
      full_name: "Prof. Audit Teacher",
      role: "teacher",
      status: "active",
      employee_id: `EMP-${tchId}`,
      class_name: "Nursery",
      section: "A",
      subject: "Phonics & Music",
      designation: "Class Teacher",
      mobile: "9876543210",
      experience: 5,
      branch: "Main Branch"
    };

    const { data: createdTch, error: createTchErr } = await supabase
      .from("gv_users")
      .upsert([tchPayload], { onConflict: "id" })
      .select();

    if (createTchErr) {
      recordTest("Staff & Teachers", "Create Teacher", false, createTchErr.message);
    } else {
      recordTest("Staff & Teachers", "Create Teacher", true, `Created Teacher ${tchId}`);
    }

    const { data: fetchedTchs, error: fetchTchErr } = await supabase
      .from("gv_users")
      .select("*")
      .in("role", ["teacher", "Teacher"]);

    if (fetchTchErr) {
      recordTest("Staff Directory", "Fetch Teachers", false, fetchTchErr.message);
    } else {
      recordTest("Staff Directory", "Fetch Teachers", true, `Retrieved ${fetchedTchs?.length || 0} active teachers from Supabase`);
    }
  } catch (err: any) {
    recordTest("Staff Directory", "Execution Exception", false, err.message);
  }

  // ---------------------------------------------------------------------------
  // 4. FEES & FINANCIALS MODULE TEST
  // ---------------------------------------------------------------------------
  try {
    const feeId = `FP-AUDIT-${ts.slice(-6)}`;
    const feePayload = {
      id: feeId,
      record_type: "fee_schedule",
      student_id: `STU-AUDIT-${ts.slice(-6)}`,
      student_name: "Audit Test Student",
      class_name: "Nursery",
      fee_type: "Term 1 Tuition Fee",
      academic_year: "2024-2025",
      installment: "Term 1",
      amount_due: 15000,
      amount_paid: 15000,
      balance: 0,
      payment_date: "2024-07-15",
      payment_method: "Online Transfer",
      receipt_number: `REC-AUDIT-${ts.slice(-6)}`,
      status: "Paid"
    };

    const { data: createdFee, error: createFeeErr } = await supabase
      .from("gv_fees_payments")
      .upsert([feePayload], { onConflict: "id" })
      .select();

    if (createFeeErr) {
      recordTest("Fees & Financials", "Record Fee Voucher", false, createFeeErr.message);
    } else {
      recordTest("Fees & Financials", "Record Fee Voucher", true, `Created Fee Receipt ${feePayload.receipt_number}`);
    }

    const { data: fetchedFees, error: fetchFeeErr } = await supabase
      .from("gv_fees_payments")
      .select("*");

    if (fetchFeeErr) {
      recordTest("Fees & Financials", "Fetch Fee Ledgers", false, fetchFeeErr.message);
    } else {
      recordTest("Fees & Financials", "Fetch Fee Ledgers", true, `Retrieved ${fetchedFees?.length || 0} fee records from Supabase`);
    }
  } catch (err: any) {
    recordTest("Fees & Financials", "Execution Exception", false, err.message);
  }

  // ---------------------------------------------------------------------------
  // 5. EXPENSES & INVENTORY MODULE TEST
  // ---------------------------------------------------------------------------
  try {
    const expId = `IE-AUDIT-${ts.slice(-6)}`;
    const expPayload = {
      id: expId,
      record_type: "expense",
      title: "Audit Stationery Supplies",
      category: "Supplies",
      amount_or_unit_cost: 2500,
      quantity: 1,
      unit: "pcs",
      supplier_or_paid_to: "City Stationery Mart",
      payment_method: "Cash",
      transaction_date: "2024-08-01",
      notes: "QA Audit Expense Record"
    };

    const { data: createdExp, error: createExpErr } = await supabase
      .from("gv_inventory_expenses")
      .upsert([expPayload], { onConflict: "id" })
      .select();

    if (createExpErr) {
      recordTest("Expenses & Inventory", "Record Expense Voucher", false, createExpErr.message);
    } else {
      recordTest("Expenses & Inventory", "Record Expense Voucher", true, `Created Expense ${expId}`);
    }

    const { data: fetchedExps, error: fetchExpErr } = await supabase
      .from("gv_inventory_expenses")
      .select("*");

    if (fetchExpErr) {
      recordTest("Expenses & Inventory", "Fetch Inventory & Expenses", false, fetchExpErr.message);
    } else {
      recordTest("Expenses & Inventory", "Fetch Inventory & Expenses", true, `Retrieved ${fetchedExps?.length || 0} records from Supabase`);
    }
  } catch (err: any) {
    recordTest("Expenses & Inventory", "Execution Exception", false, err.message);
  }

  // ---------------------------------------------------------------------------
  // 6. COMMUNICATIONS & CIRCULARS MODULE TEST
  // ---------------------------------------------------------------------------
  try {
    const circId = `COMM-AUDIT-${ts.slice(-6)}`;
    const circPayload = {
      id: circId,
      message_type: "circular",
      title: "Audit Annual Sports Day Notice",
      body: "Annual Sports Day will take place next Friday.",
      sender_id: "OFFICE001",
      sender_name: "Office Admin",
      sender_role: "office",
      recipient_role: "all",
      priority: "high"
    };

    const { data: createdCirc, error: createCircErr } = await supabase
      .from("gv_communications")
      .upsert([circPayload], { onConflict: "id" })
      .select();

    if (createCircErr) {
      recordTest("Circulars & Notices", "Publish Circular", false, createCircErr.message);
    } else {
      recordTest("Circulars & Notices", "Publish Circular", true, `Published Circular ${circId}`);
    }

    const { data: fetchedCircs, error: fetchCircErr } = await supabase
      .from("gv_communications")
      .select("*")
      .eq("message_type", "circular");

    if (fetchCircErr) {
      recordTest("Circulars & Notices", "Fetch Circulars", false, fetchCircErr.message);
    } else {
      recordTest("Circulars & Notices", "Fetch Circulars", true, `Retrieved ${fetchedCircs?.length || 0} circulars from Supabase`);
    }
  } catch (err: any) {
    recordTest("Circulars & Notices", "Execution Exception", false, err.message);
  }

  // ---------------------------------------------------------------------------
  // 7. DEVELOPER CONSOLE & SYSTEM SETTINGS TEST
  // ---------------------------------------------------------------------------
  try {
    const { data: settingsData, error: fetchSetErr } = await supabase
      .from("gv_system_settings")
      .select("*");

    if (fetchSetErr) {
      recordTest("Developer Console", "Fetch System Settings", false, fetchSetErr.message);
    } else {
      recordTest("Developer Console", "Fetch System Settings", true, `Retrieved ${settingsData?.length || 0} system configuration records`);
    }
  } catch (err: any) {
    recordTest("Developer Console", "Execution Exception", false, err.message);
  }

  console.log("\n=========================================================");
  console.log("📊 AUDIT SUMMARY REPORT:");
  console.log("=========================================================");
  const passCount = auditResults.filter((r) => r.status === "PASS").length;
  const failCount = auditResults.filter((r) => r.status === "FAIL").length;
  console.log(`TOTAL TESTS: ${auditResults.length} | PASSED: ${passCount} | FAILED: ${failCount}\n`);
}

runFullAudit().catch(console.error);
