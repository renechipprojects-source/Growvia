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

async function repairAllUnlinkedUsers() {
  const { createClient } = await import("@supabase/supabase-js");
  const SUPABASE_URL = process.env.SUPABASE_URL || "https://nyhnkftlkigoliyogwvp.supabase.co";
  const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  console.log("==================================================================================");
  console.log("🛠️ REPAIRING & PROVISIONING ALL UNLINKED USER ACCOUNTS IN SUPABASE AUTH");
  console.log("==================================================================================");

  const { data: dbUsers } = await admin.from("gv_users").select("*");
  const { data: authData } = await admin.auth.admin.listUsers();
  const authUsers = authData ? authData.users : [];

  let repairedCount = 0;

  for (const u of dbUsers || []) {
    const matchingAuth = authUsers.find(
      (a) =>
        a.email?.toLowerCase() === u.email?.toLowerCase() ||
        a.id === u.auth_user_id ||
        (a.user_metadata?.login_id && String(a.user_metadata.login_id).toLowerCase() === String(u.login_id).toLowerCase())
    );

    const defaultPass =
      u.role === "admin"
        ? "admin123"
        : u.role === "principal"
        ? "principal123"
        : u.role === "office"
        ? "office123"
        : u.role === "teacher"
        ? "teacher123"
        : u.role === "parent"
        ? "parent123"
        : "student123";

    const targetEmail = u.email || `${u.login_id.toLowerCase()}@sunshineschool.edu`;
    let authUserId = matchingAuth?.id;

    if (!matchingAuth) {
      console.log(`[REPAIRING] Creating missing auth.users account for login_id: '${u.login_id}', email: '${targetEmail}'...`);
      const { data: created, error: createErr } = await admin.auth.admin.createUser({
        email: targetEmail,
        password: defaultPass,
        email_confirm: true,
        user_metadata: {
          login_id: u.login_id,
          role: u.role,
          full_name: u.full_name,
        },
      });

      if (created?.user) {
        authUserId = created.user.id;
        repairedCount++;
      } else if (createErr && createErr.message.includes("already registered")) {
        const { data: retryList } = await admin.auth.admin.listUsers();
        const found = retryList?.users?.find((a) => a.email?.toLowerCase() === targetEmail.toLowerCase());
        if (found) {
          authUserId = found.id;
          await admin.auth.admin.updateUserById(authUserId, {
            email_confirm: true,
            user_metadata: { login_id: u.login_id, role: u.role, full_name: u.full_name },
          });
          repairedCount++;
        }
      }
    } else {
      // Ensure email is confirmed and user_metadata is set
      await admin.auth.admin.updateUserById(matchingAuth.id, {
        email_confirm: true,
        user_metadata: {
          ...matchingAuth.user_metadata,
          login_id: u.login_id,
          role: u.role,
          full_name: u.full_name,
        },
      });
    }

    if (authUserId && u.auth_user_id !== authUserId) {
      await admin.from("gv_users").update({ auth_user_id: authUserId, email: targetEmail }).eq("login_id", u.login_id);
    }
  }

  console.log(`\n✓ Repair complete! Total user accounts created/repaired: ${repairedCount}`);
  console.log("==================================================================================");
}

repairAllUnlinkedUsers().catch((err) => {
  console.error("Repair exception:", err);
  process.exit(1);
});
