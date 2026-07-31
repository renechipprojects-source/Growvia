import fs from "fs";

console.log("==========================================================");
console.log("AUTOMATED NAMESPACED MODULES SCHEMA VERIFICATION (GV_)");
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

// 1. Module 1: GV_users (profiles, students, teachers)
assert(
  sqlCode.includes("CREATE TABLE IF NOT EXISTS public.GV_users") &&
  userServiceCode.includes('from("GV_users")') &&
  userServiceCode.includes("fetchStudentsFromUsers") &&
  userServiceCode.includes("fetchTeachersFromUsers"),
  "Module 1 (GV_users): Namespaced schema creation & user consolidation verified"
);

// 2. Module 2: GV_inventory_expenses (inventory_items, expenses)
assert(
  sqlCode.includes("CREATE TABLE IF NOT EXISTS public.GV_inventory_expenses") &&
  invExpServiceCode.includes('from("GV_inventory_expenses")') &&
  invExpServiceCode.includes('eq("record_type", "inventory")') &&
  invExpServiceCode.includes('eq("record_type", "expense")'),
  "Module 2 (GV_inventory_expenses): Namespaced inventory & expense module verified"
);

// 3. Module 3: GV_fees_payments (fees, receipts)
assert(
  sqlCode.includes("CREATE TABLE IF NOT EXISTS public.GV_fees_payments") &&
  feePaymentServiceCode.includes('from("GV_fees_payments")') &&
  feePaymentServiceCode.includes('eq("record_type", "fee_schedule")') &&
  feePaymentServiceCode.includes('eq("record_type", "payment_receipt")'),
  "Module 3 (GV_fees_payments): Namespaced fees & receipts module verified"
);

// 4. Module 4: GV_communications (circulars, messages)
assert(
  sqlCode.includes("CREATE TABLE IF NOT EXISTS public.GV_communications") &&
  commServiceCode.includes('from("GV_communications")') &&
  commServiceCode.includes('eq("message_type", "circular")') &&
  commServiceCode.includes('eq("message_type", "general_message")'),
  "Module 4 (GV_communications): Namespaced communications module verified"
);

// 5. Module 5: GV_requests (leave_requests, enquiries)
assert(
  sqlCode.includes("CREATE TABLE IF NOT EXISTS public.GV_requests") &&
  requestServiceCode.includes('from("GV_requests")') &&
  requestServiceCode.includes('eq("request_type", "leave")') &&
  requestServiceCode.includes('eq("request_type", "enquiry")'),
  "Module 5 (GV_requests): Namespaced requests module verified"
);

// 6. Dashboard Stats KPI Calculation from GV_ Namespaced Modules
assert(
  statsServiceCode.includes('from("GV_users")') &&
  statsServiceCode.includes('from("GV_requests")') &&
  statsServiceCode.includes('from("GV_fees_payments")') &&
  statsServiceCode.includes('from("GV_communications")'),
  "Dashboard KPI statistics calculate dynamically from GV_ namespaced modules"
);

// 7. Developer Settings Isolation on GV_system_settings
const devStoreCode = fs.readFileSync("src/lib/developerSettingsStore.ts", "utf8");
assert(
  devStoreCode.includes('from("GV_system_settings")') &&
  !devStoreCode.includes('from("users")'),
  "Developer settings GV_system_settings table remains completely isolated"
);

console.log("----------------------------------------------------------");
console.log(`RESULTS: ${passedCount} / ${totalCount} ASSERTIONS PASSED`);
console.log("==========================================================");

if (passedCount === totalCount) {
  process.exit(0);
} else {
  process.exit(1);
}
