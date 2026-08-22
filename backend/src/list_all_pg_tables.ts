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

async function listAllPgTables() {
  const { createClient } = await import("@supabase/supabase-js");
  const SUPABASE_URL = process.env.SUPABASE_URL || "https://nyhnkftlkigoliyogwvp.supabase.co";
  const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  console.log("==================================================================================");
  console.log("🔍 DISCOVERING ALL DB TABLES IN THE SUPABASE PROJECT SCHEMA");
  console.log("==================================================================================");

  const candidateTableNames = [
    "gv_users",
    "gv_requests",
    "gv_inventory_expenses",
    "gv_communications",
    "gv_school_branding",
    "gv_events",
    "gv_homework",
    "gv_attendance",
    "gv_student_attendance",
    "gv_staff_attendance",
    "gv_classes",
    "gv_sections",
    "gv_fees",
    "gv_payments",
    "gv_ledgers",
    "gv_transport",
    "gv_vehicles",
    "gv_drivers",
    "gv_routes",
    "gv_allocations",
    "communications",
    "events",
    "homework",
    "activities",
  ];

  for (const t of candidateTableNames) {
    try {
      const { data, error, count } = await admin.from(t).select("*", { count: "exact" });
      if (!error && data) {
        console.log(`  ✓ Table '${t}' EXISTS: ${data.length} records`);
      }
    } catch {}
  }

  console.log("==================================================================================");
}

listAllPgTables().catch((err) => console.error(err));
