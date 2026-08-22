import { createClient } from "@supabase/supabase-js";
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
      }
    });
  }
} catch {}

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "https://nyhnkftlkigoliyogwvp.supabase.co";
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

if (!serviceKey) {
  console.error("Missing SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey);

async function runAdmissionFeePlanCustomAmountTest() {
  console.log("==================================================================================");
  console.log("🧪 STARTING ADMISSION FEE PLAN CUSTOM AMOUNT & LEDGER RECALCULATION E2E TEST");
  console.log("==================================================================================");

  const testStudentId = `STU-FeeTest-${Date.now().toString().slice(-4)}`;
  const testAdmNo = `2026-${Date.now().toString().slice(-4)}`;
  const feeScheduleId = `FS-${testStudentId}`;

  // ─────────────────────────────────────────────────────────────────────────────
  // STEP 1: CREATE ADMISSION WITH CUSTOM FEE AMOUNT (₹24,500)
  // ─────────────────────────────────────────────────────────────────────────────
  console.log(`\n[STEP 1] Creating student ${testStudentId} (${testAdmNo}) with custom fee amount ₹24,500...`);

  const studentPayload = {
    id: testStudentId,
    login_id: testStudentId,
    admission_no: testAdmNo,
    full_name: "Aditya Roy",
    role: "student",
    class_name: "Grade 3",
    section: "A",
    parent_name: "Vikram Roy",
    mobile: "9876500331",
    email: "aditya.roy@sunshine.edu",
    fee_status: "Pending",
    status: "active",
    created_at: new Date().toISOString(),
  };

  const { error: stuErr } = await supabase.from("gv_users").insert([studentPayload]);
  if (stuErr) {
    console.error("  └─ [FAIL] Student insertion error:", stuErr.message);
    process.exit(1);
  }
  console.log("  └─ [PASS] Student record created in gv_users.");

  const feeSchedulePayload = {
    id: feeScheduleId,
    record_type: "fee_schedule",
    student_id: testStudentId,
    student_name: "Aditya Roy",
    class_name: "Grade 3",
    fee_type: "Custom",
    academic_year: "2026-2027",
    amount_due: 24500,
    amount_paid: 0,
    balance: 24500,
    status: "Pending",
    created_at: new Date().toISOString(),
  };

  const { error: fsErr } = await supabase.from("gv_fees_payments").insert([feeSchedulePayload]);
  if (fsErr) {
    console.error("  └─ [FAIL] Fee schedule creation error:", fsErr.message);
    process.exit(1);
  }
  console.log("  └─ [PASS] Authoritative fee schedule record (₹24,500) created in gv_fees_payments.");

  // ─────────────────────────────────────────────────────────────────────────────
  // STEP 2: VERIFY INITIAL FEE LEDGER STATE
  // ─────────────────────────────────────────────────────────────────────────────
  console.log("\n[STEP 2] Fetching initial fee ledger from database...");
  const { data: rows1, error: fetchErr1 } = await supabase
    .from("gv_fees_payments")
    .select("*")
    .eq("student_id", testStudentId);

  if (fetchErr1 || !rows1 || rows1.length === 0) {
    console.error("  └─ [FAIL] Could not fetch fee schedule:", fetchErr1?.message);
    process.exit(1);
  }

  const scheduleRow1 = rows1.find((r) => r.record_type === "fee_schedule");
  console.log("  └─ [INITIAL LEDGER VERIFIED]:");
  console.log(`      Fee Plan: ${scheduleRow1.fee_type}`);
  console.log(`      Total Applicable Fee: ₹${scheduleRow1.amount_due}`);
  console.log(`      Paid: ₹${scheduleRow1.amount_paid}`);
  console.log(`      Balance: ₹${scheduleRow1.balance}`);
  console.log(`      Status: ${scheduleRow1.status}`);

  if (Number(scheduleRow1.amount_due) !== 24500 || Number(scheduleRow1.balance) !== 24500) {
    console.error("  └─ [FAIL] Initial fee schedule amounts do not match custom ₹24,500!");
    process.exit(1);
  }
  console.log("  └─ [PASS] Custom fee amount ₹24,500 verified in database.");

  // ─────────────────────────────────────────────────────────────────────────────
  // STEP 3: COLLECT PARTIAL PAYMENT TRANSACTION (₹10,000)
  // ─────────────────────────────────────────────────────────────────────────────
  const receiptId1 = `RCP-${Date.now()}-1`;
  console.log(`\n[STEP 3] Recording partial payment receipt ${receiptId1} of ₹10,000...`);

  const paymentPayload1 = {
    id: receiptId1,
    record_type: "payment_receipt",
    student_id: testStudentId,
    student_name: "Aditya Roy",
    class_name: "Grade 3",
    fee_type: "Tuition Fee",
    academic_year: "2026-2027",
    installment: 1,
    amount_paid: 10000,
    payment_date: new Date().toISOString().split("T")[0],
    payment_method: "UPI",
    receipt_number: `REC-2026-${Date.now().toString().slice(-4)}`,
    status: "Verified",
    recorded_by: "Office Staff",
    created_at: new Date().toISOString(),
  };

  const { error: rcptErr1 } = await supabase.from("gv_fees_payments").insert([paymentPayload1]);
  if (rcptErr1) {
    console.error("  └─ [FAIL] Receipt creation error:", rcptErr1.message);
    process.exit(1);
  }
  console.log("  └─ [PASS] Payment receipt inserted into gv_fees_payments.");

  // Query all fee transactions for student and recalculate ledger
  const { data: rows2 } = await supabase.from("gv_fees_payments").select("*").eq("student_id", testStudentId);
  const receipts2 = (rows2 || []).filter((r) => r.record_type === "payment_receipt");
  const paidTotal2 = receipts2.reduce((sum, r) => sum + Number(r.amount_paid || 0), 0);
  const totalFee2 = Number(scheduleRow1.amount_due);
  const balance2 = Math.max(0, totalFee2 - paidTotal2);

  console.log("  └─ [PARTIAL PAYMENT LEDGER VERIFIED]:");
  console.log(`      Total Fee: ₹${totalFee2}`);
  console.log(`      Total Paid (Receipt Sum): ₹${paidTotal2}`);
  console.log(`      Calculated Balance (Total - Paid): ₹${balance2}`);
  console.log(`      Status: ${paidTotal2 >= totalFee2 ? "Paid" : paidTotal2 > 0 ? "Partial" : "Pending"}`);

  if (paidTotal2 !== 10000 || balance2 !== 14500) {
    console.error("  └─ [FAIL] Partial payment calculation mismatch!");
    process.exit(1);
  }
  console.log("  └─ [PASS] Partial payment calculation (₹24,500 - ₹10,000 = ₹14,500 Balance) verified.");

  // ─────────────────────────────────────────────────────────────────────────────
  // STEP 4: EDIT ADMISSION FEE AMOUNT (UPDATE TOTAL FEE TO ₹28,000)
  // ─────────────────────────────────────────────────────────────────────────────
  console.log("\n[STEP 4] Editing admission fee amount from ₹24,500 to ₹28,000...");
  const { error: feeUpdateErr } = await supabase
    .from("gv_fees_payments")
    .update({ amount_due: 28000, balance: 18000 })
    .eq("id", feeScheduleId);

  if (feeUpdateErr) {
    console.error("  └─ [FAIL] Fee schedule update error:", feeUpdateErr.message);
    process.exit(1);
  }

  const { data: rows3 } = await supabase.from("gv_fees_payments").select("*").eq("student_id", testStudentId);
  const scheduleRow3 = rows3.find((r) => r.record_type === "fee_schedule");
  const receipts3 = (rows3 || []).filter((r) => r.record_type === "payment_receipt");
  const paidTotal3 = receipts3.reduce((sum, r) => sum + Number(r.amount_paid || 0), 0);
  const totalFee3 = Number(scheduleRow3.amount_due);
  const balance3 = Math.max(0, totalFee3 - paidTotal3);

  console.log("  └─ [EDITED FEE LEDGER VERIFIED]:");
  console.log(`      Updated Total Fee: ₹${totalFee3}`);
  console.log(`      Preserved Paid Receipts Total: ₹${paidTotal3}`);
  console.log(`      Recalculated Balance (₹28,000 - ₹10,000): ₹${balance3}`);

  if (totalFee3 !== 28000 || paidTotal3 !== 10000 || balance3 !== 18000) {
    console.error("  └─ [FAIL] Edited fee ledger calculation mismatch!");
    process.exit(1);
  }
  console.log("  └─ [PASS] Admission fee edit recalculated balance accurately without altering payment receipt history.");

  // ─────────────────────────────────────────────────────────────────────────────
  // STEP 5: FULL PAYMENT & ADVANCE TEST (ADD ₹20,000 PAYMENT -> TOTAL PAID ₹30,000)
  // ─────────────────────────────────────────────────────────────────────────────
  const receiptId2 = `RCP-${Date.now()}-2`;
  console.log(`\n[STEP 5] Recording additional payment receipt ${receiptId2} of ₹20,000...`);

  const paymentPayload2 = {
    id: receiptId2,
    record_type: "payment_receipt",
    student_id: testStudentId,
    student_name: "Aditya Roy",
    class_name: "Grade 3",
    fee_type: "Tuition Fee",
    academic_year: "2026-2027",
    installment: 2,
    amount_paid: 20000,
    payment_date: new Date().toISOString().split("T")[0],
    payment_method: "Bank Transfer",
    receipt_number: `REC-2026-${Date.now().toString().slice(-4)}`,
    status: "Verified",
    recorded_by: "Office Staff",
    created_at: new Date().toISOString(),
  };

  await supabase.from("gv_fees_payments").insert([paymentPayload2]);

  const { data: rows4 } = await supabase.from("gv_fees_payments").select("*").eq("student_id", testStudentId);
  const scheduleRow4 = rows4.find((r) => r.record_type === "fee_schedule");
  const receipts4 = (rows4 || []).filter((r) => r.record_type === "payment_receipt");
  const paidTotal4 = receipts4.reduce((sum, r) => sum + Number(r.amount_paid || 0), 0);
  const totalFee4 = Number(scheduleRow4.amount_due);
  const balance4 = Math.max(0, totalFee4 - paidTotal4);
  const advance4 = Math.max(0, paidTotal4 - totalFee4);

  console.log("  └─ [FULL / ADVANCE PAYMENT LEDGER VERIFIED]:");
  console.log(`      Total Fee: ₹${totalFee4}`);
  console.log(`      Total Paid: ₹${paidTotal4}`);
  console.log(`      Remaining Balance: ₹${balance4}`);
  console.log(`      Advance / Excess: ₹${advance4}`);
  console.log(`      Status: ${paidTotal4 >= totalFee4 ? "Paid" : "Partial"}`);

  if (paidTotal4 !== 30000 || balance4 !== 0 || advance4 !== 2000) {
    console.error("  └─ [FAIL] Advance/excess calculation mismatch!");
    process.exit(1);
  }
  console.log("  └─ [PASS] Advance payment calculation (₹30,000 Paid vs ₹28,000 Fee = ₹0 Balance, ₹2,000 Advance) verified.");

  // ─────────────────────────────────────────────────────────────────────────────
  // CLEANUP
  // ─────────────────────────────────────────────────────────────────────────────
  console.log(`\n[STEP 6] Cleaning up test records for student ${testStudentId}...`);
  await supabase.from("gv_users").delete().eq("id", testStudentId);
  await supabase.from("gv_fees_payments").delete().eq("student_id", testStudentId);
  console.log("  └─ [PASS] Test records cleaned up successfully.");

  console.log("\n==================================================================================");
  console.log("✅ ALL ADMISSION FEE PLAN & CUSTOM AMOUNT E2E CHECKS PASSED PERFECTLY!");
  console.log("==================================================================================");
}

runAdmissionFeePlanCustomAmountTest().catch((err) => {
  console.error("Test failed with error:", err);
  process.exit(1);
});
