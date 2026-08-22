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

async function discoverTables() {
  const { createClient } = await import("@supabase/supabase-js");
  const SUPABASE_URL = process.env.SUPABASE_URL || "https://nyhnkftlkigoliyogwvp.supabase.co";
  const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  console.log("=== SUPABASE DATABASE TABLE SCHEMA DISCOVERY ===");

  const candidateTables = [
    "gv_users",
    "gv_requests",
    "users",
    "requests",
    "students",
    "teachers",
    "parents",
    "fees",
    "fee_payments",
    "fee_ledgers",
    "receipts",
    "expenses",
    "inventory",
    "stock",
    "attendance",
    "student_attendance",
    "staff_attendance",
    "admissions",
    "enquiries",
    "visits",
    "class_assignments",
    "master_classes",
    "classes",
    "sections",
    "school_branding",
  ];

  for (const t of candidateTables) {
    const { data, error } = await admin.from(t).select("count", { count: "exact", head: true });
    if (!error) {
      console.log(`  [EXISTS] Table '${t}': count = ${data !== null ? data : "available"}`);
    }
  }

  // Also query gv_requests request_types
  const { data: requestTypes } = await admin.from("gv_requests").select("request_type");
  if (requestTypes) {
    const typeCounts: Record<string, number> = {};
    requestTypes.forEach((r: any) => {
      const type = r.request_type || "UNKNOWN";
      typeCounts[type] = (typeCounts[type] || 0) + 1;
    });
    console.log("\n--- gv_requests Breakdown by request_type ---");
    console.log(typeCounts);
  }

  // Also query gv_users roles
  const { data: userRoles } = await admin.from("gv_users").select("role");
  if (userRoles) {
    const roleCounts: Record<string, number> = {};
    userRoles.forEach((u: any) => {
      const role = u.role || "UNKNOWN";
      roleCounts[role] = (roleCounts[role] || 0) + 1;
    });
    console.log("\n--- gv_users Breakdown by role ---");
    console.log(roleCounts);
  }
}

discoverTables().catch((err) => console.error("Discovery error:", err));
