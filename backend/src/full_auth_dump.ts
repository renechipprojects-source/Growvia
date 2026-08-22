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

const supabase = createClient(supabaseUrl, serviceKey);

async function fullDump() {
  const { data: authData } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
  const authUsers = authData?.users || [];

  const { data: gvUsers } = await supabase.from("gv_users").select("*");

  console.log("=== TOTAL AUTH USERS: " + authUsers.length + " ===");
  authUsers.forEach((u, i) => {
    console.log(`[AUTH ${i + 1}] ID: ${u.id} | Email: ${u.email} | Created: ${u.created_at} | LastSignIn: ${u.last_sign_in_at || "Never"}`);
  });

  console.log("\n=== TOTAL GV USERS: " + (gvUsers?.length || 0) + " ===");
  (gvUsers || []).forEach((g: any, i: number) => {
    console.log(`[GV ${i + 1}] ID: ${g.id} | LoginID: ${g.login_id} | Name: ${g.full_name} | Role: ${g.role} | Email: ${g.email} | AuthID: ${g.auth_user_id}`);
  });
}

fullDump();
