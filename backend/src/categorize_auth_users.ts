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

async function categorize() {
  const { data: authData } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
  const authUsers = authData?.users || [];
  const { data: gvUsers } = await supabase.from("gv_users").select("*");

  const gvMapByAuthId = new Map((gvUsers || []).map((g: any) => [g.auth_user_id, g]));
  const gvMapByEmail = new Map((gvUsers || []).map((g: any) => [(g.email || "").toLowerCase(), g]));
  const gvMapById = new Map((gvUsers || []).map((g: any) => [(g.id || "").toLowerCase(), g]));
  const gvMapByLoginId = new Map((gvUsers || []).map((g: any) => [(g.login_id || "").toLowerCase(), g]));

  console.log("=== CATEGORIZATION ANALYSIS OF ALL AUTH USERS ===");

  authUsers.forEach((u) => {
    const email = (u.email || "").toLowerCase();
    const gvMatch = gvMapByAuthId.get(u.id) || gvMapByEmail.get(email) || gvMapById.get(u.id.toLowerCase());

    let category = "UNKNOWN";
    let isRealActive = false;

    // Active default portal roles
    if (email === "admin@sunshineschool.edu" || email === "principal@sunshineschool.edu" || email === "office@sunshineschool.edu") {
      category = "CURRENT_DEFAULT_PORTAL_ROLES (KEEP)";
      isRealActive = true;
    } else if (email.endsWith("@sunshineschool.edu") || email.endsWith("@growvia.edu") || email.endsWith("@sunshine.edu")) {
      if (email.startsWith("stf-login") || email.startsWith("prt-login") || email.startsWith("stf_auth") || email.startsWith("prt_auth") || email.includes("e2e") || email.includes("test")) {
        category = "TEST_E2E_GENERATED_ACCOUNTS (OBSOLETE SEED/TEST)";
      } else if (gvMatch) {
        category = "REAL_OR_VALID_STAFF_PARENT_STUDENT (KEEP)";
        isRealActive = true;
      } else {
        category = "OLD_MOCK_DEMO_SEED_UNLINKED (OBSOLETE)";
      }
    } else if (email.includes("scandine.com") || email.includes("growvia.com") || email.includes("test.com")) {
      category = "OLD_DEVELOPMENT_MOCK_ACCOUNTS (OBSOLETE)";
    } else {
      category = "OTHER_USER_ACCOUNTS";
    }

    console.log(`ID: ${u.id} | Email: ${u.email} | Category: ${category} | GV Match: ${gvMatch ? gvMatch.full_name + " (" + gvMatch.role + ")" : "NONE"}`);
  });
}

categorize();
