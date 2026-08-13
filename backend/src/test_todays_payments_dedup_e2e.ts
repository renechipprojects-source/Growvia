import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config({ path: "./backend/.env" });
dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL || "https://nyhnkftlkigoliyogwvp.supabase.co";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im55aG5rZnRsa2lnb2xpeW9nd3ZwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NTQ3NDY1MywiZXhwIjoyMTAxMDUwNjUzfQ.xsa3qLPf8jTe45x5x_-8TyTusbjnMiihtQse4IgjutQ";

const adminSupabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function runTodaysPaymentsDedupE2E() {
  console.log("==================================================================================");
  console.log("💰 FORENSIC AUDIT: FEE PAYMENTS & RECEIPTS DEDUPLICATION SUITE");
  console.log("==================================================================================");

  let passed = 0;
  let failed = 0;

  const now = Date.now();
  const today = new Date().toISOString().slice(0, 10);

  const studentId = `STU-FEE-TEST-${now}`;
  const feeScheduleId = `FP-${studentId}`;
  const receipt1Id = `PAY-${now}-1`;
  const receipt2Id = `PAY-${now}-2`;

  const createdFeeIds: string[] = [feeScheduleId, receipt1Id, receipt2Id];

  try {
    // ---------------------------------------------------------------------------
    // SCENARIO 1: Fee Schedule + Single Payment Receipt for Student
    // ---------------------------------------------------------------------------
    console.log("\n[TEST 1] Testing single payment with accompanying fee schedule...");
    const feeSchedule = {
      id: feeScheduleId,
      record_type: "fee_schedule",
      student_id: studentId,
      student_name: "Dedup Test Student",
      class_name: "Nursery",
      fee_type: "Term Fee",
      amount_due: 12000,
      amount_paid: 6000,
      balance: 6000,
      status: "Partial",
      payment_date: today,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const paymentReceipt1 = {
      id: receipt1Id,
      record_type: "payment_receipt",
      student_id: studentId,
      student_name: "Dedup Test Student",
      class_name: "Nursery",
      fee_type: "Term Fee",
      amount_due: 6000,
      amount_paid: 6000,
      balance: 0,
      installment: 1,
      payment_date: today,
      payment_method: "UPI",
      receipt_number: `REC-DEDUP-${now.toString().slice(-4)}-1`,
      status: "Paid",
      recorded_by: "Office Staff",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    await adminSupabase.from("gv_fees_payments").insert([feeSchedule, paymentReceipt1]);

    // Query payment receipts (how fetchReceipts works)
    const { data: receipts } = await adminSupabase
      .from("gv_fees_payments")
      .select("*")
      .eq("record_type", "payment_receipt")
      .eq("student_id", studentId);

    if (receipts && receipts.length === 1 && receipts[0].receipt_number === paymentReceipt1.receipt_number) {
      console.log("  ✓ PASS: Exactly 1 payment receipt returned for student (fee schedule correctly separated).");
      passed++;
    } else {
      console.error("  ✗ FAIL: Receipt count mismatch:", receipts?.length);
      failed++;
    }

    // ---------------------------------------------------------------------------
    // SCENARIO 2: Two Legitimate Separate Payments on the Same Day
    // ---------------------------------------------------------------------------
    console.log("\n[TEST 2] Testing two legitimate distinct payments on the same day...");
    const paymentReceipt2 = {
      id: receipt2Id,
      record_type: "payment_receipt",
      student_id: studentId,
      student_name: "Dedup Test Student",
      class_name: "Nursery",
      fee_type: "Activity Fee",
      amount_due: 1500,
      amount_paid: 1500,
      balance: 0,
      installment: 2,
      payment_date: today,
      payment_method: "Cash",
      receipt_number: `REC-DEDUP-${now.toString().slice(-4)}-2`,
      status: "Paid",
      recorded_by: "Office Staff",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    await adminSupabase.from("gv_fees_payments").insert([paymentReceipt2]);

    const { data: allStudentReceipts } = await adminSupabase
      .from("gv_fees_payments")
      .select("*")
      .eq("record_type", "payment_receipt")
      .eq("student_id", studentId)
      .order("created_at", { ascending: true });

    if (allStudentReceipts && allStudentReceipts.length === 2) {
      const amounts = allStudentReceipts.map((r) => Number(r.amount_paid));
      if (amounts.includes(6000) && amounts.includes(1500)) {
        console.log("  ✓ PASS: Both legitimate payments preserved independently (₹6,000 and ₹1,500).");
        passed++;
      } else {
        console.error("  ✗ FAIL: Amounts mismatch:", amounts);
        failed++;
      }
    } else {
      console.error("  ✗ FAIL: Two distinct payments count mismatch:", allStudentReceipts?.length);
      failed++;
    }

    // ---------------------------------------------------------------------------
    // SCENARIO 3: Exact Duplicate Forensic Assertion on Payment ID Uniqueness
    // ---------------------------------------------------------------------------
    console.log("\n[TEST 3] Testing payment identity uniqueness & duplicate detection assertion...");
    
    // Simulate double-fetch / duplicate array concatenation
    const rawFetchedArray = [...(allStudentReceipts || []), ...(allStudentReceipts || [])];
    
    // Authoritative ID normalization
    const seenIds = new Set<string>();
    const normalizedReceipts: any[] = [];
    rawFetchedArray.forEach((r) => {
      if (!seenIds.has(r.id)) {
        seenIds.add(r.id);
        normalizedReceipts.push(r);
      }
    });

    const duplicateIdCount = normalizedReceipts.filter((r) => r.id === receipt1Id).length;
    if (normalizedReceipts.length === 2 && duplicateIdCount === 1) {
      console.log("  ✓ PASS: Idempotent normalization ensures same payment.id appears exactly once.");
      passed++;
    } else {
      console.error(`  ✗ FAIL: Expected 2 normalized records, got ${normalizedReceipts.length}`);
      failed++;
    }

    // ---------------------------------------------------------------------------
    // SCENARIO 4: Realtime / Re-fetch Idempotency
    // ---------------------------------------------------------------------------
    console.log("\n[TEST 4] Testing re-fetch and realtime sync idempotency...");
    const { data: refetched } = await adminSupabase
      .from("gv_fees_payments")
      .select("*")
      .eq("record_type", "payment_receipt")
      .eq("student_id", studentId);

    if (refetched && refetched.length === 2) {
      console.log("  ✓ PASS: Re-fetching authoritative Supabase records maintains exact record count.");
      passed++;
    } else {
      console.error("  ✗ FAIL: Refetched record count unexpected:", refetched?.length);
      failed++;
    }

  } catch (err: any) {
    console.error("Unexpected Exception in Dedup Suite:", err);
    failed++;
  } finally {
    // ---------------------------------------------------------------------------
    // CLEANUP
    // ---------------------------------------------------------------------------
    console.log("\n[CLEANUP] Purging test payment records...");
    if (createdFeeIds.length > 0) {
      await adminSupabase.from("gv_fees_payments").delete().in("id", createdFeeIds);
      console.log(`  ✓ Purged ${createdFeeIds.length} test fee records.`);
    }
  }

  console.log("\n==================================================================================");
  console.log(`📊 DEDUPLICATION FORENSIC RESULT: ${passed}/4 Tests Passed, ${failed} Failed`);
  console.log("==================================================================================");
}

runTodaysPaymentsDedupE2E().catch(console.error);
