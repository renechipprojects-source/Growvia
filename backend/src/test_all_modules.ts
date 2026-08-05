import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://nyhnkftlkigoliyogwvp.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im55aG5rZnRsa2lnb2xpeW9nd3ZwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU0NzQ2NTMsImV4cCI6MjEwMTA1MDY1M30.KxjH42Wg0IVLfXLLJSbBLvcZ098hvJRUHkDu10NJfB4";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testAllModules() {
  console.log("==========================================");
  console.log("🚀 GROWVIA ERP FULL SYSTEM QA TEST SUITE");
  console.log("==========================================");

  let passed = 0;
  let failed = 0;

  // 1. Audit Users Table (Students, Teachers, Parents, Admin)
  const { data: users, error: usersErr } = await supabase.from("gv_users").select("*");
  if (!usersErr && users) {
    console.log(`[PASS] Users Table: ${users.length} total rows`);
    const students = users.filter((u) => u.role?.toLowerCase().includes("student"));
    const teachers = users.filter((u) => u.role?.toLowerCase().includes("teacher"));
    const parents = users.filter((u) => u.role?.toLowerCase().includes("parent"));
    console.log(`       └─ Students: ${students.length}, Teachers: ${teachers.length}, Parents: ${parents.length}`);
    passed++;
  } else {
    console.error(`[FAIL] Users Table Error:`, usersErr?.message);
    failed++;
  }

  // 2. Audit Requests Table (Enquiries, Leaves, Visits, Class Assignments)
  const { data: requests, error: reqErr } = await supabase.from("gv_requests").select("*");
  if (!reqErr && requests) {
    console.log(`[PASS] Requests Table: ${requests.length} total rows`);
    passed++;
  } else {
    console.error(`[FAIL] Requests Table Error:`, reqErr?.message);
    failed++;
  }

  // 3. Audit Communications Table (Circulars, Notices, Notifications)
  const { data: comms, error: commsErr } = await supabase.from("gv_communications").select("*");
  if (!commsErr && comms) {
    console.log(`[PASS] Communications Table: ${comms.length} total circulars/notifications`);
    passed++;
  } else {
    console.error(`[FAIL] Communications Table Error:`, commsErr?.message);
    failed++;
  }

  // 4. Audit Fees & Payments Table (Fee Receipts, Payments)
  const { data: fees, error: feesErr } = await supabase.from("gv_fees_payments").select("*");
  if (!feesErr && fees) {
    console.log(`[PASS] Fees Payments Table: ${fees.length} total fee transactions`);
    passed++;
  } else {
    console.error(`[FAIL] Fees Payments Table Error:`, feesErr?.message);
    failed++;
  }

  // 5. Audit Inventory & Expenses Table (Expenses, Transport Routes)
  const { data: inv, error: invErr } = await supabase.from("gv_inventory_expenses").select("*");
  if (!invErr && inv) {
    console.log(`[PASS] Inventory & Expenses Table: ${inv.length} total items`);
    passed++;
  } else {
    console.error(`[FAIL] Inventory Table Error:`, invErr?.message);
    failed++;
  }

  // 6. Audit System Settings Table (Branding & Developer Settings)
  const { data: settings, error: setErr } = await supabase.from("gv_system_settings").select("*");
  if (!setErr && settings) {
    console.log(`[PASS] System Settings Table: ${settings.length} branding row`);
    passed++;
  } else {
    console.error(`[FAIL] System Settings Error:`, setErr?.message);
    failed++;
  }

  console.log("==========================================");
  console.log(`SUMMARY: ${passed} Passed, ${failed} Failed`);
  console.log("==========================================");
}

testAllModules().catch(console.error);
