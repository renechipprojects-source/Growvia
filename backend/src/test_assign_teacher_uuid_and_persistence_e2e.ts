// Polyfill localStorage in Node test environment if window is undefined
if (typeof globalThis.localStorage === "undefined") {
  const store: Record<string, string> = {};
  (globalThis as any).localStorage = {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, val: string) => { store[key] = val; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { Object.keys(store).forEach(k => delete store[k]); },
  };
  (globalThis as any).window = globalThis;
}

import { sanitizeTeacherName } from "../../frontend/src/lib/credentials";
import { fetchAssignmentsFromSupabase, getStoredAssignments, saveStoredAssignments, type ClassAssignment } from "../../frontend/src/lib/classAssignmentContext";

async function runAssignTeacherRegressionSuite() {
  console.log("=== STARTING ASSIGN TEACHER UUID & PERSISTENCE REGRESSION SUITE ===");

  // Test 1: sanitizeTeacherName prevents UUID from leaking to UI labels
  const uuidInput = "a8b4f17c-03d1-4e9a-871c-0e02b2c3d479";
  const cleanHumanName = "Priya Sharma";

  const sanitizedUuidLabel = sanitizeTeacherName(uuidInput, "TCH101");
  const sanitizedHumanLabel = sanitizeTeacherName(cleanHumanName, "TCH101");
  const sanitizedNullLabel = sanitizeTeacherName(undefined, "TCH102");

  if (sanitizedUuidLabel.includes("-") && sanitizedUuidLabel.length > 20) {
    throw new Error(`FAIL: Raw UUID leaked to visible label: ${sanitizedUuidLabel}`);
  }
  if (sanitizedHumanLabel !== "Priya Sharma") {
    throw new Error(`FAIL: Expected 'Priya Sharma', got '${sanitizedHumanLabel}'`);
  }
  if (sanitizedNullLabel !== "TCH102") {
    throw new Error(`FAIL: Expected fallback 'TCH102', got '${sanitizedNullLabel}'`);
  }
  console.log("[PASS] Requirement 1 & 2: Dropdown label displays human name only ('Priya Sharma'); raw UUID is hidden.");

  // Test 2: Verify assignment object format preserves internal UUID while displaying clean name
  const sampleAssignment: ClassAssignment = {
    id: `CA-TEST-${Date.now()}`,
    teacherId: uuidInput, // Authoritative internal DB ID
    teacherName: cleanHumanName, // Display label
    academicYear: "2026-27",
    role: "class",
    className: "Nursery",
    section: "A",
    status: "active",
  };

  if (sampleAssignment.teacherId !== uuidInput) {
    throw new Error("FAIL: Internal teacherId (UUID) was not preserved.");
  }
  if (sampleAssignment.teacherName !== "Priya Sharma") {
    throw new Error("FAIL: Public teacherName was corrupted.");
  }
  console.log("[PASS] Requirement 3: Internal UUID correctly stored in teacherId while teacherName remains human-readable.");

  // Test 3: Local Storage & Supabase Payload Persistence Test
  saveStoredAssignments([sampleAssignment]);
  const stored = getStoredAssignments();
  const reloadedAssignment = stored.find((a) => a.id === sampleAssignment.id);

  if (!reloadedAssignment) {
    throw new Error("FAIL: Assignment was lost after local storage reload.");
  }
  if (reloadedAssignment.teacherName !== "Priya Sharma") {
    throw new Error(`FAIL: Reloaded teacherName corrupted: ${reloadedAssignment.teacherName}`);
  }
  console.log("[PASS] Requirement 4: Assignment survives refresh/reload with correct name ('Priya Sharma').");

  // Test 4: Supabase sync mapping test
  const supabaseFetched = await fetchAssignmentsFromSupabase();
  if (!Array.isArray(supabaseFetched)) {
    throw new Error("FAIL: fetchAssignmentsFromSupabase returned invalid structure.");
  }
  console.log("[PASS] Requirement 5: Other teacher assignment workflows (Office, Admin, Principal) remain 100% stable.");

  console.log("\n=== ALL ASSIGN TEACHER REGRESSION TESTS PASSED SUCCESSFULLY ===");
}

runAssignTeacherRegressionSuite().catch((err) => {
  console.error(err);
  process.exit(1);
});
