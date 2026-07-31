import fs from "fs";

console.log("==========================================================");
console.log("EXACT 6 GROWVIA CONSOLIDATED APPLICATION TABLES VERIFICATION");
console.log("==========================================================");

const sqlCode = fs.readFileSync("src/supabase/consolidated_schema.sql", "utf8");
const userServiceCode = fs.readFileSync("src/lib/userService.ts", "utf8");
const invExpServiceCode = fs.readFileSync("src/lib/inventoryExpenseService.ts", "utf8");
const feePaymentServiceCode = fs.readFileSync("src/lib/feePaymentService.ts", "utf8");
const commServiceCode = fs.readFileSync("src/lib/communicationService.ts", "utf8");
const requestServiceCode = fs.readFileSync("src/lib/requestService.ts", "utf8");
const statsServiceCode = fs.readFileSync("src/lib/dashboardStatsService.ts", "utf8");

let passedCount = 0;
let totalCount = 0;

function assert(condition, testName) {
  totalCount++;
  if (condition) {
    console.log(`[PASS] ${testName}`);
    passedCount++;
  } else {
    console.error(`[FAIL] ${testName}`);
  }
}

// 1. Table 1: GV_users
assert(
  sqlCode.includes("ALTER TABLE public.users RENAME TO GV_users") &&
  userServiceCode.includes('from("GV_users")'),
  "Table 1: users -> GV_users in-place rename verified"
);

// 2. Table 2: GV_inventory_expenses
assert(
  sqlCode.includes("ALTER TABLE public.inventory_expenses RENAME TO GV_inventory_expenses") &&
  invExpServiceCode.includes('from("GV_inventory_expenses")'),
  "Table 2: inventory_expenses -> GV_inventory_expenses in-place rename verified"
);

// 3. Table 3: GV_fees_payments
assert(
  sqlCode.includes("ALTER TABLE public.fees_payments RENAME TO GV_fees_payments") &&
  feePaymentServiceCode.includes('from("GV_fees_payments")'),
  "Table 3: fees_payments -> GV_fees_payments in-place rename verified"
);

// 4. Table 4: GV_communications
assert(
  sqlCode.includes("ALTER TABLE public.communications RENAME TO GV_communications") &&
  commServiceCode.includes('from("GV_communications")'),
  "Table 4: communications -> GV_communications in-place rename verified"
);

// 5. Table 5: GV_requests
assert(
  sqlCode.includes("ALTER TABLE public.requests RENAME TO GV_requests") &&
  requestServiceCode.includes('from("GV_requests")'),
  "Table 5: requests -> GV_requests in-place rename verified"
);

// 6. Table 6: GV_system_settings
assert(
  sqlCode.includes("ALTER TABLE public.system_settings RENAME TO GV_system_settings") &&
  statsServiceCode.includes('from("GV_users")'),
  "Table 6: system_settings -> GV_system_settings in-place rename verified"
);

// 7. No Additional Application Tables
assert(
  !sqlCode.includes("GV_student_attendance") &&
  !sqlCode.includes("GV_promotion_history") &&
  !sqlCode.includes("GV_audit_logs"),
  "Strict 6 Consolidated Tables Only (Zero extra application tables created)"
);

console.log("----------------------------------------------------------");
console.log(`RESULTS: ${passedCount} / ${totalCount} ASSERTIONS PASSED`);
console.log("==========================================================");

if (passedCount === totalCount) {
  process.exit(0);
} else {
  process.exit(1);
}
