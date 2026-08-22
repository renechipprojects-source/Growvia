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

async function exportFullDatabaseBackup() {
  const { createClient } = await import("@supabase/supabase-js");
  const SUPABASE_URL = process.env.SUPABASE_URL || "https://nyhnkftlkigoliyogwvp.supabase.co";
  const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  console.log("==================================================================================");
  console.log("📦 EXPORTING FULL DATABASE & AUTH BACKUP BEFORE OPERATIONAL RESET");
  console.log("==================================================================================");

  const tablesToExport = [
    "gv_users",
    "gv_requests",
    "students",
    "teachers",
    "parents",
    "fees",
    "fee_payments",
    "fee_ledgers",
    "expenses",
    "inventory",
    "inventory_transactions",
    "attendance",
    "student_attendance",
    "staff_attendance",
    "admissions",
    "enquiries",
    "visits",
    "class_assignments",
    "master_classes",
  ];

  const backupData: Record<string, any> = {};

  for (const table of tablesToExport) {
    try {
      const { data, error } = await admin.from(table).select("*");
      if (!error && data) {
        backupData[table] = data;
        console.log(`  ✓ Exported ${table}: ${data.length} records`);
      } else {
        backupData[table] = [];
        console.log(`  - Table ${table}: not found or empty (${error?.message || "empty"})`);
      }
    } catch (e: any) {
      backupData[table] = [];
      console.log(`  - Table ${table}: export skipped (${e?.message})`);
    }
  }

  // Export auth.users
  try {
    const { data: authData } = await admin.auth.admin.listUsers();
    backupData["auth_users"] = authData ? authData.users : [];
    console.log(`  ✓ Exported auth.users: ${backupData["auth_users"].length} records`);
  } catch (e) {
    backupData["auth_users"] = [];
  }

  const scratchDir = path.resolve(process.cwd(), "scratch");
  if (!fs.existsSync(scratchDir)) {
    fs.mkdirSync(scratchDir, { recursive: true });
  }

  const backupFilePath = path.join(scratchDir, "db_backup_before_reset.json");
  fs.writeFileSync(backupFilePath, JSON.stringify(backupData, null, 2), "utf8");

  console.log(`\n✓ Backup successfully saved to: ${backupFilePath}`);
  console.log("==================================================================================");
}

exportFullDatabaseBackup().catch((err) => {
  console.error("Backup export failed:", err);
  process.exit(1);
});
