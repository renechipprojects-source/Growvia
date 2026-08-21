import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config({ path: "./backend/.env" });
dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL || "https://nyhnkftlkigoliyogwvp.supabase.co";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im55aG5rZnRsa2lnb2xpeW9nd3ZwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NTQ3NDY1MywiZXhwIjoyMTAxMDUwNjUzfQ.xsa3qLPf8jTe45x5x_-8TyTusbjnMiihtQse4IgjutQ";

const adminSupabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function runSchoolBrandingPersistenceVerification() {
  console.log("=== STARTING PRINCIPAL SCHOOL BRANDING PERSISTENCE VERIFICATION ===");

  const timestamp = Date.now();
  const testSchoolName = `Sunshine Play School - Verification ${timestamp}`;
  const testAddress = "123 Academic Way, Playtown, India";
  const testPhone = "9876543210";
  const testMotto = "Excellence in Early Childhood Education";

  const payload = {
    id: "PRIMARY",
    school_name: testSchoolName,
    school_address: testAddress,
    phone: testPhone,
    motto: testMotto,
    updated_at: new Date().toISOString(),
  };

  // 1. Upsert into Supabase gv_system_settings
  console.log("[STEP 1] Upserting school branding record into gv_system_settings table...");
  const { data: upsertData, error: upsertErr } = await adminSupabase
    .from("gv_system_settings")
    .upsert([payload], { onConflict: "id" })
    .select();

  if (upsertErr) {
    throw new Error(`FAIL: Supabase upsert error: ${upsertErr.message}`);
  }
  console.log("  - Successfully upserted school branding record to Supabase.");

  // 2. Fetch record back from DB to simulate page reload/refresh
  console.log("\n[STEP 2] Simulating page refresh by fetching record from gv_system_settings...");
  const { data: fetchedData, error: fetchErr } = await adminSupabase
    .from("gv_system_settings")
    .select("*")
    .eq("id", "PRIMARY")
    .single();

  if (fetchErr || !fetchedData) {
    throw new Error(`FAIL: Supabase fetch error: ${fetchErr?.message || "Record not found"}`);
  }

  console.log(`  - Retrieved School Name: "${fetchedData.school_name}"`);
  console.log(`  - Retrieved School Address: "${fetchedData.school_address}"`);
  console.log(`  - Retrieved Phone: "${fetchedData.phone}"`);
  console.log(`  - Retrieved Motto: "${fetchedData.motto}"`);

  if (fetchedData.school_name !== testSchoolName) {
    throw new Error("FAIL: Retained school name does not match saved payload!");
  }

  console.log("\n=== PRINCIPAL SCHOOL BRANDING BACKEND PERSISTENCE VERIFIED SUCCESSFULLY ===");
}

runSchoolBrandingPersistenceVerification().catch((err) => {
  console.error(err);
  process.exit(1);
});
