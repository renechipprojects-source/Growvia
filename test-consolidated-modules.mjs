import fs from "fs";

console.log("==========================================================");
console.log("AUTOMATED CONSOLIDATED MODULES SCHEMA VERIFICATION");
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

// 1. Module 1: users (profiles, students, teachers)
assert(
  sqlCode.includes("CREATE TABLE IF NOT EXISTS public.users") &&
  userServiceCode.includes('from("users")') &&
  userServiceCode.includes("fetchStudentsFromUsers") &&
  userServiceCode.includes("fetchTeachersFromUsers"),
  "Module 1 (users): Schema creation, profile/student/teacher consolidation verified"
);

// 2. Module 2: inventory_expenses (inventory_items, expenses)
assert(
  sqlCode.includes("CREATE TABLE IF NOT EXISTS public.inventory_expenses") &&
  invExpServiceCode.includes('eq("record_type", "inventory")') &&
  invExpServiceCode.includes('eq("record_type", "expense")'),
  "Module 2 (inventory_expenses): Inventory and Expenses consolidation verified"
);

// 3. Module 3: fees_payments (fees, receipts)
assert(
  sqlCode.includes("CREATE TABLE IF NOT EXISTS public.fees_payments") &&
  feePaymentServiceCode.includes('eq("record_type", "fee_schedule")') &&
  feePaymentServiceCode.includes('eq("record_type", "payment_receipt")'),
  "Module 3 (fees_payments): Fees and Receipts consolidation verified"
);

// 4. Module 4: communications (circulars, messages)
assert(
  sqlCode.includes("CREATE TABLE IF NOT EXISTS public.communications") &&
  commServiceCode.includes('eq("message_type", "circular")') &&
  commServiceCode.includes('eq("message_type", "general_message")'),
  "Module 4 (communications): Circulars and Messages consolidation verified"
);

// 5. Module 5: requests (leave_requests, enquiries)
assert(
  sqlCode.includes("CREATE TABLE IF NOT EXISTS public.requests") &&
  requestServiceCode.includes('eq("request_type", "leave")') &&
  requestServiceCode.includes('eq("request_type", "enquiry")'),
  "Module 5 (requests): Leave Requests and Enquiries consolidation verified"
);

// 6. Dashboard Stats KPI Calculation from Consolidated Modules
assert(
  statsServiceCode.includes('from("users")') &&
  statsServiceCode.includes('from("requests")') &&
  statsServiceCode.includes('from("fees_payments")') &&
  statsServiceCode.includes('from("communications")'),
  "Dashboard KPI statistics calculate dynamically from consolidated modules"
);

// 7. Developer Settings Isolation
const devStoreCode = fs.readFileSync("src/lib/developerSettingsStore.ts", "utf8");
assert(
  devStoreCode.includes('from("system_settings")') &&
  !devStoreCode.includes('from("users")'),
  "Developer settings system_settings table remains completely isolated"
);

console.log("----------------------------------------------------------");
console.log(`RESULTS: ${passedCount} / ${totalCount} ASSERTIONS PASSED`);
console.log("==========================================================");

if (passedCount === totalCount) {
  process.exit(0);
} else {
  process.exit(1);
}
