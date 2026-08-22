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

async function inspectGvInventoryExpenses() {
  const { createClient } = await import("@supabase/supabase-js");
  const SUPABASE_URL = process.env.SUPABASE_URL || "https://nyhnkftlkigoliyogwvp.supabase.co";
  const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  console.log("=== INSPECTING gv_inventory_expenses TABLE ===");
  const { data, error } = await admin.from("gv_inventory_expenses").select("*");
  if (error) {
    console.error("Error fetching gv_inventory_expenses:", error);
    return;
  }

  console.log(`Total gv_inventory_expenses records: ${data ? data.length : 0}`);

  const recordTypes: Record<string, number> = {};
  (data || []).forEach((row: any) => {
    const type = row.record_type || "UNKNOWN";
    recordTypes[type] = (recordTypes[type] || 0) + 1;
  });

  console.log("\n--- gv_inventory_expenses Breakdown by record_type ---");
  console.log(recordTypes);
}

inspectGvInventoryExpenses().catch((err) => console.error("Inspection error:", err));
