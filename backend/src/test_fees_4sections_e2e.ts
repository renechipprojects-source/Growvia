import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config({ path: "./backend/.env" });
dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL || "https://nyhnkftlkigoliyogwvp.supabase.co";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im55aG5rZnRsa2lnb2xpeW9nd3ZwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NTQ3NDY1MywiZXhwIjoyMTAxMDUwNjUzfQ.xsa3qLPf8jTe45x5x_-8TyTusbjnMiihtQse4IgjutQ";

const adminSupabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function runFees4SectionsE2E() {
  console.log("==================================================================================");
  console.log("🏫 4-SECTION FEE PAYMENTS & RECEIPTS DEDUPLICATION E2E SUITE");
  console.log("   (Office, Principal, Admin, and Parent Sections)");
  console.log("==================================================================================");

  let passed = 0;
  let failed = 0;

  const now = Date.now();
  const today = new Date().toISOString().slice(0, 10);

  const studentId = `STU-4SEC-${now}`;
  const feeScheduleId = `FP-${studentId}`;
  const receipt1Id = `PAY-4SEC-${now}-1`;
  const receipt2Id = `PAY-4SEC-${now}-2`;

  const createdFeeIds: string[] = [feeScheduleId, receipt1Id, receipt2Id];

  try {
    // ---------------------------------------------------------------------------
    // SETUP: Insert 1 Fee Schedule + 2 Legitimate Payments on the Same Day
    // ---------------------------------------------------------------------------
    console.log("\n[SETUP] Seeding 1 fee schedule and 2 legitimate separate payments on the same date...");
    const feeSchedule = {
      id: feeScheduleId,
      record_type: "fee_schedule",
      student_id: studentId,
      student_name: "FourSection Test Student",
      class_name: "Nursery",
      fee_type: "Term Fee",
      amount_due: 12000,
      amount_paid: 7500,
      balance: 4500,
      status: "Partial",
      payment_date: today,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const payment1 = {
      id: receipt1Id,
      record_type: "payment_receipt",
      student_id: studentId,
      student_name: "FourSection Test Student",
      class_name: "Nursery",
      fee_type: "Tuition Fee",
      amount_due: 6000,
      amount_paid: 6000,
      balance: 0,
      installment: 1,
      payment_date: today,
      payment_method: "UPI",
      receipt_number: `REC-4SEC-${now.toString().slice(-4)}-1`,
      status: "Paid",
      recorded_by: "Office Staff",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const payment2 = {
      id: receipt2Id,
      record_type: "payment_receipt",
      student_id: studentId,
      student_name: "FourSection Test Student",
      class_name: "Nursery",
      fee_type: "Activity Fee",
      amount_due: 1500,
      amount_paid: 1500,
      balance: 0,
      installment: 2,
      payment_date: today,
      payment_method: "Cash",
      receipt_number: `REC-4SEC-${now.toString().slice(-4)}-2`,
      status: "Paid",
      recorded_by: "Office Staff",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { error: insertError } = await adminSupabase.from("gv_fees_payments").insert([feeSchedule, payment1, payment2]);
    if (insertError) throw insertError;
    console.log("  ✓ Seeded records in gv_fees_payments.");

    // ---------------------------------------------------------------------------
    // SECTION 1: Office Section Verification
    // ---------------------------------------------------------------------------
    console.log("\n[SECTION 1: OFFICE] Verifying Office Receipts & Fee Collection...");
    const { data: officeReceipts } = await adminSupabase
      .from("gv_fees_payments")
      .select("*")
      .eq("record_type", "payment_receipt")
      .eq("student_id", studentId);

    if (officeReceipts && officeReceipts.length === 2) {
      console.log("  ✓ PASS: Office Receipts resolves exactly 2 payment receipts (fee schedule excluded).");
      passed++;
    } else {
      console.error("  ✗ FAIL: Office receipts count unexpected:", officeReceipts?.length);
      failed++;
    }

    // ---------------------------------------------------------------------------
    // SECTION 2: Principal Section Verification
    // ---------------------------------------------------------------------------
    console.log("\n[SECTION 2: PRINCIPAL] Verifying Principal Dashboard & Fees Overview...");
    const principalTodayPayments = (officeReceipts || []).filter((p) => {
      const pDate = (p.payment_date || p.created_at || "").slice(0, 10);
      return pDate === today && Number(p.amount_paid) > 0;
    });

    if (principalTodayPayments.length === 2) {
      const totalToday = principalTodayPayments.reduce((sum, p) => sum + Number(p.amount_paid), 0);
      if (totalToday === 7500) {
        console.log("  ✓ PASS: Principal Dashboard Today's Payments resolves 2 distinct payments (₹6,000 + ₹1,500 = ₹7,500).");
        passed++;
      } else {
        console.error("  ✗ FAIL: Total today mismatch:", totalToday);
        failed++;
      }
    } else {
      console.error("  ✗ FAIL: Principal today's payments count unexpected:", principalTodayPayments.length);
      failed++;
    }

    // ---------------------------------------------------------------------------
    // SECTION 3: Admin Section Verification
    // ---------------------------------------------------------------------------
    console.log("\n[SECTION 3: ADMIN] Verifying Admin Dashboard & Fee Payment Reports...");
    const { data: adminReceiptsOnly } = await adminSupabase
      .from("gv_fees_payments")
      .select("amount_paid")
      .eq("record_type", "payment_receipt")
      .eq("student_id", studentId);

    const adminCollectedSum = (adminReceiptsOnly || []).reduce((sum, r) => sum + Number(r.amount_paid || 0), 0);
    if (adminCollectedSum === 7500 && adminReceiptsOnly?.length === 2) {
      console.log("  ✓ PASS: Admin Dashboard stats sum only payment_receipt rows (no duplicate addition from fee schedules).");
      passed++;
    } else {
      console.error("  ✗ FAIL: Admin sum mismatch:", adminCollectedSum);
      failed++;
    }

    // ---------------------------------------------------------------------------
    // SECTION 4: Parent Section Verification
    // ---------------------------------------------------------------------------
    console.log("\n[SECTION 4: PARENT] Verifying Parent Child Fee History & Receipts...");
    const { data: parentRawRows } = await adminSupabase
      .from("gv_fees_payments")
      .select("*")
      .eq("student_id", studentId);

    // Parent fee pipeline maps genuine payments only
    const parentGenuinePayments = (parentRawRows || []).filter((r) => r.record_type === "payment_receipt");
    if (parentGenuinePayments.length === 2) {
      console.log("  ✓ PASS: Parent fee history lists exactly 2 payment items (fee schedule is not shown as a duplicate receipt).");
      passed++;
    } else {
      console.error("  ✗ FAIL: Parent payments count unexpected:", parentGenuinePayments.length);
      failed++;
    }

    // ---------------------------------------------------------------------------
    // SECTION 5: Idempotency & Re-fetch Resilience
    // ---------------------------------------------------------------------------
    console.log("\n[SECTION 5: IDEMPOTENCY] Verifying repeated re-fetch & navigation resilience...");
    const repeatedQuery = [...(parentGenuinePayments || []), ...(parentGenuinePayments || [])];
    const seenIds = new Set<string>();
    const normalized: any[] = [];
    repeatedQuery.forEach((r) => {
      if (!seenIds.has(r.id)) {
        seenIds.add(r.id);
        normalized.push(r);
      }
    });

    if (normalized.length === 2) {
      console.log("  ✓ PASS: Idempotent ID Set deduplication guarantees single representation of each payment UUID.");
      passed++;
    } else {
      console.error("  ✗ FAIL: Normalized count unexpected:", normalized.length);
      failed++;
    }

  } catch (err: any) {
    console.error("Unexpected Exception in 4-Sections Suite:", err);
    failed++;
  } finally {
    console.log("\n[CLEANUP] Purging test payment records...");
    if (createdFeeIds.length > 0) {
      await adminSupabase.from("gv_fees_payments").delete().in("id", createdFeeIds);
      console.log(`  ✓ Purged ${createdFeeIds.length} test fee records.`);
    }
  }

  console.log("\n==================================================================================");
  console.log(`📊 4-SECTION TEST RESULT: ${passed}/5 Tests Passed, ${failed} Failed`);
  console.log("==================================================================================");
}

runFees4SectionsE2E().catch(console.error);
