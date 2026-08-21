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
} catch (e) {
  console.error("Failed to parse .env:", e);
}

async function audit() {
  const { createClient } = await import("@supabase/supabase-js");
  const SUPABASE_URL = process.env.SUPABASE_URL || "https://nyhnkftlkigoliyogwvp.supabase.co";
  const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  console.log("=== DATABASE (gv_users) vs SUPABASE AUTH (auth.users) FORENSIC AUDIT ===");
  const { data: dbUsers, error: dbErr } = await admin.from("gv_users").select("*");
  const { data: authData, error: authErr } = await admin.auth.admin.listUsers();

  if (dbErr) console.error("Error fetching gv_users:", dbErr);
  if (authErr) console.error("Error fetching auth.users:", authErr);

  const authUsers = authData ? authData.users : [];

  console.log(`\nTotal gv_users records in DB: ${dbUsers ? dbUsers.length : 0}`);
  console.log(`Total auth.users records in Supabase Auth: ${authUsers.length}`);

  console.log("\n--- Audit Results per gv_users Record ---");
  const unlinkedDbUsers: any[] = [];
  (dbUsers || []).forEach((u) => {
    const matchingAuth = authUsers.find(
      (a) =>
        a.email?.toLowerCase() === u.email?.toLowerCase() ||
        a.id === u.auth_user_id ||
        (a.user_metadata?.login_id && String(a.user_metadata.login_id).toLowerCase() === String(u.login_id).toLowerCase())
    );
    if (!matchingAuth) {
      unlinkedDbUsers.push(u);
    }
    console.log(`[USER] login_id: '${u.login_id}' | email: '${u.email}' | role: '${u.role}' | auth_linked: ${!!matchingAuth} | auth_id: '${matchingAuth ? matchingAuth.id : "NONE"}'`);
  });

  if (unlinkedDbUsers.length > 0) {
    console.log(`\n⚠️ FOUND ${unlinkedDbUsers.length} UNLINKED USERS IN gv_users (missing in auth.users):`);
    unlinkedDbUsers.forEach((u) => console.log(`   - login_id: ${u.login_id}, email: ${u.email}, role: ${u.role}`));
  } else {
    console.log("\n✓ All gv_users records are linked to auth.users!");
  }
}

audit();
