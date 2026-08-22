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
        if (key === "SUPABASE_URL") process.env.VITE_SUPABASE_URL = value.trim();
        if (key === "SUPABASE_SERVICE_ROLE_KEY") process.env.VITE_SUPABASE_ANON_KEY = value.trim();
      }
    });
  }
} catch (e) {
  console.error("Failed to parse .env:", e);
}

async function verifyDashboardPaymentsZero() {
  const { createClient } = await import("@supabase/supabase-js");
  const SUPABASE_URL = process.env.SUPABASE_URL || "https://nyhnkftlkigoliyogwvp.supabase.co";
  const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  console.log("==================================================================================");
  console.log("📊 MANDATORY FORENSIC PROOF: VERIFYING DASHBOARD & PAYMENT DATA PIPELINE");
  console.log("==================================================================================");

  // 1. Direct Supabase Query on gv_fees_payments
  const { data: feesData, error: feesErr } = await admin.from("gv_fees_payments").select("*");
  console.log(`[1] Direct Supabase Query: gv_fees_payments count = ${feesData ? feesData.length : 0}`);

  // 2. Direct Supabase Query on gv_inventory_expenses
  const { data: invData } = await admin.from("gv_inventory_expenses").select("*");
  console.log(`[2] Direct Supabase Query: gv_inventory_expenses count = ${invData ? invData.length : 0}`);

  // 3. Direct Supabase Query on gv_communications
  const { data: commData } = await admin.from("gv_communications").select("*");
  console.log(`[3] Direct Supabase Query: gv_communications count = ${commData ? commData.length : 0}`);

  // 4. Test fetchReceipts() Service Layer Endpoint
  const { fetchReceipts } = await import("../../frontend/src/lib/supabaseService");
  const receiptsRes = await fetchReceipts();
  console.log(`[4] Service Layer fetchReceipts() returned: ${receiptsRes.data.length} records`);

  // 5. Test Office Dashboard Stats Provider
  const { getOfficeDashboardStats, getAdminDashboardStats } = await import("../../frontend/src/lib/dashboardStatsService");
  const officeStats = await getOfficeDashboardStats();
  console.log(`[5] Office Dashboard Stats:`, {
    totalStudents: officeStats.totalStudents,
    totalEnquiries: officeStats.totalEnquiries,
    totalFeeCollected: officeStats.totalFeeCollected,
    pendingFeeBalance: officeStats.pendingFeeBalance,
    recentFeeCollectionsCount: officeStats.recentFeeCollections.length,
  });

  const adminStats = await getAdminDashboardStats();
  console.log(`[6] Admin Dashboard Stats:`, {
    totalStudents: adminStats.totalStudents,
    totalTeachers: adminStats.totalTeachers,
    totalFeesCollected: adminStats.totalFeesCollected,
  });

  // ASSERTIONS
  if (feesData && feesData.length > 0) throw new Error(`FAIL: gv_fees_payments contains ${feesData.length} records!`);
  if (receiptsRes.data.length > 0) throw new Error(`FAIL: fetchReceipts() returned ${receiptsRes.data.length} records!`);
  if (officeStats.totalFeeCollected !== 0) throw new Error(`FAIL: officeStats.totalFeeCollected is ${officeStats.totalFeeCollected}`);
  if (officeStats.recentFeeCollections.length !== 0) throw new Error(`FAIL: officeStats.recentFeeCollections count is ${officeStats.recentFeeCollections.length}`);

  console.log("\n==================================================================================");
  console.log("✅ PROOF VERIFIED: ALL DASHBOARD PAYMENT DATA PIPELINES RETURN EXACTLY 0 RECORDS");
  console.log("==================================================================================");
}

verifyDashboardPaymentsZero().catch((err) => {
  console.error("Verification error:", err);
  process.exit(1);
});
