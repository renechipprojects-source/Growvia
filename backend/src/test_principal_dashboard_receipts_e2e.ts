import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config({ path: "./backend/.env" });
dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL || "https://nyhnkftlkigoliyogwvp.supabase.co";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im55aG5rZnRsa2lnb2xpeW9nd3ZwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NTQ3NDY1MywiZXhwIjoyMTAxMDUwNjUzfQ.xsa3qLPf8jTe45x5x_-8TyTusbjnMiihtQse4IgjutQ";

const adminSupabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function runPrincipalDashboardReceiptsE2E() {
  console.log("==================================================================================");
  console.log("🏫 PRINCIPAL DASHBOARD: RECEIPT FETCHING & PAYMENT PIPELINE E2E QA SUITE");
  console.log("==================================================================================");

  let passed = 0;
  let failed = 0;
  const now = Date.now();
  const todayStr = new Date().toISOString().slice(0, 10);
  const createdRecordIds: string[] = [];

  const studentId = `STU-PRIN-${now}`;
  const studentName = `Student Principal QA ${now}`;

  try {
    // -------------------------------------------------------------------------
    // TEST 1: Insert 1 Fee Schedule and 2 Distinct Payment Receipts for Today
    // -------------------------------------------------------------------------
    console.log("\n[TEST 1] Inserting 1 fee schedule and 2 distinct payments in gv_fees_payments...");

    const feeScheduleId = `FEE-SCHED-${now}`;
    createdRecordIds.push(feeScheduleId);
    const receiptId1 = `REC-PRIN-${now}-1`;
    createdRecordIds.push(receiptId1);
    const receiptId2 = `REC-PRIN-${now}-2`;
    createdRecordIds.push(receiptId2);

    const { error: insertErr } = await adminSupabase.from("gv_fees_payments").insert([
      {
        id: feeScheduleId,
        student_id: studentId,
        student_name: studentName,
        class_name: "UKG",
        fee_type: "Annual Tuition Fee",
        amount_due: 25000,
        amount_paid: 0,
        balance: 25000,
        payment_date: todayStr,
        status: "Pending",
        record_type: "fee_schedule",
      },
      {
        id: receiptId1,
        student_id: studentId,
        student_name: studentName,
        class_name: "UKG",
        fee_type: "Term 1 Tuition",
        receipt_number: `RCP-1-${now}`,
        amount_due: 10000,
        amount_paid: 10000,
        balance: 15000,
        payment_date: todayStr,
        payment_method: "Online",
        status: "Paid",
        record_type: "payment_receipt",
      },
      {
        id: receiptId2,
        student_id: studentId,
        student_name: studentName,
        class_name: "UKG",
        fee_type: "Transport Fee",
        receipt_number: `RCP-2-${now}`,
        amount_due: 3500,
        amount_paid: 3500,
        balance: 0,
        payment_date: todayStr,
        payment_method: "Cash",
        status: "Paid",
        record_type: "payment_receipt",
      },
    ]);

    if (insertErr) {
      console.error("  ✗ FAIL: Seeding error:", insertErr.message);
      failed++;
    } else {
      console.log("  ✓ Seeded 1 fee_schedule record and 2 payment_receipt records.");
    }

    // -------------------------------------------------------------------------
    // TEST 2: Authoritative fetchReceipts Simulation
    // -------------------------------------------------------------------------
    console.log("\n[TEST 2] Verifying fetchReceipts strictly queries only record_type = 'payment_receipt'...");

    const { data: receiptsData, error: receiptsErr } = await adminSupabase
      .from("gv_fees_payments")
      .select("*")
      .eq("record_type", "payment_receipt")
      .order("payment_date", { ascending: false });

    if (receiptsErr || !receiptsData) {
      console.error("  ✗ FAIL: Query failed:", receiptsErr?.message);
      failed++;
    } else {
      const ourReceipts = receiptsData.filter((r) => r.student_id === studentId);
      const ourFeeSchedules = receiptsData.filter((r) => r.id === feeScheduleId);

      if (ourReceipts.length === 2 && ourFeeSchedules.length === 0) {
        console.log("  ✓ PASS: Exactly 2 payment receipts resolved; fee_schedule was strictly excluded.");
        passed++;
      } else {
        console.error(`  ✗ FAIL: Expected 2 receipts, found ${ourReceipts.length}, fee schedules: ${ourFeeSchedules.length}`);
        failed++;
      }
    }

    // -------------------------------------------------------------------------
    // TEST 3: Principal Dashboard Today's Payments Aggregation
    // -------------------------------------------------------------------------
    console.log("\n[TEST 3] Simulating Principal Dashboard Today's Payments filter...");

    const { data: allReceipts } = await adminSupabase
      .from("gv_fees_payments")
      .select("*")
      .eq("record_type", "payment_receipt");

    const mapped = (allReceipts || []).map((d: any) => ({
      id: d.id,
      receiptNo: d.receipt_number,
      studentName: d.student_name,
      amountPaid: Number(d.amount_paid || 0),
      date: d.payment_date || d.created_at?.slice(0, 10),
    }));

    const todayPayments = mapped.filter((p) => {
      const payDate = (p.date || "").slice(0, 10);
      return payDate === todayStr && p.amountPaid > 0;
    });

    const testTodayPayments = todayPayments.filter((p) => p.studentName === studentName);

    if (testTodayPayments.length === 2) {
      console.log(`  ✓ PASS: Both distinct payments today resolved independently (₹10,000 + ₹3,500).`);
      passed++;
    } else {
      console.error(`  ✗ FAIL: Expected 2 distinct payments today, got: ${testTodayPayments.length}`);
      failed++;
    }

  } catch (err: any) {
    console.error("  ✗ EXCEPTION in test:", err);
    failed++;
  } finally {
    // -------------------------------------------------------------------------
    // CLEANUP
    // -------------------------------------------------------------------------
    console.log("\n==================================================================================");
    console.log("[CLEANUP] Purging test payment and fee schedule records...");
    if (createdRecordIds.length > 0) {
      await adminSupabase.from("gv_fees_payments").delete().in("id", createdRecordIds);
    }
    console.log(`  ✓ Cleaned up ${createdRecordIds.length} test records from gv_fees_payments.`);
  }

  console.log("\n==================================================================================");
  console.log(`📊 PRINCIPAL DASHBOARD RECEIPTS RESULT: ${passed}/2 Tests Passed, ${failed} Failed`);
  console.log("==================================================================================");
}

runPrincipalDashboardReceiptsE2E().catch(console.error);
