import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";
import { login, resolveLoginIdViaServer } from "../../frontend/src/lib/supabaseAuth";

try {
  const envPath = path.resolve(process.cwd(), "backend/.env");
  if (fs.existsSync(envPath)) {
    const envConfig = fs.readFileSync(envPath, "utf8");
    envConfig.split("\n").forEach((line) => {
      const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
      if (match) {
        const key = match[1];
        let value = match[2] || "";
        if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
        if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
        process.env[key] = value.trim();
      }
    });
  }
} catch {}

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "https://nyhnkftlkigoliyogwvp.supabase.co";
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const anonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJIUzI1NiIsInJlZiI6Im55aG5rZnRsa2lnb2xpeW9nd3ZwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU0NzQ2NTMsImV4cCI6MjEwMTA1MDY1M30.KxjH42Wg0IVLfXLLJSbBLvcZ098hvJRUHkDu10NJfB4";

const supabase = createClient(supabaseUrl, serviceKey);
const supabaseAnon = createClient(supabaseUrl, anonKey);

async function debugRealLogin() {
  console.log("==================================================================================");
  console.log("🔍 DEBUGGING REAL PORTAL LOGIN FLOW");
  console.log("==================================================================================");

  // 1. Check all users in auth.users
  const { data: authList } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
  const authUsers = authList?.users || [];

  console.log("\n📋 AUTH.USERS COUNT:", authUsers.length);
  authUsers.forEach((u) => {
    console.log(` - ID: ${u.id} | Email: ${u.email} | Confirmed: ${u.email_confirmed_at ? "YES" : "NO"} | Metadata:`, u.user_metadata);
  });

  // 2. Check all rows in gv_users
  const { data: gvRows } = await supabase.from("gv_users").select("*");
  console.log("\n📋 GV_USERS COUNT:", gvRows?.length || 0);
  (gvRows || []).forEach((g: any) => {
    console.log(` - ID: ${g.id} | LoginID: ${g.login_id} | Name: ${g.full_name} | Role: ${g.role} | Email: ${g.email} | AuthID: ${g.auth_user_id}`);
  });

  // 3. Test login function directly with various inputs:
  const testInputs = [
    { id: "ADMIN001", pwd: "Password@123" },
    { id: "admin@sunshineschool.edu", pwd: "Password@123" },
    { id: "PRINCIPAL001", pwd: "Password@123" },
    { id: "principal@sunshineschool.edu", pwd: "Password@123" },
    { id: "OFFICE001", pwd: "Password@123" },
    { id: "office@sunshineschool.edu", pwd: "Password@123" },
  ];

  console.log("\n==================================================================================");
  console.log("🧪 TESTING FRONTEND login() FUNCTION DIRECTLY:");
  console.log("==================================================================================");

  for (const input of testInputs) {
    console.log(`\nTesting login("${input.id}", "${input.pwd}")...`);
    try {
      const res = await login(input.id, input.pwd);
      console.log(`  └─ Result: success=${res.success}`, res.success ? `User ID: ${res.user?.id}, Role: ${res.profile?.role}` : `Error: ${res.error}`);
    } catch (e: any) {
      console.error(`  └─ Exception during login:`, e.message);
    }
  }
}

debugRealLogin();
