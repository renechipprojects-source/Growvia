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

if (!serviceKey) {
  console.error("Missing SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey);

async function updateDefaultPasswords() {
  const defaultAccounts = [
    { email: "admin@sunshineschool.edu", password: "Password@123" },
    { email: "principal@sunshineschool.edu", password: "Password@123" },
    { email: "office@sunshineschool.edu", password: "Password@123" },
  ];

  console.log("Setting default portal passwords to Password@123...");
  const { data: authUsers } = await supabase.auth.admin.listUsers();
  
  for (const acc of defaultAccounts) {
    const found = authUsers?.users?.find((u) => u.email?.toLowerCase() === acc.email.toLowerCase());
    if (found) {
      const { error } = await supabase.auth.admin.updateUserById(found.id, {
        password: acc.password,
        email_confirm: true,
      });
      if (error) {
        console.error(`Failed to update password for ${acc.email}:`, error.message);
      } else {
        console.log(`Successfully updated password for ${acc.email} (${found.id})`);
      }
    } else {
      console.warn(`User ${acc.email} not found in auth.users!`);
    }
  }
}

updateDefaultPasswords();
