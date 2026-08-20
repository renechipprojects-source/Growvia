import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import * as fs from "fs";
import * as path from "path";

dotenv.config({ path: "./backend/.env" });
dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL || "https://nyhnkftlkigoliyogwvp.supabase.co";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im55aG5rZnRsa2lnb2xpeW9nd3ZwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NTQ3NDY1MywiZXhwIjoyMTAxMDUwNjUzfQ.xsa3qLPf8jTe45x5x_-8TyTusbjnMiihtQse4IgjutQ";

const adminSupabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function runAdminSchoolBrandingLifecycleSuite() {
  console.log("=== STARTING ADMIN SCHOOL BRANDING REGRESSION & PERSISTENCE SUITE ===");

  const srcDir = path.resolve(process.cwd(), "frontend/src");

  // 1. Verify "Academic Session" is NOT in Admin or Office sidebar brand headers
  console.log("\n[STEP 1] Verifying sidebar headers do not contain 'Academic Session' label...");
  const adminSidebar = fs.readFileSync(path.join(srcDir, "components/admin/app-sidebar.tsx"), "utf-8");
  if (adminSidebar.includes("Academic Session {settings.school.academicYear}")) {
    throw new Error("FAIL: Admin sidebar brand header still contains 'Academic Session'.");
  }
  if (!adminSidebar.includes("Admin Portal")) {
    throw new Error("FAIL: Admin sidebar brand header should specify 'Admin Portal'.");
  }
  console.log("  [PASS] Admin sidebar brand header cleanly shows 'Admin Portal'.");

  const officeSidebar = fs.readFileSync(path.join(srcDir, "components/office/app-sidebar.tsx"), "utf-8");
  if (officeSidebar.includes("Academic Session {settings.school.academicYear}")) {
    throw new Error("FAIL: Office sidebar brand header still contains 'Academic Session'.");
  }
  if (!officeSidebar.includes("Office Portal")) {
    throw new Error("FAIL: Office sidebar brand header should specify 'Office Portal'.");
  }
  console.log("  [PASS] Office sidebar brand header cleanly shows 'Office Portal'.");

  // 2. Test saving and round-tripping branding settings to Supabase
  console.log("\n[STEP 2] Testing branding configuration save & persistence to Supabase (gv_system_settings)...");

  const timestamp = Date.now();
  const testSchoolName = `Sunshine Play Academy ${timestamp.toString().slice(-4)}`;
  const testTagline = "Where Little Explorers Shine Bright";
  const testAddress = "456 Sunshine Boulevard, Play City, India";
  const testPhone = "+91 98765 12345";
  const testEmail = `info.${timestamp.toString().slice(-4)}@sunshineacademy.edu`;
  const testHours = "8:30 AM - 3:30 PM (Mon - Fri)";
  const testLoginTitle = "Sunshine Play Academy Portal";
  const testLoginSubtitle = "Institutional Management Suite";
  const testLogoUrl = `https://nyhnkftlkigoliyogwvp.supabase.co/storage/v1/object/public/system-assets/system_branding/logo_test_${timestamp}.png`;

  const updatedSettings = {
    id: "PRIMARY",
    school_name: testSchoolName,
    school_logo_url: testLogoUrl,
    header_logo: testLogoUrl,
    sidebar_logo: testLogoUrl,
    sidebar_logo_url: testLogoUrl,
    sidebar_school_name: testSchoolName,
    login_logo: testLogoUrl,
    school_address: testAddress,
    phone: testPhone,
    email: testEmail,
    motto: testTagline,
    office_hours: testHours,
    login_title: testLoginTitle,
    login_subtitle: testLoginSubtitle,
    content: JSON.stringify({
      branding: {
        schoolName: testSchoolName,
        shortName: "SPA",
        tagline: testTagline,
        schoolLogoUrl: testLogoUrl,
      },
      school: {
        schoolName: testSchoolName,
        address: testAddress,
        phone: testPhone,
        email: testEmail,
        motto: testTagline,
        officeHours: testHours,
        website: "https://sunshineacademy.edu",
      },
      loginPage: {
        title: testLoginTitle,
        subtitle: testLoginSubtitle,
        badgeText: "GROWVIA v2.4",
        welcomeMessage: "Welcome to Sunshine Play Academy",
      },
    }),
    updated_at: new Date().toISOString(),
  };

  const { data: upsertData, error: upsertErr } = await adminSupabase
    .from("gv_system_settings")
    .upsert([updatedSettings], { onConflict: "id" })
    .select();

  if (upsertErr) {
    throw new Error(`FAIL: Saving settings to gv_system_settings failed: ${upsertErr.message}`);
  }
  console.log("  [PASS] Branding settings successfully saved to Supabase (id: PRIMARY).");

  // 3. Fetch from Supabase and verify field integrity
  console.log("\n[STEP 3] Fetching saved settings from Supabase to verify persistence...");
  const { data: fetchedSettings, error: fetchErr } = await adminSupabase
    .from("gv_system_settings")
    .select("*")
    .eq("id", "PRIMARY")
    .single();

  if (fetchErr || !fetchedSettings) {
    throw new Error(`FAIL: Fetching settings failed: ${fetchErr?.message}`);
  }

  if (fetchedSettings.school_name !== testSchoolName) {
    throw new Error(`FAIL: School Name mismatch. Expected ${testSchoolName}, got ${fetchedSettings.school_name}`);
  }
  if (fetchedSettings.school_logo_url !== testLogoUrl) {
    throw new Error(`FAIL: Logo URL mismatch. Expected ${testLogoUrl}, got ${fetchedSettings.school_logo_url}`);
  }
  if (fetchedSettings.motto !== testTagline) {
    throw new Error(`FAIL: Motto mismatch. Expected ${testTagline}, got ${fetchedSettings.motto}`);
  }
  if (fetchedSettings.login_title !== testLoginTitle) {
    throw new Error(`FAIL: Login Title mismatch. Expected ${testLoginTitle}, got ${fetchedSettings.login_title}`);
  }

  console.log("  [PASS] Authoritative Supabase fields verified:", {
    school_name: fetchedSettings.school_name,
    school_logo_url: fetchedSettings.school_logo_url,
    motto: fetchedSettings.motto,
    login_title: fetchedSettings.login_title,
  });

  console.log("\n=== ALL ADMIN SCHOOL BRANDING TESTS PASSED ===");
}

runAdminSchoolBrandingLifecycleSuite().catch((err) => {
  console.error(err);
  process.exit(1);
});
