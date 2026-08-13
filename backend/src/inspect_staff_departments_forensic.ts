import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config({ path: "./backend/.env" });
dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL || "https://nyhnkftlkigoliyogwvp.supabase.co";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im55aG5rZnRsa2lnb2xpeW9nd3ZwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NTQ3NDY1MywiZXhwIjoyMTAxMDUwNjUzfQ.xsa3qLPf8jTe45x5x_-8TyTusbjnMiihtQse4IgjutQ";

const adminSupabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function inspectStaffDepartments() {
  console.log("==========================================================");
  console.log("🔍 FORENSIC INSPECTION: gv_users STAFF DEPARTMENTS");
  console.log("==========================================================");

  const { data: users, error } = await adminSupabase
    .from("gv_users")
    .select("*");

  if (error) {
    console.error("Error querying gv_users:", error.message);
    process.exit(1);
  }

  const staff = (users || []).filter((u) => u.role !== "parent" && u.role !== "student");

  console.log(`Total non-student/non-parent staff in gv_users: ${staff.length}\n`);

  staff.forEach((u, i) => {
    let extraMeta: any = {};
    try {
      if (u.address && u.address.startsWith("{")) {
        extraMeta = JSON.parse(u.address);
      }
    } catch {}

    console.log(`--- Staff #${i + 1}: ${u.full_name} (${u.role}) ---`);
    console.log({
      id: u.id,
      login_id: u.login_id,
      full_name: u.full_name,
      role: u.role,
      department_col: u.department,
      designation_col: u.designation,
      subject_col: u.subject,
      employee_id_col: u.employee_id,
      extraMeta_department: extraMeta.department,
      extraMeta_designation: extraMeta.designation,
      address_raw: u.address,
    });
  });
}

inspectStaffDepartments().catch(console.error);
