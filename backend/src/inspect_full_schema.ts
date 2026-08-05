import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://nyhnkftlkigoliyogwvp.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im55aG5rZnRsa2lnb2xpeW9nd3ZwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU0NzQ2NTMsImV4cCI6MjEwMTA1MDY1M30.KxjH42Wg0IVLfXLLJSbBLvcZ098hvJRUHkDu10NJfB4";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function inspectSchema() {
  console.log("==========================================");
  console.log("🔍 LIVE SUPABASE SCHEMA & COLUMN AUDIT");
  console.log("==========================================");

  const tables = [
    "gv_users",
    "gv_requests",
    "gv_communications",
    "gv_fees_payments",
    "gv_inventory_expenses",
    "gv_system_settings",
  ];

  for (const table of tables) {
    console.log(`\n--- TABLE: ${table} ---`);
    const { data, error } = await supabase.from(table).select("*").limit(1);
    if (error) {
      console.error(`Error querying ${table}:`, error.message);
    } else if (data && data.length > 0) {
      console.log(`Sample Columns for ${table}:`);
      console.log(Object.keys(data[0]));
    } else {
      console.log(`Table ${table} exists but has 0 rows.`);
    }
  }
}

inspectSchema().catch(console.error);
