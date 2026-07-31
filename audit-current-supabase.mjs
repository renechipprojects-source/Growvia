import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://zlthgiosjkmpnaiypawj.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpsdGhnaW9zamttcG5haXlwYXdqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ4ODUwNTUsImV4cCI6MjEwMDQ2MTA1NX0.2kIsVh3iFYu4hYHWRcE__EAIgt24WUsNCbmFDbcCcpI';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const TABLES = [
  'users',
  'inventory_expenses',
  'fees_payments',
  'communications',
  'requests',
  'system_settings',
  'promotion_history',
  'student_attendance',
  'audit_logs',
  'profiles',
  'students',
  'teachers',
  'inventory_items',
  'expenses',
  'fees',
  'receipts',
  'circulars',
  'messages',
  'leave_requests',
  'enquiries'
];

async function audit() {
  console.log("==========================================================");
  console.log("SUPABASE MIGRATION AUDIT — CURRENT PROJECT ANALYSIS");
  console.log("URL:", supabaseUrl);
  console.log("==========================================================");

  const tableAudit = [];

  for (const table of TABLES) {
    try {
      const { data, error, count } = await supabase.from(table).select('*', { count: 'exact' });
      if (error) {
        tableAudit.push({ table, status: 'NOT_FOUND_OR_ERROR', count: 0, error: error.message });
      } else {
        tableAudit.push({ table, status: 'ACTIVE', count: count ?? data.length, sample: data[0] });
      }
    } catch (e) {
      tableAudit.push({ table, status: 'EXCEPTION', count: 0, error: e.message });
    }
  }

  console.log("\nTABLE AUDIT RESULTS:");
  console.table(tableAudit.map(t => ({ Table: t.table, Status: t.status, RowCount: t.count })));

  // Storage buckets check
  try {
    const { data: buckets, error: bErr } = await supabase.storage.listBuckets();
    console.log("\nSTORAGE BUCKETS:");
    if (bErr) {
      console.log("Storage list error:", bErr.message);
    } else {
      console.log(buckets);
    }
  } catch (e) {
    console.log("Storage list exception:", e.message);
  }

  // System Settings check
  try {
    const { data: sysData } = await supabase.from('system_settings').select('*').eq('id', 'PRIMARY').maybeSingle();
    console.log("\nSYSTEM SETTINGS:");
    if (sysData) {
      console.log("Found PRIMARY system settings record.");
      console.log("School Name:", sysData.school_name);
      console.log("School Logo URL:", sysData.school_logo_url || sysData.school_logo);
      console.log("Header Logo:", sysData.header_logo);
      console.log("Sidebar Logo:", sysData.sidebar_logo || sysData.sidebar_logo_url);
    } else {
      console.log("No PRIMARY system_settings record found.");
    }
  } catch (e) {
    console.log("System settings error:", e.message);
  }
}

audit();
