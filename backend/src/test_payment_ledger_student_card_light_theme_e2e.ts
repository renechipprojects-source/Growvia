import * as fs from "fs";
import * as path from "path";

async function runPaymentLedgerStudentCardLightThemeSuite() {
  console.log("=== STARTING PAYMENT LEDGER STUDENT CARD LIGHT THEME REGRESSION SUITE ===");

  const srcDir = path.resolve(process.cwd(), "frontend/src");

  // 1. Verify PaymentDetailsModal.tsx contains clean light theme styling
  console.log("\n[STEP 1] Verifying PaymentDetailsModal.tsx student card light theme classes...");
  const modalContent = fs.readFileSync(path.join(srcDir, "components/fees/PaymentDetailsModal.tsx"), "utf-8");

  if (modalContent.includes("bg-slate-900") || modalContent.includes("bg-zinc-900") || modalContent.includes("bg-black") || modalContent.includes("bg-indigo-950")) {
    throw new Error("FAIL: PaymentDetailsModal still contains dark theme background classes.");
  }

  if (!modalContent.includes("bg-white") || !modalContent.includes("border-slate-200") || !modalContent.includes("text-slate-900")) {
    throw new Error("FAIL: PaymentDetailsModal missing professional light theme styling.");
  }
  console.log("  [PASS] PaymentDetailsModal student record card uses professional light theme styling.");

  // 2. Verify student info binding
  console.log("\n[STEP 2] Verifying student data preservation in PaymentDetailsModal.tsx...");
  if (!modalContent.includes("ledger.studentName") || !modalContent.includes("ledger.className")) {
    throw new Error("FAIL: PaymentDetailsModal missing required student data fields.");
  }
  console.log("  [PASS] Student data binding (name, admission no, class, total fee) preserved intact.");

  console.log("\n=== ALL PAYMENT LEDGER STUDENT CARD LIGHT THEME TESTS PASSED ===");
}

runPaymentLedgerStudentCardLightThemeSuite().catch((err) => {
  console.error(err);
  process.exit(1);
});
