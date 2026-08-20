import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(process.cwd(), "frontend", ".env") });

const supabaseUrl = process.env.VITE_SUPABASE_URL || "";
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || "";

console.log("Connecting to Supabase URL:", supabaseUrl);
const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  try {
    const res = await fetch("http://localhost:5000/api/users?role=student");
    if (res.ok) {
      const json = await res.json();
      console.log(`Backend /api/users?role=student returned ${json.data?.length || 0} students:`);
      console.table(json.data);
    } else {
      console.log("Backend response not ok:", res.status);
    }
  } catch (err: any) {
    console.log("Could not fetch backend API:", err.message);
  }

  const { data: allUsers, error } = await supabase
    .from("gv_users")
    .select("id, login_id, role, full_name, admission_no, parent_id, parent_name, mobile");

  if (error) {
    console.error("Error fetching gv_users directly:", error);
  } else {
    console.log(`Direct Supabase returned ${allUsers?.length || 0} total records in gv_users:`);
    console.table(allUsers);
  }
}

main().catch(console.error);
