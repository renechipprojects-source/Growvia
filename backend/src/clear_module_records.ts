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

async function clearModuleRecords() {
  const { createClient } = await import("@supabase/supabase-js");
  const SUPABASE_URL = process.env.SUPABASE_URL || "https://nyhnkftlkigoliyogwvp.supabase.co";
  const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  console.log("==================================================================================");
  console.log("🧹 REMOVING DATA RECORDS FOR: Expenses, Circulars, Recent Payments, Transport, Inventory, Messages");
  console.log("==================================================================================");

  const targetRequestTypes = [
    "expense",
    "expenses",
    "circular",
    "circulars",
    "fee_payment",
    "fee_payments",
    "payment",
    "receipt",
    "receipts",
    "transport",
    "inventory",
    "inventory_transaction",
    "inventory_transactions",
    "stock",
    "message",
    "messages",
    "chat_message",
    "communication",
  ];

  for (const t of targetRequestTypes) {
    const { error } = await admin.from("gv_requests").delete().eq("request_type", t);
    if (!error) console.log(`  ✓ Cleared gv_requests request_type '${t}'`);
  }

  // Check gv_requests remaining
  const { data: remainingRequests } = await admin.from("gv_requests").select("request_type");
  const typeCounts: Record<string, number> = {};
  (remainingRequests || []).forEach((r: any) => {
    const type = r.request_type || "UNKNOWN";
    typeCounts[type] = (typeCounts[type] || 0) + 1;
  });

  console.log("\n--- Remaining gv_requests Breakdown ---");
  console.log(typeCounts);

  console.log("==================================================================================");
}

clearModuleRecords().catch((err) => {
  console.error("Clear module records error:", err);
  process.exit(1);
});
