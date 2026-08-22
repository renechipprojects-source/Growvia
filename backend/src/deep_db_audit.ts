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

async function deepDbAudit() {
  const { createClient } = await import("@supabase/supabase-js");
  const SUPABASE_URL = process.env.SUPABASE_URL || "https://nyhnkftlkigoliyogwvp.supabase.co";
  const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  console.log("==================================================================================");
  console.log("🔍 DEEP DATABASE TABLE & RECORD AUDIT ACROSS ALL SUPABASE TABLES");
  console.log("==================================================================================");

  const tables = [
    "gv_users",
    "gv_requests",
    "gv_inventory_expenses",
    "gv_school_branding",
    "users",
    "requests",
    "students",
    "teachers",
    "parents",
    "fees",
    "receipts",
    "expenses",
    "inventory",
    "attendance",
    "circulars",
    "messages",
    "transport",
  ];

  for (const t of tables) {
    try {
      const { data, error } = await admin.from(t).select("*");
      if (!error && data) {
        console.log(`\nTable '${t}': ${data.length} records`);
        if (t === "gv_requests") {
          const typeCounts: Record<string, number> = {};
          data.forEach((r: any) => {
            const type = r.request_type || "UNKNOWN";
            typeCounts[type] = (typeCounts[type] || 0) + 1;
          });
          console.log("  Breakdown by request_type:", typeCounts);
        } else if (t === "gv_users") {
          const roleCounts: Record<string, number> = {};
          data.forEach((u: any) => {
            const role = u.role || "UNKNOWN";
            roleCounts[role] = (roleCounts[role] || 0) + 1;
          });
          console.log("  Breakdown by role:", roleCounts);
        } else if (t === "gv_inventory_expenses") {
          const recordTypes: Record<string, number> = {};
          data.forEach((r: any) => {
            const type = r.record_type || "UNKNOWN";
            recordTypes[type] = (recordTypes[type] || 0) + 1;
          });
          console.log("  Breakdown by record_type:", recordTypes);
        }
      } else {
        console.log(`\nTable '${t}': not found or empty (${error?.message || "0 rows"})`);
      }
    } catch (e: any) {
      console.log(`\nTable '${t}': exception (${e?.message})`);
    }
  }

  console.log("==================================================================================");
}

deepDbAudit().catch((err) => console.error("Audit error:", err));
