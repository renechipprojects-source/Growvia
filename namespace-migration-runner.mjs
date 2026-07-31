import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://nyhnkftlkigoliyogwvp.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im55aG5rZnRsa2lnb2xpeW9nd3ZwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU0NzQ2NTMsImV4cCI6MjEwMTA1MDY1M30.KxjH42Wg0IVLfXLLJSbBLvcZ098hvJRUHkDu10NJfB4';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const MIGRATION_MAP = [
  { oldTable: 'users', newTable: 'GV_users' },
  { oldTable: 'inventory_expenses', newTable: 'GV_inventory_expenses' },
  { oldTable: 'fees_payments', newTable: 'GV_fees_payments' },
  { oldTable: 'communications', newTable: 'GV_communications' },
  { oldTable: 'requests', newTable: 'GV_requests' },
  { oldTable: 'system_settings', newTable: 'GV_system_settings' }
];

async function syncAndVerifyTables() {
  console.log("==========================================================");
  console.log("VERIFYING RESILIENT 6 CONSOLIDATED TABLES IN SUPABASE");
  console.log("Project URL:", SUPABASE_URL);
  console.log("==========================================================");

  const report = [];

  for (const { oldTable, newTable } of MIGRATION_MAP) {
    let oldCount = 0;
    let newCount = 0;

    // Check old table count if exists
    try {
      const { count: cOld } = await supabase.from(oldTable).select('*', { count: 'exact', head: true });
      oldCount = cOld ?? 0;
    } catch {}

    // Check new table count
    let status = 'ACTIVE & VERIFIED';
    try {
      const { count: cNew, error } = await supabase.from(newTable).select('*', { count: 'exact', head: true });
      if (error) {
        status = `REQUIRES SQL EXECUTION (${error.message})`;
      } else {
        newCount = cNew ?? 0;
      }
    } catch (e) {
      status = `EXCEPTION (${e.message})`;
    }

    report.push({
      OldUnprefixedTable: oldTable,
      NewGVTable: newTable,
      OldRowCount: oldCount,
      NewGVRowCount: newCount,
      Status: status
    });
  }

  console.log("\nRESILIENT 6 GROWVIA CONSOLIDATED APPLICATION TABLES REPORT:");
  console.table(report);
}

syncAndVerifyTables();
