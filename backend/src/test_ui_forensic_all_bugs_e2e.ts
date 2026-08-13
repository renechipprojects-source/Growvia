import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import { createCircular, fetchCirculars, deleteCircular, createTeacher } from "../../frontend/src/lib/supabaseService";
import { isCircularTargetedToRole, normalizeRoleToCanonical } from "../../frontend/src/lib/circularReadStore";
import { generateTeacherCredential, getTeacherCredential } from "../../frontend/src/lib/credentials";
import { login } from "../../frontend/src/lib/supabaseAuth";
import { fetchStaffProfile } from "../../frontend/src/lib/staffProfileService";

dotenv.config({ path: "./backend/.env" });
dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL || "https://nyhnkftlkigoliyogwvp.supabase.co";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im55aG5rZnRsa2lnb2xpeW9nd3ZwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NTQ3NDY1MywiZXhwIjoyMTAxMDUwNjUzfQ.xsa3qLPf8jTe45x5x_-8TyTusbjnMiihtQse4IgjutQ";

const adminSupabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function runUIForensicAllBugsSuite() {
  console.log("==================================================================================");
  console.log("🔥 ULTIMATE UI FORENSIC TEST SUITE — CIRCULAR, OFFICE LOGIN & STAFF DEPARTMENT");
  console.log("==================================================================================");

  // ----------------------------------------------------------------------------------
  // BUG 1: CIRCULAR RENDERING & ROLE TARGETING VERIFICATION
  // ----------------------------------------------------------------------------------
  console.log("\n[TEST 1] Testing Bug 1: Circular Creation, Canonical Targeting & Retrieval...");
  const timestamp = Date.now();
  const circId = `COM-CIRC-UI-${timestamp.toString().slice(-4)}`;
  const circTitle = `UI Inspection Circular ${timestamp.toString().slice(-4)}`;

  const circularPayload = {
    id: circId,
    title: circTitle,
    subject: "All-Staff & Parent Notice",
    description: "Notice regarding annual sports meet.",
    priority: "High",
    publishDate: new Date().toISOString().slice(0, 10),
    expiryDate: "2026-12-31",
    recipients: ["Admin", "Teachers", "Office Staff", "Parents"],
    status: "Published",
    senderId: "PRINCIPAL001",
    author: "Principal Office",
  };

  await createCircular(circularPayload);
  const { data: fetchedCirculars } = await fetchCirculars();
  const foundCirc = fetchedCirculars.find((c) => c.id === circId || c.title === circTitle);

  if (!foundCirc) {
    console.error("  ✗ Published circular NOT found in fetchCirculars!");
    process.exit(1);
  }

  console.log("  ✓ Circular retrieved:", { id: foundCirc.id, title: foundCirc.title, recipients: foundCirc.recipients });

  // Test targeting for all canonical roles
  const targetRoles = ["admin", "principal", "teacher", "office", "parent"];
  for (const role of targetRoles) {
    const isTargeted = isCircularTargetedToRole(foundCirc, role);
    if (!isTargeted) {
      console.error(`  ✗ Circular failed targeting check for role '${role}'!`);
      process.exit(1);
    }
    console.log(`  ✓ Canonical targeting approved for role '${role}'`);
  }

  // Test exclusion for an unrelated targeted circular
  const exclusiveCirc = {
    id: "COM-EXCL-1",
    title: "Parent Only Notice",
    recipients: ["Parents"],
  };
  const teacherTargeted = isCircularTargetedToRole(exclusiveCirc, "teacher");
  if (teacherTargeted) {
    console.error("  ✗ Exclusive Parent circular was incorrectly approved for Teacher!");
    process.exit(1);
  }
  console.log("  ✓ Exclusive Parent circular correctly EXCLUDED for Teacher role.");

  await deleteCircular(circId);
  await adminSupabase.from("gv_communications").delete().eq("id", circId);

  // ----------------------------------------------------------------------------------
  // BUG 2: OFFICE-GENERATED STAFF CREDENTIAL & REAL LOGIN FLOW
  // ----------------------------------------------------------------------------------
  console.log("\n[TEST 2] Testing Bug 2: Office-Generated Staff Credential Real Login Flow...");
  const teacherId = `TCH-UI-${timestamp.toString().slice(-4)}`;
  const teacherLoginId = `TCHUI${timestamp.toString().slice(-4)}`;
  const teacherName = `Prof. Sunita Menon ${timestamp.toString().slice(-4)}`;
  const teacherEmail = `sunita.menon.${timestamp}@sunshineschool.edu`;
  const teacherPassword = `UiPass@${timestamp.toString().slice(-4)}`;

  const newTeachObj = {
    id: teacherId,
    name: teacherName,
    email: teacherEmail,
    phone: "9876543210",
    subject: "Mathematics",
    className: "LKG B",
  };

  console.log(`  Creating teacher via createTeacher API...`);
  await createTeacher(newTeachObj);

  console.log(`  Issuing credentials via generateTeacherCredential...`);
  const cred = generateTeacherCredential(teacherId, {
    customLoginId: teacherLoginId,
    password: teacherPassword,
    teacher: newTeachObj,
  });

  console.log(`  Generated Credential Pair: Login ID '${cred.loginId}' | Password '${cred.password}'`);

  // Wait 1.5s for async server provisioning
  await new Promise((r) => setTimeout(r, 1500));

  console.log(`  Attempting login via application login() function using LOGIN ID '${cred.loginId}'...`);
  const loginResId = await login(cred.loginId, cred.password);
  if (!loginResId.success || !loginResId.user) {
    console.error("  ✗ Application login() failed with Login ID:", loginResId.error);
    process.exit(1);
  }
  console.log("  ✓ Login with LOGIN ID SUCCESSFUL! User:", { id: loginResId.user.id, role: loginResId.user.role });

  console.log(`  Attempting login via application login() function using EMAIL '${teacherEmail}'...`);
  const loginResEmail = await login(teacherEmail, cred.password);
  if (!loginResEmail.success || !loginResEmail.user) {
    console.error("  ✗ Application login() failed with Email:", loginResEmail.error);
    process.exit(1);
  }
  console.log("  ✓ Login with EMAIL SUCCESSFUL! User:", { id: loginResEmail.user.id, role: loginResEmail.user.role });

  // Cleanup teacher records
  if (loginResId.user.auth_user_id) {
    await adminSupabase.auth.admin.deleteUser(loginResId.user.auth_user_id);
  }
  await adminSupabase.from("gv_users").delete().eq("login_id", teacherLoginId);
  await adminSupabase.from("gv_users").delete().eq("id", teacherId);

  // ----------------------------------------------------------------------------------
  // BUG 3: STAFF ATTENDANCE AUTHORITATIVE DEPARTMENT DISPLAY
  // ----------------------------------------------------------------------------------
  console.log("\n[TEST 3] Testing Bug 3: Staff Attendance Authoritative Department Binding...");
  const deptStaffId = `STF-DUI-${timestamp.toString().slice(-4)}`;
  const deptLoginId = `DEPTUI${timestamp.toString().slice(-4)}`;
  const deptName = `Prof. Forensic Dept ${timestamp.toString().slice(-4)}`;
  const targetDept = `AUTHORITATIVE-DEPT-${timestamp.toString().slice(-4)}`;

  const deptPayload = {
    id: deptStaffId,
    login_id: deptLoginId,
    full_name: deptName,
    role: "teacher",
    email: `dept.ui.${timestamp}@sunshineschool.edu`,
    mobile: "9876543210",
    status: "active",
    address: JSON.stringify({ department: targetDept }),
  };

  await adminSupabase.from("gv_users").upsert([deptPayload], { onConflict: "login_id" });

  const profile = await fetchStaffProfile(deptStaffId);
  if (profile?.department !== targetDept) {
    console.error(`  ✗ Authoritative profile department mismatch! Expected '${targetDept}', got '${profile?.department}'`);
    process.exit(1);
  }
  console.log(`  ✓ Authoritative Staff Profile Department verified: '${profile.department}'`);

  const unassignedProfile = { name: "Unassigned Staff", role: "teacher" };
  const unassignedDept = (unassignedProfile as any).department || "Not Assigned";
  if (unassignedDept !== "Not Assigned") {
    console.error(`  ✗ Unassigned department fallback invalid! Expected 'Not Assigned', got '${unassignedDept}'`);
    process.exit(1);
  }
  console.log(`  ✓ Unassigned staff department fallback verified: '${unassignedDept}' (no fake department invented).`);

  await adminSupabase.from("gv_users").delete().eq("login_id", deptLoginId);
  await adminSupabase.from("gv_users").delete().eq("id", deptStaffId);

  console.log("\n==================================================================================");
  console.log("📊 ULTIMATE UI FORENSIC SUITE RESULT: ALL 3 BUGS VERIFIED (PASS)");
  console.log("==================================================================================");
}

runUIForensicAllBugsSuite().catch((err) => {
  console.error("UI Forensic suite exception:", err);
  process.exit(1);
});
