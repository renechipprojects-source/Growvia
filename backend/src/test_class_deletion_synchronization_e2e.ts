import {
  fetchMasterClassesFromSupabase,
  addMasterClass,
  deleteMasterClass,
  getStoredMasterClasses,
} from "../../frontend/src/lib/masterClassesStore";

async function runClassDeletionSynchronizationVerification() {
  console.log("=== STARTING CLASS DELETION SYNCHRONIZATION E2E VERIFICATION ===");

  // 1. Fetch initial master classes from Supabase
  console.log("[STEP 1] Fetching initial master classes from Supabase...");
  const initialList = await fetchMasterClassesFromSupabase();
  console.log(`  - Initial Master Classes Count: ${initialList.length}`);

  // 2. Add a test class to be deleted
  const testClassName = `TestClass-${Date.now()}`;
  const testSection = "Z99";
  console.log(`\n[STEP 2] Creating temporary test class: "${testClassName} Section ${testSection}"...`);

  const createdClass = addMasterClass({
    name: testClassName,
    section: testSection,
    room: "Room 999",
    capacity: 20,
    classTeacher: "Test Teacher",
  });

  console.log(`  - Created Class ID: ${createdClass.id}`);

  // Wait 1 second for Supabase async persistence
  await new Promise((resolve) => setTimeout(resolve, 1000));

  // 3. Verify class exists in Supabase
  const listAfterAdd = await fetchMasterClassesFromSupabase();
  const foundInSupabase = listAfterAdd.some((c) => c.id === createdClass.id || c.name === testClassName);
  console.log(`  - Verified Class present in Supabase? ${foundInSupabase}`);
  if (!foundInSupabase) {
    throw new Error("FAIL: Created test class was not found in Supabase gv_requests!");
  }
  console.log("  [PASS] Class creation and Supabase persistence verified.");

  // 4. Delete the class
  console.log(`\n[STEP 3] Deleting test class ID "${createdClass.id}"...`);
  await deleteMasterClass(createdClass.id);

  // Wait 1 second for Supabase async deletion
  await new Promise((resolve) => setTimeout(resolve, 1000));

  // 5. Verify deletion in local memory and localStorage
  const localListAfterDelete = getStoredMasterClasses();
  const foundInLocal = localListAfterDelete.some((c) => c.id === createdClass.id || c.name === testClassName);
  console.log(`  - Class present in local cache after deletion? ${foundInLocal}`);
  if (foundInLocal) {
    throw new Error("FAIL: Deleted class still present in local cache!");
  }
  console.log("  [PASS] Local memory and localStorage deletion verified.");

  // 6. Simulate Browser Refresh & Re-fetch from Supabase
  console.log("\n[STEP 4] Simulating browser refresh & fetching directly from Supabase...");
  const listAfterRefresh = await fetchMasterClassesFromSupabase();
  const foundAfterRefresh = listAfterRefresh.some((c) => c.id === createdClass.id || c.name === testClassName);

  console.log(`  - Deleted Class reappears after refresh? ${foundAfterRefresh}`);
  if (foundAfterRefresh) {
    throw new Error("FAIL: Deleted class REAPPEARED after refresh! Database synchronization failed.");
  }
  console.log("  [PASS] Single Source of Truth verified — deleted class NEVER reappears after refresh!");

  console.log("\n=== ALL CLASS DELETION SYNCHRONIZATION TESTS PASSED SUCCESSFULLY ===");
}

runClassDeletionSynchronizationVerification().catch((err) => {
  console.error(err);
  process.exit(1);
});
