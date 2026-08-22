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

async function setupRealPortalAccounts() {
  console.log("==================================================================================");
  console.log("⚙️  SETTING UP & LINKING REAL PORTAL ACCOUNTS IN AUTH.USERS AND GV_USERS");
  console.log("==================================================================================");

  const portalAccounts = [
    {
      login_id: "ADMIN001",
      email: "admin@sunshineschool.edu",
      role: "admin",
      full_name: "System Admin",
      mobile: "9876543210",
      password: "Password@123",
    },
    {
      login_id: "PRINCIPAL001",
      email: "principal@sunshineschool.edu",
      role: "principal",
      full_name: "School Principal",
      mobile: "9876543211",
      password: "Password@123",
    },
    {
      login_id: "OFFICE001",
      email: "office@sunshineschool.edu",
      role: "office",
      full_name: "Office Manager",
      mobile: "9876543212",
      password: "Password@123",
    },
    {
      login_id: "TCH101",
      email: "teacher@sunshineschool.edu",
      role: "teacher",
      full_name: "Senior Teacher",
      mobile: "9876543213",
      password: "Password@123",
    },
    {
      login_id: "PRT1001",
      email: "parent@sunshineschool.edu",
      role: "parent",
      full_name: "Parent User",
      mobile: "9876543214",
      password: "Password@123",
    },
  ];

  // 1. Fetch current auth users
  const { data: authList } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
  const authUsers = authList?.users || [];

  for (const acc of portalAccounts) {
    let authUser = authUsers.find((u) => u.email?.toLowerCase() === acc.email.toLowerCase());
    let authUserId = authUser?.id;

    if (!authUser) {
      console.log(`[CREATING AUTH USER] ${acc.email}...`);
      const { data: created, error: createErr } = await supabase.auth.admin.createUser({
        email: acc.email,
        password: acc.password,
        email_confirm: true,
        user_metadata: {
          login_id: acc.login_id,
          role: acc.role,
          full_name: acc.full_name,
        },
      });
      if (createErr) {
        console.error(`Failed to create Auth user for ${acc.email}:`, createErr.message);
      } else {
        authUserId = created.user?.id;
        console.log(`  └─ Created Auth User ID: ${authUserId}`);
      }
    } else {
      console.log(`[UPDATING AUTH USER] ${acc.email} (${authUser.id})...`);
      const { error: updateErr } = await supabase.auth.admin.updateUserById(authUser.id, {
        password: acc.password,
        email_confirm: true,
        user_metadata: {
          ...authUser.user_metadata,
          login_id: acc.login_id,
          role: acc.role,
          full_name: acc.full_name,
        },
      });
      if (updateErr) console.error(`Failed to update ${acc.email}:`, updateErr.message);
    }

    if (authUserId) {
      const profilePayload = {
        id: authUserId,
        auth_user_id: authUserId,
        login_id: acc.login_id,
        email: acc.email,
        role: acc.role,
        full_name: acc.full_name,
        mobile: acc.mobile,
        status: "active",
        must_change_password: false,
      };

      const { error: gvErr } = await supabase.from("gv_users").upsert([profilePayload], { onConflict: "login_id" });
      if (gvErr) {
        console.error(`Failed to upsert gv_users profile for ${acc.login_id}:`, gvErr.message);
      } else {
        console.log(`  └─ Upserted gv_users profile for ${acc.login_id} (${authUserId}).`);
      }
    }
  }

  // Allow anon SELECT on gv_users if RLS exists via RPC or policy update if possible
  console.log("\n==================================================================================");
  console.log("✅ REAL PORTAL ACCOUNTS FULLY SET UP AND LINKED!");
  console.log("==================================================================================");
}

setupRealPortalAccounts();
