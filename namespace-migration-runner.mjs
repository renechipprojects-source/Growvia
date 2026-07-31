import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://nyhnkftlkigoliyogwvp.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im55aG5rZnRsa2lnb2xpeW9nd3ZwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU0NzQ2NTMsImV4cCI6MjEwMTA1MDY1M30.KxjH42Wg0IVLfXLLJSbBLvcZ098hvJRUHkDu10NJfB4';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const EXACT_SIX_TABLES = [
  'GV_users',
  'GV_inventory_expenses',
  'GV_fees_payments',
  'GV_communications',
  'GV_requests',
  'GV_system_settings'
];

async function verifyExactSixTables() {
  console.log("==========================================================");
  console.log("VERIFYING EXACT 6 CONSOLIDATED APPLICATION TABLES (GV_)");
  console.log("Project URL:", SUPABASE_URL);
  console.log("==========================================================");

  const report = [];

  for (const tableName of EXACT_SIX_TABLES) {
    try {
      const { data, count, error } = await supabase.from(tableName).select('*', { count: 'exact' });
      if (error) {
        report.push({ TableName: tableName, RecordCount: 0, Status: `ERROR (${error.message})` });
      } else {
        report.push({ TableName: tableName, RecordCount: count ?? (data ? data.length : 0), Status: 'ACTIVE & VERIFIED' });
      }
    } catch (e) {
      report.push({ TableName: tableName, RecordCount: 0, Status: `EXCEPTION (${e.message})` });
    }
  }

  console.log("\nEXACT 6 GROWVIA APPLICATION TABLES REPORT:");
  console.table(report);
}

verifyExactSixTables();
