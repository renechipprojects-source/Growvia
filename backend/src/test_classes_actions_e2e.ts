import {
  getStoredMasterClasses,
  addMasterClass,
  updateMasterClass,
  deleteMasterClass,
  fetchMasterClassesFromSupabase,
} from "../../frontend/src/lib/masterClassesStore";

async function runClassesActionsVerification() {
  console.log("=== VERIFYING ALL CLASS ACTIONS FOR /admin/classes & /principal/classes ===");

  // 1. Initial State Fetch
  console.log("[TEST 1] Fetching stored master classes...");
  const initialClasses = await fetchMasterClassesFromSupabase();
  console.log(`  - Currently ${initialClasses.length} master classes in DB.`);

  // 2. Add New Class (including custom numeric & text sections)
  console.log("\n[TEST 2] Testing Add Master Class (custom section)...");
  const testClassName = "Class 5";
  const testSection = "101-Custom";
  const newClass = addMasterClass({
    name: testClassName,
    section: testSection,
    classTeacher: "Test Teacher",
    room: "Room 505",
    capacity: 35,
  });

  if (!newClass || !newClass.id) {
    throw new Error("FAIL: Master class creation returned invalid object!");
  }
  console.log(`  - Successfully created class: "${newClass.fullName}" (ID: ${newClass.id})`);

  // 3. Edit Class
  console.log("\n[TEST 3] Testing Edit Master Class...");
  const updatedClass = updateMasterClass(newClass.id, {
    name: "Class 5",
    section: "101-Custom-Updated",
    classTeacher: "Updated Teacher",
    room: "Room 506",
    capacity: 40,
  });

  if (!updatedClass || updatedClass.section !== "101-Custom-Updated") {
    throw new Error("FAIL: Master class update failed!");
  }
  console.log(`  - Successfully updated class: "${updatedClass.fullName}"`);

  // 4. Delete Class
  console.log("\n[TEST 4] Testing Delete Master Class...");
  deleteMasterClass(newClass.id);
  const postDeleteClasses = getStoredMasterClasses();
  const exists = postDeleteClasses.some((c) => c.id === newClass.id);
  if (exists) {
    throw new Error("FAIL: Master class delete failed!");
  }
  console.log("  - Successfully deleted test class.");

  console.log("\n=== ALL CLASS ACTIONS VERIFIED SUCCESSFULLY ===");
}

runClassesActionsVerification().catch((err) => {
  console.error(err);
  process.exit(1);
});
