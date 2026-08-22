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

async function cleanObsoleteAuthRecords() {
  console.log("==================================================================================");
  console.log("🧹 STARTING SAFE OBSOLETE AUTH RECORDS CLEANUP");
  console.log("==================================================================================");

  // 1. Fetch current active gv_users profiles
  const { data: gvUsers, error: gvErr } = await supabase.from("gv_users").select("*");
  if (gvErr) {
    console.error("Error fetching gv_users:", gvErr.message);
    process.exit(1);
  }

  const activeAuthIdsToPreserve = new Set<string>();
  const activeEmailsToPreserve = new Set<string>();

  (gvUsers || []).forEach((g: any) => {
    if (g.auth_user_id) activeAuthIdsToPreserve.add(g.auth_user_id);
    if (g.email) activeEmailsToPreserve.add(g.email.toLowerCase());
  });

  // Explicitly add current authoritative default portal accounts
  activeEmailsToPreserve.add("admin@sunshineschool.edu");
  activeEmailsToPreserve.add("principal@sunshineschool.edu");
  activeEmailsToPreserve.add("office@sunshineschool.edu");
  activeAuthIdsToPreserve.add("b4ba57ab-d231-48fe-9ab6-8c91a318458f");
  activeAuthIdsToPreserve.add("4c0f8ae4-2dcf-4b6f-a21e-3ebf028fb634");
  activeAuthIdsToPreserve.add("d468b67f-163e-4179-9e52-97cb89ea6b9c");

  console.log(`\n📌 Preserving ${activeAuthIdsToPreserve.size} Auth IDs and ${activeEmailsToPreserve.size} emails.`);

  // 2. List all auth.users
  const { data: authData, error: authErr } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (authErr || !authData) {
    console.error("Error listing Auth users:", authErr?.message);
    process.exit(1);
  }

  const allAuthUsers = authData.users || [];
  console.log(`📌 Found ${allAuthUsers.length} total users in Supabase auth.users.`);

  const toKeep: any[] = [];
  const toDelete: any[] = [];

  allAuthUsers.forEach((u) => {
    const email = (u.email || "").toLowerCase();
    const isPreserved = activeAuthIdsToPreserve.has(u.id) || activeEmailsToPreserve.has(email);
    if (isPreserved) {
      toKeep.push(u);
    } else {
      toDelete.push(u);
    }
  });

  console.log(`\n📊 CLASSIFICATION RESULTS:`);
  console.log(`   - Users to KEEP (Real & Active): ${toKeep.length}`);
  console.log(`   - Users to DELETE (Obsolete Seed/Demo/Test): ${toDelete.length}`);

  console.log("\n--- USERS TO BE PRESERVED ---");
  toKeep.forEach((u) => console.log(`  ✓ KEEP: ID ${u.id} | Email ${u.email}`));

  console.log("\n--- OBSOLETE USERS TO BE REMOVED ---");
  toDelete.forEach((u) => console.log(`  ✗ DELETE: ID ${u.id} | Email ${u.email}`));

  // Perform deletion
  console.log("\n[EXECUTING DELETION OF OBSOLETE AUTH RECORDS...]");
  let deletedCount = 0;
  for (const u of toDelete) {
    const { error: delErr } = await supabase.auth.admin.deleteUser(u.id);
    if (delErr) {
      console.error(`  └─ [ERROR] Failed to delete user ${u.id} (${u.email}):`, delErr.message);
    } else {
      deletedCount++;
      console.log(`  └─ [DELETED] Removed obsolete user ${u.id} (${u.email})`);
    }
  }

  console.log(`\n==================================================================================`);
  console.log(`✅ CLEANUP COMPLETED: ${deletedCount} obsolete Auth records removed successfully.`);
  console.log(`   Remaining Auth users: ${toKeep.length}`);
  console.log(`==================================================================================`);
}

cleanObsoleteAuthRecords().catch((err) => {
  console.error("Cleanup failed:", err);
  process.exit(1);
});
