import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://nyhnkftlkigoliyogwvp.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im55aG5rZnRsa2lnb2xpeW9nd3ZwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU0NzQ2NTMsImV4cCI6MjEwMTA1MDY1M30.KxjH42Wg0IVLfXLLJSbBLvcZ098hvJRUHkDu10NJfB4';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const EXPECTED_SIX_TABLES = [
  'GV_users',
  'GV_inventory_expenses',
  'GV_fees_payments',
  'GV_communications',
  'GV_requests',
  'GV_system_settings'
];

async function verifySixTableCount() {
  console.log("==========================================================");
  console.log("AUDITING SUPABASE DATABASE — EXACT 6 TABLE AUDIT");
  console.log("Project URL:", SUPABASE_URL);
  console.log("==========================================================");

  const tableReport = [];

  for (const tableName of EXPECTED_SIX_TABLES) {
    try {
      const { data, count, error } = await supabase.from(tableName).select('*', { count: 'exact' });
      if (error) {
        tableReport.push({ TableName: tableName, Count: 0, Status: `ERROR: ${error.message}` });
      } else {
        tableReport.push({ TableName: tableName, Count: count ?? (data ? data.length : 0), Status: 'ACTIVE (1 of 6)' });
      }
    } catch (e) {
      tableReport.push({ TableName: tableName, Count: 0, Status: `EXCEPTION: ${e.message}` });
    }
  }

  console.log("\nGROWVIA CONSOLIDATED APPLICATION TABLES (EXACT 6):");
  console.table(tableReport);
}

verifySixTableCount();
