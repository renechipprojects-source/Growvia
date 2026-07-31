import { createClient } from '@supabase/supabase-js';

// OLD Supabase Project Credentials
const OLD_URL = 'https://zlthgiosjkmpnaiypawj.supabase.co';
const OLD_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpsdGhnaW9zamttcG5haXlwYXdqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ4ODUwNTUsImV4cCI6MjEwMDQ2MTA1NX0.2kIsVh3iFYu4hYHWRcE__EAIgt24WUsNCbmFDbcCcpI';

// NEW Supabase Project Credentials
const NEW_URL = 'https://nyhnkftlkigoliyogwvp.supabase.co';
const NEW_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im55aG5rZnRsa2lnb2xpeW9nd3ZwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU0NzQ2NTMsImV4cCI6MjEwMTA1MDY1M30.KxjH42Wg0IVLfXLLJSbBLvcZ098hvJRUHkDu10NJfB4';

const oldClient = createClient(OLD_URL, OLD_KEY);
const newClient = createClient(NEW_URL, NEW_KEY);

const TABLES = [
  'users',
  'inventory_expenses',
  'fees_payments',
  'communications',
  'requests',
  'system_settings',
  'promotion_history',
  'student_attendance',
  'audit_logs'
];

async function runFullMigration() {
  console.log("==========================================================");
  console.log("EXECUTING SUPABASE PROJECT MIGRATION");
  console.log("OLD Project:", OLD_URL);
  console.log("NEW Project:", NEW_URL);
  console.log("==========================================================");

  // 1. Test NEW Supabase connection
  console.log("\n[1/5] Testing NEW Supabase project connection...");
  const { error: testErr } = await newClient.from('users').select('id').limit(1);

  if (testErr && testErr.message.includes('relation "public.users" does not exist')) {
    console.log("⚠️ Tables do not exist yet on NEW Supabase project.");
    console.log("Please run the SQL DDL in NEW Supabase SQL Editor first!");
  } else {
    console.log("✅ NEW Supabase connection successful.");
  }

  // 2. Provision Supabase Auth Users on NEW Supabase
  console.log("\n[2/5] Provisioning Supabase Auth Users on NEW project...");
  const defaultAuthUsers = [
    { email: 'developer@growvia.com', password: 'Dev@123', name: 'Lead Developer', role: 'developer', loginId: 'DEV001' },
    { email: 'admin@growvia.local', password: 'Admin@123', name: 'System Admin', role: 'admin', loginId: 'ADMIN001' },
    { email: 'principal@growvia.local', password: 'Principal@123', name: 'School Principal', role: 'principal', loginId: 'PRIN001' },
    { email: 'office@growvia.local', password: 'Office@123', name: 'Office Manager', role: 'office', loginId: 'OFFICE001' },
    { email: 'teacher@growvia.local', password: 'Teacher@123', name: 'Priya Sharma', role: 'teacher', loginId: 'TCH-415' }
  ];

  const authUserMap = {};

  for (const user of defaultAuthUsers) {
    try {
      const { data: signUpData, error: signUpErr } = await newClient.auth.signUp({
        email: user.email,
        password: user.password,
        options: {
          data: {
            full_name: user.name,
            role: user.role,
            login_id: user.loginId
          }
        }
      });

      let authId = signUpData?.user?.id;

      if (signUpErr || !authId) {
        // Attempt sign in if already exists
        const { data: signInData } = await newClient.auth.signInWithPassword({
          email: user.email,
          password: user.password
        });
        authId = signInData?.user?.id;
      }

      if (authId) {
        authUserMap[user.loginId] = authId;
        console.log(`✅ Auth user '${user.loginId}' (${user.email}) ready on NEW project -> Auth ID: ${authId}`);
      }
    } catch (e) {
      console.log(`Notice provisioning ${user.loginId}:`, e.message);
    }
  }

  // 3. Transfer Data for each table
  console.log("\n[3/5] Transferring table data from OLD project to NEW project...");

  for (const table of TABLES) {
    try {
      const { data: oldData, error: fetchErr } = await oldClient.from(table).select('*');

      if (fetchErr) {
        console.log(`Table '${table}' not found in OLD project (skipping).`);
        continue;
      }

      if (!oldData || oldData.length === 0) {
        console.log(`Table '${table}': 0 rows in OLD project.`);
        continue;
      }

      // Map auth_user_id if table is users
      const payloads = oldData.map(row => {
        if (table === 'users' && row.login_id && authUserMap[row.login_id]) {
          return {
            ...row,
            auth_user_id: authUserMap[row.login_id]
          };
        }
        return row;
      });

      const { data: insertedData, error: insertErr } = await newClient.from(table).upsert(payloads);

      if (insertErr) {
        console.log(`❌ Table '${table}' data transfer notice:`, insertErr.message);
      } else {
        console.log(`✅ Table '${table}': Transferred ${oldData.length} rows to NEW project successfully.`);
      }
    } catch (e) {
      console.log(`Exception migrating table '${table}':`, e.message);
    }
  }

  // 4. Verify Row Counts & Parity
  console.log("\n[4/5] Verifying row counts & table parity between OLD and NEW projects...");
  const parityReport = [];

  for (const table of TABLES) {
    let oldCount = 0;
    let newCount = 0;

    try {
      const { count: cOld } = await oldClient.from(table).select('*', { count: 'exact', head: true });
      oldCount = cOld ?? 0;
    } catch {}

    try {
      const { count: cNew } = await newClient.from(table).select('*', { count: 'exact', head: true });
      newCount = cNew ?? 0;
    } catch {}

    parityReport.push({
      Table: table,
      OldProjectRows: oldCount,
      NewProjectRows: newCount,
      Status: oldCount === newCount ? 'MATCH' : 'MISMATCH / EMPTY'
    });
  }

  console.table(parityReport);

  // 5. Check System Settings Verification
  console.log("\n[5/5] Verifying system_settings & branding on NEW project...");
  try {
    const { data: sysNew } = await newClient.from('system_settings').select('*').eq('id', 'PRIMARY').maybeSingle();
    if (sysNew) {
      console.log("✅ system_settings record verified on NEW project!");
      console.log("School Name:", sysNew.school_name);
      console.log("School Logo URL:", sysNew.school_logo_url || sysNew.school_logo);
      console.log("Header Logo:", sysNew.header_logo);
      console.log("Sidebar Logo:", sysNew.sidebar_logo || sysNew.sidebar_logo_url);
    } else {
      console.log("Notice: system_settings record will be automatically populated on first app load.");
    }
  } catch (e) {
    console.log("System settings verification notice:", e.message);
  }

  console.log("\n==========================================================");
  console.log("MIGRATION SCRIPT EXECUTED");
  console.log("==========================================================");
}

runFullMigration();
