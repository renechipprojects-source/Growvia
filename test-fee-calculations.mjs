function recalculateFeeLedger(ledger) {
  const originalFee = Number(ledger.originalFee ?? ledger.amount ?? 8500);
  const discountAmount = Math.max(0, Number(ledger.discountAmount ?? 0));
  const finalFee = Math.max(0, originalFee - discountAmount);

  const payments = Array.isArray(ledger.payments) ? ledger.payments : [];
  const paid = payments.reduce((acc, p) => acc + Number(p.amount || 0), 0);
  const remainingAmount = Math.max(0, finalFee - paid);

  const installmentsUsed = payments.length;
  const status = remainingAmount === 0 && finalFee > 0 ? "Paid" : paid > 0 ? "Partially Paid" : "Unpaid";

  return {
    originalFee,
    discountAmount,
    finalFee,
    paid,
    remainingAmount,
    installmentsUsed,
    status,
    payments,
  };
}

console.log("=== FEE COLLECTION REFACTORING AUDIT ===\n");

// Test Case 1: Total Fee ₹10,000, Payment 1: ₹5,000
const test1 = recalculateFeeLedger({
  originalFee: 10000,
  discountAmount: 0,
  payments: [
    { amount: 5000, date: "2026-07-01", method: "Cash" }
  ]
});

console.log("Example 1 (Payment 1: ₹5,000 of ₹10,000):");
console.log(`  - Total Fee: ₹${test1.finalFee.toLocaleString()}`);
console.log(`  - Paid: ₹${test1.paid.toLocaleString()}`);
console.log(`  - Remaining: ₹${test1.remainingAmount.toLocaleString()}`);
console.log(`  - Installments Used: ${test1.installmentsUsed}`);
console.log(`  - Status: ${test1.status}`);
if (test1.finalFee === 10000 && test1.paid === 5000 && test1.remainingAmount === 5000 && test1.installmentsUsed === 1 && test1.status === "Partially Paid") {
  console.log("  ✅ PASS: Example 1 matches expected summary values\n");
} else {
  console.error("  ❌ FAIL: Example 1 mismatch\n");
}

// Test Case 2: Payments ₹5,000, ₹2,500, ₹2,500
const test2 = recalculateFeeLedger({
  originalFee: 10000,
  discountAmount: 0,
  payments: [
    { amount: 5000, date: "2026-07-01", method: "Cash" },
    { amount: 2500, date: "2026-07-10", method: "UPI" },
    { amount: 2500, date: "2026-07-20", method: "Bank Transfer" }
  ]
});

console.log("Example 2 (Three Payments totaling ₹10,000):");
console.log(`  - Total Fee: ₹${test2.finalFee.toLocaleString()}`);
console.log(`  - Paid: ₹${test2.paid.toLocaleString()}`);
console.log(`  - Remaining: ₹${test2.remainingAmount.toLocaleString()}`);
console.log(`  - Installments Used: ${test2.installmentsUsed}`);
console.log(`  - Status: ${test2.status}`);
if (test2.finalFee === 10000 && test2.paid === 10000 && test2.remainingAmount === 0 && test2.installmentsUsed === 3 && test2.status === "Paid") {
  console.log("  ✅ PASS: Example 2 matches expected summary values\n");
} else {
  console.error("  ❌ FAIL: Example 2 mismatch\n");
}

// Test Case 3: Payments ₹4,000, ₹2,000, ₹2,000
const test3 = recalculateFeeLedger({
  originalFee: 10000,
  discountAmount: 0,
  payments: [
    { amount: 4000, date: "2026-07-01", method: "Cash" },
    { amount: 2000, date: "2026-07-10", method: "UPI" },
    { amount: 2000, date: "2026-07-20", method: "UPI" }
  ]
});

console.log("Example 3 (Three Payments totaling ₹8,000 of ₹10,000):");
console.log(`  - Total Fee: ₹${test3.finalFee.toLocaleString()}`);
console.log(`  - Paid: ₹${test3.paid.toLocaleString()}`);
console.log(`  - Remaining: ₹${test3.remainingAmount.toLocaleString()}`);
console.log(`  - Installments Used: ${test3.installmentsUsed}`);
console.log(`  - Status: ${test3.status}`);
if (test3.finalFee === 10000 && test3.paid === 8000 && test3.remainingAmount === 2000 && test3.installmentsUsed === 3 && test3.status === "Partially Paid") {
  console.log("  ✅ PASS: Example 3 matches expected summary values\n");
} else {
  console.error("  ❌ FAIL: Example 3 mismatch\n");
}

console.log("=== FEE COLLECTION REFACTORING AUDIT COMPLETE ===");
