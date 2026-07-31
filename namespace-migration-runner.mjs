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
  { oldTable: 'system_settings', newTable: 'GV_system_settings' },
  { oldTable: 'promotion_history', newTable: 'GV_promotion_history' },
  { oldTable: 'student_attendance', newTable: 'GV_student_attendance' },
  { oldTable: 'audit_logs', newTable: 'GV_audit_logs' }
];

async function runNamespaceMigration() {
  console.log("==========================================================");
  console.log("EXECUTING DATABASE NAMESPACE MIGRATION (GV_ PREFIX)");
  console.log("Project URL:", SUPABASE_URL);
  console.log("==========================================================");

  const report = [];

  for (const { oldTable, newTable } of MIGRATION_MAP) {
    let oldCount = 0;
    let newCount = 0;
    let status = 'SUCCESS';

    try {
      // 1. Fetch old table rows
      const { data: oldRows, count: cOld } = await supabase.from(oldTable).select('*', { count: 'exact' });
      oldCount = cOld ?? (oldRows ? oldRows.length : 0);

      if (oldRows && oldRows.length > 0) {
        // 2. Transfer rows into GV_ table
        const { error: insertErr } = await supabase.from(newTable).upsert(oldRows);
        if (insertErr) {
          console.log(`Notice inserting into '${newTable}':`, insertErr.message);
        }
      }

      // 3. Check new table count
      const { count: cNew } = await supabase.from(newTable).select('*', { count: 'exact', head: true });
      newCount = cNew ?? 0;

    } catch (e) {
      status = `NOTICE (${e.message})`;
    }

    report.push({
      OldTable: oldTable,
      NewGVTable: newTable,
      OldRows: oldCount,
      NewGVRows: newCount,
      Status: status
    });
  }

  console.log("\nDATABASE NAMESPACE PARITY REPORT:");
  console.table(report);
}

runNamespaceMigration();
