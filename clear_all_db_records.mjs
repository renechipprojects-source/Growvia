import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://zlthgiosjkmpnaiypawj.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpsdGhnaW9zamttcG5haXlwYXdqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ4ODUwNTUsImV4cCI6MjEwMDQ2MTA1NX0.2kIsVh3iFYu4hYHWRcE__EAIgt24WUsNCbmFDbcCcpI";

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const tablesToClear = [
  "students",
  "teachers",
  "classes",
  "attendance",
  "fees",
  "circulars",
  "transport_allocations",
  "transport_vehicles",
  "transport_routes",
  "inventory_items",
  "events",
  "homework",
  "messages",
  "enquiries",
  "health_records",
];

async function clearTables() {
  console.log("=== SUNSHINE PLAY SCHOOL ERP — PURGING ALL DATABASE RECORDS ===");
  for (const table of tablesToClear) {
    try {
      const { error, count } = await supabase
        .from(table)
        .delete({ count: "exact" })
        .neq("id", "00000000-0000-0000-0000-000000000000"); // deletes all non-matching fake ID

      if (error) {
        // Try deleting by string condition
        const { error: err2 } = await supabase.from(table).delete().neq("id", "none");
        if (err2) {
          console.log(`⚠️ Table '${table}': ${err2.message}`);
          continue;
        }
      }
      console.log(`✅ Table '${table}' purged of all records.`);
    } catch (e) {
      console.log(`⚠️ Error clearing '${table}':`, e.message);
    }
  }
  console.log("Database cleanup completed successfully without altering schemas.");
}

clearTables();
