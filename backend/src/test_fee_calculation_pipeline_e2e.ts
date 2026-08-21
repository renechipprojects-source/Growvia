import { recalculateFeeLedger, type FeeLedgerItem } from "../../frontend/src/lib/supabaseService";

async function runFeeCalculationPipelineVerification() {
  console.log("=== STARTING FEE MANAGEMENT CALCULATION & OVERPAYMENT PIPELINE VERIFICATION ===");

  // Test Case 1: Normal Full Payment (Fee = 12000, Paid = 12000)
  console.log("\n[TEST 1] Testing Normal Full Payment (Fee ₹12,000, Paid ₹12,000)...");
  const case1 = recalculateFeeLedger({
    originalFee: 12000,
    discountAmount: 0,
    paid: 12000,
    payments: [{ amount: 12000, method: "UPI", date: "2026-08-20" }],
  });

  console.log(`  - Final Fee: ₹${case1.finalFee}`);
  console.log(`  - Paid: ₹${case1.paid}`);
  console.log(`  - Remaining Balance: ₹${case1.remainingAmount}`);
  console.log(`  - Advance Credit: ₹${case1.advanceAmount}`);
  console.log(`  - Status: ${case1.status}`);

  if (case1.remainingAmount !== 0 || case1.advanceAmount !== 0 || case1.status !== "Paid") {
    throw new Error("FAIL: Test Case 1 calculation invalid!");
  }
  console.log("  [PASS] Normal Full Payment calculation verified.");

  // Test Case 2: Partial Payment (Fee = 12000, Paid = 6000)
  console.log("\n[TEST 2] Testing Partial Payment (Fee ₹12,000, Paid ₹6,000)...");
  const case2 = recalculateFeeLedger({
    originalFee: 12000,
    discountAmount: 0,
    paid: 6000,
    payments: [{ amount: 6000, method: "Cash", date: "2026-08-20" }],
  });

  console.log(`  - Final Fee: ₹${case2.finalFee}`);
  console.log(`  - Paid: ₹${case2.paid}`);
  console.log(`  - Remaining Balance: ₹${case2.remainingAmount}`);
  console.log(`  - Status: ${case2.status}`);

  if (case2.remainingAmount !== 6000 || case2.status !== "Partial") {
    throw new Error("FAIL: Test Case 2 calculation invalid!");
  }
  console.log("  [PASS] Partial Payment calculation verified.");

  // Test Case 3: Overpayment / Advance Payment (Fee = 12000, Paid = 16000)
  console.log("\n[TEST 3] Testing Overpayment / Advance Payment (Fee ₹12,000, Paid ₹16,000)...");
  const case3 = recalculateFeeLedger({
    originalFee: 12000,
    discountAmount: 0,
    paid: 16000,
    payments: [
      { amount: 4000, method: "UPI", date: "2026-01-10" },
      { amount: 4000, method: "UPI", date: "2026-04-10" },
      { amount: 4000, method: "UPI", date: "2026-07-10" },
      { amount: 4000, method: "UPI", date: "2026-08-10" },
    ],
  });

  console.log(`  - Final Fee: ₹${case3.finalFee}`);
  console.log(`  - Total Paid: ₹${case3.paid}`);
  console.log(`  - Remaining Balance Due: ₹${case3.remainingAmount}`);
  console.log(`  - Advance / Excess Credit: ₹${case3.advanceAmount}`);
  console.log(`  - Status: ${case3.status}`);

  if (case3.remainingAmount !== 0) {
    throw new Error("FAIL: Remaining balance for overpayment must be 0 (cannot be negative)!");
  }
  if (case3.advanceAmount !== 4000) {
    throw new Error(`FAIL: Advance credit must be ₹4,000, but got ₹${case3.advanceAmount}`);
  }
  if (case3.status !== "Paid") {
    throw new Error("FAIL: Status for overpaid ledger must be Paid!");
  }
  console.log("  [PASS] Overpayment / Advance Payment calculation verified.");

  // Test Case 4: Discounted Fee (Original = 12000, Discount = 2000, Paid = 10000)
  console.log("\n[TEST 4] Testing Discounted Fee (Original ₹12,000, Discount ₹2,000, Paid ₹10,000)...");
  const case4 = recalculateFeeLedger({
    originalFee: 12000,
    discountAmount: 2000,
    paid: 10000,
    payments: [{ amount: 10000, method: "Cheque", date: "2026-08-20" }],
  });

  console.log(`  - Original Fee: ₹${case4.originalFee}`);
  console.log(`  - Discount: ₹${case4.discountAmount}`);
  console.log(`  - Final Payable Fee: ₹${case4.finalFee}`);
  console.log(`  - Paid: ₹${case4.paid}`);
  console.log(`  - Remaining Balance: ₹${case4.remainingAmount}`);
  console.log(`  - Status: ${case4.status}`);

  if (case4.finalFee !== 10000 || case4.remainingAmount !== 0 || case4.status !== "Paid") {
    throw new Error("FAIL: Test Case 4 calculation invalid!");
  }
  console.log("  [PASS] Discounted Fee calculation verified.");

  console.log("\n=== ALL FEE CALCULATION & OVERPAYMENT TESTS PASSED SUCCESSFULLY ===");
}

runFeeCalculationPipelineVerification().catch((err) => {
  console.error(err);
  process.exit(1);
});
