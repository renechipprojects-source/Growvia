import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config({ path: "./backend/.env" });
dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL || "https://nyhnkftlkigoliyogwvp.supabase.co";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im55aG5rZnRsa2lnb2xpeW9nd3ZwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NTQ3NDY1MywiZXhwIjoyMTAxMDUwNjUzfQ.xsa3qLPf8jTe45x5x_-8TyTusbjnMiihtQse4IgjutQ";

const adminSupabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function runDatabaseForensicCheck() {
  console.log("==================================================================================");
  console.log("🔍 DATABASE FORENSIC CHECK: gv_users STAFF DEPARTMENTS FOR AT LEAST 10 RECORDS");
  console.log("==================================================================================");

  const { data: users, error } = await adminSupabase
    .from("gv_users")
    .select("*")
    .order("full_name", { ascending: true });

  if (error) {
    console.error("  ✗ Error fetching gv_users:", error.message);
    process.exit(1);
  }

  const staffList = (users || []).filter((u) => u.role !== "parent" && u.role !== "student");

  console.log(`Found ${staffList.length} staff records in gv_users.\n`);

  console.log("----------------------------------------------------------------------------------");
  console.log("| #  | Staff Name             | Role       | DB Column Dept | JSON Address Dept | Resolved Dept |");
  console.log("----------------------------------------------------------------------------------");

  staffList.slice(0, 15).forEach((u, idx) => {
    let extraMeta: any = {};
    try {
      if (u.address && u.address.startsWith("{")) {
        extraMeta = JSON.parse(u.address);
      }
    } catch {}

    const colDept = u.department || null;
    const jsonDept = extraMeta.department || null;
    const resolvedDept = jsonDept || colDept || "Not Assigned";

    console.log(
      `| ${(idx + 1).toString().padStart(2)} | ${u.full_name.padEnd(22)} | ${u.role.padEnd(10)} | ${(colDept || "null").padEnd(14)} | ${(jsonDept || "null").padEnd(17)} | ${resolvedDept.padEnd(13)} |`
    );
  });
  console.log("----------------------------------------------------------------------------------\n");
}

runDatabaseForensicCheck().catch(console.error);
