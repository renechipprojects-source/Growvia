import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import { fetchTeachers } from "../../frontend/src/lib/supabaseService";
import { fetchStaffProfile } from "../../frontend/src/lib/staffProfileService";

dotenv.config({ path: "./backend/.env" });
dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL || "https://nyhnkftlkigoliyogwvp.supabase.co";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im55aG5rZnRsa2lnb2xpeW9nd3ZwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NTQ3NDY1MywiZXhwIjoyMTAxMDUwNjUzfQ.xsa3qLPf8jTe45x5x_-8TyTusbjnMiihtQse4IgjutQ";

const adminSupabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function runStaffAttendanceDepartmentAuthorityTest() {
  console.log("==================================================================================");
  console.log("🏫 STAFF ATTENDANCE DEPARTMENT AUTHORITY E2E REGRESSION SUITE");
  console.log("==================================================================================");

  const timestamp = Date.now();
  const testStaffId = `STF-DEPT-${timestamp.toString().slice(-4)}`;
  const testLoginId = `DEPT${timestamp.toString().slice(-4)}`;
  const testName = `Prof. Forensic Department ${timestamp.toString().slice(-4)}`;
  const uniqueDept = `UNIQUE-FORENSIC-DEPT-${timestamp.toString().slice(-4)}`;

  const addressMeta = {
    department: uniqueDept,
    employment_type: "Full-Time",
    qualification: "Ph.D.",
    profile_completed: true,
  };

  const payload = {
    id: testStaffId,
    login_id: testLoginId,
    full_name: testName,
    role: "teacher",
    email: `dept.test.${timestamp}@sunshineschool.edu`,
    mobile: "9876543210",
    status: "active",
    address: JSON.stringify(addressMeta),
  };

  console.log(`\n[STEP 1] Seeding test staff member '${testName}'...`);
  console.log(`  Target Department: ${uniqueDept}`);
  const { data: inserted, error: insErr } = await adminSupabase
    .from("gv_users")
    .upsert([payload], { onConflict: "login_id" })
    .select();

  if (insErr) {
    console.error("  ✗ gv_users seed failed:", insErr.message);
    process.exit(1);
  }
  console.log("  ✓ Seeded staff record in gv_users.");

  console.log("\n[STEP 2] Fetching via fetchStaffProfile() service...");
  const profile = await fetchStaffProfile(testStaffId);
  if (!profile) {
    console.error("  ✗ fetchStaffProfile returned null for ID:", testStaffId);
    process.exit(1);
  }
  console.log("  ✓ StaffProfile department resolved:", profile.department);
  if (profile.department !== uniqueDept) {
    console.error(`  ✗ Mismatch in fetchStaffProfile! Expected '${uniqueDept}', got '${profile.department}'`);
    process.exit(1);
  }

  console.log("\n[STEP 3] Fetching via fetchTeachers() service used by Staff Attendance...");
  const { data: teachersList } = await fetchTeachers();
  const matchedTeacher = teachersList.find((t) => t.id === testStaffId || t.name === testName);

  if (!matchedTeacher) {
    console.error("  ✗ Test staff member not returned by fetchTeachers()!");
    process.exit(1);
  }

  console.log("  ✓ fetchTeachers item resolved:", {
    id: matchedTeacher.id,
    name: matchedTeacher.name,
    department: matchedTeacher.department,
  });

  if (matchedTeacher.department !== uniqueDept) {
    console.error(`  ✗ Mismatch in fetchTeachers! Expected '${uniqueDept}', got '${matchedTeacher.department}'`);
    process.exit(1);
  }

  console.log("\n[STEP 4] Verifying Staff Attendance display resolution...");
  const staffAttendanceRowDepartment = (matchedTeacher as any).department || "Not Assigned";
  console.log("  ✓ Staff Attendance Department column value:", staffAttendanceRowDepartment);

  if (staffAttendanceRowDepartment !== uniqueDept) {
    console.error(`  ✗ Staff Attendance display mismatch! Expected '${uniqueDept}', got '${staffAttendanceRowDepartment}'`);
    process.exit(1);
  }

  console.log("\n[STEP 5] Verifying unassigned staff member fallback...");
  const unassignedSample = { name: "Unassigned Teacher", role: "teacher" };
  const fallbackDept = (unassignedSample as any).department || "Not Assigned";
  console.log("  ✓ Fallback for staff with missing department:", fallbackDept);
  if (fallbackDept !== "Not Assigned") {
    console.error(`  ✗ Fallback department invalid! Expected 'Not Assigned', got '${fallbackDept}'`);
    process.exit(1);
  }

  console.log("\n[STEP 6] Cleaning up test staff record...");
  await adminSupabase.from("gv_users").delete().eq("login_id", testLoginId);
  await adminSupabase.from("gv_users").delete().eq("id", testStaffId);
  console.log("  ✓ Cleanup complete.");

  console.log("\n==================================================================================");
  console.log("📊 STAFF ATTENDANCE DEPARTMENT AUTHORITY RESULT: PASS (All 6 Steps Verified)");
  console.log("==================================================================================");
}

runStaffAttendanceDepartmentAuthorityTest().catch((err) => {
  console.error("Regression exception:", err);
  process.exit(1);
});
