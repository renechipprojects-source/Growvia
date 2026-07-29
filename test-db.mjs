import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://zlthgiosjkmpnaiypawj.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpsdGhnaW9zamttcG5haXlwYXdqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ4ODUwNTUsImV4cCI6MjEwMDQ2MTA1NX0.2kIsVh3iFYu4hYHWRcE__EAIgt24WUsNCbmFDbcCcpI';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkAllTables() {
  const tables = ['profiles', 'students', 'teachers', 'enquiries', 'fees', 'receipts', 'expenses', 'inventory_items', 'circulars', 'leave_requests', 'messages'];
  
  for (const table of tables) {
    const { data, error, count } = await supabase.from(table).select('*', { count: 'exact' });
    if (error) {
      console.log(`❌ Table [${table}]: Error - ${error.message} (Code: ${error.code})`);
    } else {
      console.log(`✅ Table [${table}]: Connected (${count ?? data?.length ?? 0} rows)`);
    }
  }
}

checkAllTables();
