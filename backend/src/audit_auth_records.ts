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

async function auditAuthAndGvUsers() {
  console.log("==================================================================================");
  console.log("🔍 AUDITING SUPABASE AUTH (auth.users) AND APPLICATION USERS (gv_users)");
  console.log("==================================================================================");

  // 1. Fetch all Supabase Auth users using admin API (handles pagination)
  let allAuthUsers: any[] = [];
  let page = 1;
  let hasMore = true;
  while (hasMore) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) {
      console.error("Error listing Supabase Auth users:", error.message);
      break;
    }
    const users = data?.users || [];
    allAuthUsers.push(...users);
    if (users.length < 1000) {
      hasMore = false;
    } else {
      page++;
    }
  }

  // 2. Fetch all gv_users records
  const { data: gvUsers, error: gvError } = await supabase
    .from("gv_users")
    .select("*")
    .order("created_at", { ascending: true });

  if (gvError) {
    console.error("Error fetching gv_users:", gvError.message);
    process.exit(1);
  }

  console.log(`\n📊 SUMMARY STATS:`);
  console.log(`   - Total Supabase Auth Users (auth.users): ${allAuthUsers.length}`);
  console.log(`   - Total Application Profiles (gv_users):  ${gvUsers.length}`);

  console.log("\n==================================================================================");
  console.log("📋 SUPABASE AUTH USERS (auth.users):");
  console.log("==================================================================================");
  allAuthUsers.forEach((u, i) => {
    console.log(`${i + 1}. ID: ${u.id} | Email: ${u.email} | Created: ${u.created_at} | Last Sign In: ${u.last_sign_in_at || "Never"}`);
  });

  console.log("\n==================================================================================");
  console.log("📋 APPLICATION PROFILES (gv_users):");
  console.log("==================================================================================");
  gvUsers.forEach((u: any, i: number) => {
    console.log(`${i + 1}. ID: ${u.id} | LoginID: ${u.login_id} | Name: ${u.full_name} | Role: ${u.role} | Email: ${u.email} | AuthID: ${u.auth_user_id || "NONE"}`);
  });

  // Cross reference analysis
  console.log("\n==================================================================================");
  console.log("🔍 LINK & ORPHAN ANALYSIS:");
  console.log("==================================================================================");

  const authUserMap = new Map(allAuthUsers.map((u) => [u.id, u]));
  const authUserEmailMap = new Map(allAuthUsers.map((u) => [u.email?.toLowerCase(), u]));

  const gvAuthIds = new Set(gvUsers.map((u: any) => u.auth_user_id).filter(Boolean));
  const gvEmails = new Set(gvUsers.map((u: any) => u.email?.toLowerCase()).filter(Boolean));

  // Auth users without gv_users profile
  const orphanedAuthUsers = allAuthUsers.filter((u) => !gvAuthIds.has(u.id) && !gvEmails.has(u.email?.toLowerCase()));
  console.log(`\n⚠️  Orphaned Auth Users (in auth.users, but NO matching gv_users record): ${orphanedAuthUsers.length}`);
  orphanedAuthUsers.forEach((u) => {
    console.log(`    - ID: ${u.id} | Email: ${u.email} | Created: ${u.created_at}`);
  });

  // gv_users without auth_user_id or matching auth.users
  const unlinkedGvUsers = gvUsers.filter((u: any) => !u.auth_user_id || !authUserMap.has(u.auth_user_id));
  console.log(`\n⚠️  gv_users Profiles missing valid auth_user_id link: ${unlinkedGvUsers.length}`);
  unlinkedGvUsers.forEach((u: any) => {
    const matchByEmail = u.email ? authUserEmailMap.get(u.email.toLowerCase()) : null;
    console.log(`    - ID: ${u.id} | LoginID: ${u.login_id} | Name: ${u.full_name} | Role: ${u.role} | Email: ${u.email} | Match by Email: ${matchByEmail ? matchByEmail.id : "NO MATCH"}`);
  });
}

auditAuthAndGvUsers().catch((err) => {
  console.error("Audit failed:", err);
  process.exit(1);
});
