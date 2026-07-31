import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://nyhnkftlkigoliyogwvp.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im55aG5rZnRsa2lnb2xpeW9nd3ZwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU0NzQ2NTMsImV4cCI6MjEwMTA1MDY1M30.KxjH42Wg0IVLfXLLJSbBLvcZ098hvJRUHkDu10NJfB4';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const TARGET_SIX_TABLES = [
  'GV_users',
  'GV_inventory_expenses',
  'GV_fees_payments',
  'GV_communications',
  'GV_requests',
  'GV_system_settings'
];

async function mergeAllTablesIntoSix() {
  console.log("==========================================================");
  console.log("MERGING ALL DATABASE TABLES INTO EXACTLY 6 GV_ TABLES");
  console.log("Project URL:", SUPABASE_URL);
  console.log("==========================================================");

  // 1. Merge 'users' / 'profiles' -> GV_users
  try {
    const { data: oldUsers } = await supabase.from('users').select('*');
    if (oldUsers && oldUsers.length > 0) {
      const payloads = oldUsers.map(u => ({
        id: u.id,
        auth_user_id: u.auth_user_id,
        login_id: u.login_id || u.id,
        email: u.email || `${u.login_id}@sunshine.edu`,
        full_name: u.full_name || u.name || 'User',
        role: u.role || 'parent',
        status: u.status || 'active',
        mobile: u.mobile || u.phone,
        photo_url: u.photo_url || u.avatar,
        class_name: u.class_name,
        section: u.section,
        subject: u.subject,
        branch: u.branch || 'Main Branch',
        must_change_password: !!u.must_change_password
      }));
      const { error: err } = await supabase.from('GV_users').upsert(payloads);
      if (!err) console.log(`✅ Merged ${oldUsers.length} records from 'users' into 'GV_users'.`);
    }
  } catch (e) {
    console.log("Notice merging 'users':", e.message);
  }

  // 2. Merge 'inventory_expenses' -> GV_inventory_expenses
  try {
    const { data: oldInv } = await supabase.from('inventory_expenses').select('*');
    if (oldInv && oldInv.length > 0) {
      const { error: err } = await supabase.from('GV_inventory_expenses').upsert(oldInv);
      if (!err) console.log(`✅ Merged ${oldInv.length} records from 'inventory_expenses' into 'GV_inventory_expenses'.`);
    }
  } catch (e) {
    console.log("Notice merging 'inventory_expenses':", e.message);
  }

  // 3. Merge 'fees_payments' -> GV_fees_payments
  try {
    const { data: oldFees } = await supabase.from('fees_payments').select('*');
    if (oldFees && oldFees.length > 0) {
      const { error: err } = await supabase.from('GV_fees_payments').upsert(oldFees);
      if (!err) console.log(`✅ Merged ${oldFees.length} records from 'fees_payments' into 'GV_fees_payments'.`);
    }
  } catch (e) {
    console.log("Notice merging 'fees_payments':", e.message);
  }

  // 4. Merge 'communications' -> GV_communications
  try {
    const { data: oldComms } = await supabase.from('communications').select('*');
    if (oldComms && oldComms.length > 0) {
      const { error: err } = await supabase.from('GV_communications').upsert(oldComms);
      if (!err) console.log(`✅ Merged ${oldComms.length} records from 'communications' into 'GV_communications'.`);
    }
  } catch (e) {
    console.log("Notice merging 'communications':", e.message);
  }

  // 5. Merge 'requests' -> GV_requests
  try {
    const { data: oldReqs } = await supabase.from('requests').select('*');
    if (oldReqs && oldReqs.length > 0) {
      const { error: err } = await supabase.from('GV_requests').upsert(oldReqs);
      if (!err) console.log(`✅ Merged ${oldReqs.length} records from 'requests' into 'GV_requests'.`);
    }
  } catch (e) {
    console.log("Notice merging 'requests':", e.message);
  }

  // 6. Merge 'system_settings' -> GV_system_settings
  try {
    const { data: oldSys } = await supabase.from('system_settings').select('*');
    if (oldSys && oldSys.length > 0) {
      const { error: err } = await supabase.from('GV_system_settings').upsert(oldSys);
      if (!err) console.log(`✅ Merged ${oldSys.length} records from 'system_settings' into 'GV_system_settings'.`);
    }
  } catch (e) {
    console.log("Notice merging 'system_settings':", e.message);
  }

  // 7. Final Audit of 6 Tables
  console.log("\nFINAL AUDIT OF EXACT 6 GROWVIA CONSOLIDATED APPLICATION TABLES:");
  const auditReport = [];
  for (const table of TARGET_SIX_TABLES) {
    try {
      const { count, error } = await supabase.from(table).select('*', { count: 'exact', head: true });
      if (error) {
        auditReport.push({ TableName: table, RecordCount: 0, Status: `REQUIRES DDL EXECUTION (${error.message})` });
      } else {
        auditReport.push({ TableName: table, RecordCount: count ?? 0, Status: 'ACTIVE & VERIFIED' });
      }
    } catch (e) {
      auditReport.push({ TableName: table, RecordCount: 0, Status: `EXCEPTION (${e.message})` });
    }
  }

  console.table(auditReport);
}

mergeAllTablesIntoSix();
