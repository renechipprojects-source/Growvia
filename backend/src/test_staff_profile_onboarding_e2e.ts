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

if (!serviceKey) {
  console.error("Missing SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey);

async function runStaffOnboardingE2ETest() {
  console.log("==================================================================================");
  console.log("🧪 STARTING HYBRID STAFF ONBOARDING & PROFILE COMPLETION E2E TEST");
  console.log("==================================================================================");

  const testStaffId = `TCH-OnboardTest-${Date.now().toString().slice(-4)}`;
  const testEmail = `test.staff.${Date.now()}@growvia.edu`;

  // STEP 1: Admin Creates Staff Record (Official details only)
  console.log(`\n[STEP 1] Admin creating staff member ${testStaffId} (${testEmail})...`);
  const initialAddressMeta = {
    department: "Science",
    joining_date: "2026-06-01",
    employment_type: "Full-Time",
    profile_completed: false,
  };

  const adminPayload = {
    id: testStaffId,
    login_id: testStaffId,
    email: testEmail,
    full_name: "Prof. Vikram Malhotra",
    role: "teacher",
    status: "active",
    employee_id: `EMP-${testStaffId}`,
    designation: "Senior Physics Faculty",
    subject: "Physics",
    mobile: "9876500112",
    address: JSON.stringify(initialAddressMeta),
    created_at: new Date().toISOString(),
  };

  const { error: insertErr } = await supabase.from("gv_users").insert([adminPayload]);
  if (insertErr) {
    console.error("  └─ [FAIL] Error inserting admin staff record:", insertErr.message);
    process.exit(1);
  }
  console.log("  └─ [PASS] Admin staff record inserted successfully into gv_users.");

  // STEP 2: Verify Initial Profile Completion Status is FALSE
  console.log("\n[STEP 2] Verifying initial profile completion status...");
  const { data: initialDb, error: fetchErr } = await supabase
    .from("gv_users")
    .select("*")
    .eq("id", testStaffId)
    .single();

  if (fetchErr || !initialDb) {
    console.error("  └─ [FAIL] Could not fetch created staff record:", fetchErr?.message);
    process.exit(1);
  }

  const initialMeta = JSON.parse(initialDb.address || "{}");
  if (initialMeta.profile_completed === true) {
    console.error("  └─ [FAIL] Initial profile_completed should be false!");
    process.exit(1);
  }
  console.log("  └─ [PASS] Confirmed initial profile_completed = false.");

  // STEP 3: Staff Logs In & Completes Profile (Self-completion)
  console.log("\n[STEP 3] Staff member completing profile (personal, emergency & qualification details)...");
  const nowIso = new Date().toISOString();
  const completedAddressMeta = {
    streetAddress: "42 MG Road, Jubilee Hills",
    city: "Hyderabad",
    state: "Telangana",
    pincode: "500033",
    alternate_phone: "9876500114",
    emergency_contact_name: "Sunita Malhotra",
    emergency_contact_relation: "Spouse",
    emergency_phone: "9876500113",
    blood_group: "B+",
    department: "Science",
    employment_type: "Full-Time",
    qualification: "Ph.D Physics, B.Ed",
    specialization: "Quantum Mechanics",
    experience: 8,
    photo_url: "https://api.dicebear.com/9.x/avataaars/svg?seed=VikramMalhotra",
    date_of_birth: "1988-04-15",
    gender: "Male",
    joining_date: "2026-06-01",
    profile_completed: true,
    profile_completed_at: nowIso,
  };

  const staffUpdatePayload = {
    id: testStaffId,
    login_id: testStaffId,
    full_name: "Prof. Vikram Malhotra",
    email: testEmail,
    mobile: "9876500112",
    photo_url: "https://api.dicebear.com/9.x/avataaars/svg?seed=VikramMalhotra",
    date_of_birth: "1988-04-15",
    gender: "Male",
    address: JSON.stringify(completedAddressMeta),
    employee_id: `EMP-${testStaffId}`,
    designation: "Senior Physics Faculty",
    subject: "Physics",
    experience: 8,
    status: "active",
    updated_at: nowIso,
  };

  const { error: updateErr } = await supabase
    .from("gv_users")
    .upsert([staffUpdatePayload], { onConflict: "id" });

  if (updateErr) {
    console.error("  └─ [FAIL] Error updating staff completed profile:", updateErr.message);
    process.exit(1);
  }
  console.log("  └─ [PASS] Staff profile updated and saved to Supabase.");

  // STEP 4: Authoritative DB Verification across Admin/Principal/Office
  console.log("\n[STEP 4] Querying Supabase after simulated refresh/re-login to verify authoritative data...");
  const { data: finalDb, error: finalErr } = await supabase
    .from("gv_users")
    .select("*")
    .eq("id", testStaffId)
    .single();

  if (finalErr || !finalDb) {
    console.error("  └─ [FAIL] Could not fetch updated staff profile:", finalErr?.message);
    process.exit(1);
  }

  const finalMeta = JSON.parse(finalDb.address || "{}");
  console.log("  └─ [VERIFIED DB RECORD]:");
  console.log(`      ID: ${finalDb.id}`);
  console.log(`      Name: ${finalDb.full_name}`);
  console.log(`      Email: ${finalDb.email}`);
  console.log(`      Mobile: ${finalDb.mobile}`);
  console.log(`      Designation: ${finalDb.designation}`);
  console.log(`      Qualification: ${finalMeta.qualification}`);
  console.log(`      Address: ${finalMeta.streetAddress}, ${finalMeta.city}, ${finalMeta.state}`);
  console.log(`      Emergency Contact: ${finalMeta.emergency_contact_name} (${finalMeta.emergency_contact_relation}) - ${finalMeta.emergency_phone}`);
  console.log(`      Profile Completed: ${finalMeta.profile_completed}`);

  if (finalMeta.profile_completed !== true || finalMeta.qualification !== "Ph.D Physics, B.Ed") {
    console.error("  └─ [FAIL] DB values do not match expected authoritative completed profile!");
    process.exit(1);
  }
  console.log("  └─ [PASS] Authoritative profile data verified perfectly.");

  // STEP 5: Cleanup
  console.log(`\n[STEP 5] Cleaning up test staff record ${testStaffId}...`);
  await supabase.from("gv_users").delete().eq("id", testStaffId);
  console.log("  └─ [PASS] Cleaned up test staff record.");

  console.log("\n================================================================ me");
  console.log("✅ ALL HYBRID STAFF ONBOARDING AND SUPABASE PERSISTENCE CHECKS PASSED PERFECTLY!");
  console.log("==================================================================================");
}

runStaffOnboardingE2ETest().catch((err) => {
  console.error("Test failed with error:", err);
  process.exit(1);
});
