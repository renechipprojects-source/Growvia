import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";

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

const supabaseAdmin = createClient(supabaseUrl, serviceKey);
const supabaseAnon = createClient(supabaseUrl, anonKey);

async function auditCurrentPasswords() {
  console.log("==================================================================================");
  console.log("🔍 AUDITING CURRENT REAL AUTH.USERS PASSWORDS & LINKS");
  console.log("==================================================================================");

  const { data: authList } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  const authUsers = authList?.users || [];

  console.log(`Found ${authUsers.length} users in auth.users:\n`);

  const passwordCandidates = [
    "Password@123",
    "Admin@123",
    "Principal@123",
    "Office@123",
    "Teacher@123",
    "Parent@123",
    "password123",
    "password",
    "admin123",
    "principal123",
    "office123",
    "teacher123",
    "parent123",
  ];

  for (const u of authUsers) {
    console.log(`👤 User: ${u.email} | ID: ${u.id}`);
    
    // Check link in gv_users
    const { data: gv } = await supabaseAdmin.from("gv_users").select("*").or(`auth_user_id.eq.${u.id},email.eq.${u.email}`).maybeSingle();
    console.log(`   └─ Linked gv_users record:`, gv ? `ID=${gv.id}, login_id=${gv.login_id}, role=${gv.role}, auth_user_id=${gv.auth_user_id}` : "NONE FOUND!");

    // Test password candidates
    let workingPassword: string | null = null;
    for (const pwd of passwordCandidates) {
      const { data: sData, error } = await supabaseAnon.auth.signInWithPassword({
        email: u.email!,
        password: pwd,
      });
      if (!error && sData?.user) {
        workingPassword = pwd;
        break;
      }
    }

    if (workingPassword) {
      console.log(`   └─ ✅ Working password: "${workingPassword}"`);
    } else {
      console.log(`   └─ ❌ None of the standard candidate passwords worked.`);
    }
    console.log("");
  }
}

auditCurrentPasswords();
